import { TRPCError } from "@trpc/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { router, protectedProcedure } from "../trpc";
import {
  deleteCompanySchema,
  deleteCompanyUserSchema,
  updateCompanySchema,
} from "@/lib/validations/company";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CANDIDATE_BUCKETS,
  removeCompanyFiles,
} from "@/server/candidateStorage";
import type { Context } from "../context";

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

/**
 * Créateur du cabinet : son premier utilisateur. Sans système de rôles, c'est lui
 * qui peut retirer un membre ou supprimer le cabinet. S'il supprime son compte,
 * le membre suivant le plus ancien le remplace.
 */
const getCompanyOwnerId = async (
  db: Context["db"],
  companyId: string
): Promise<string | null> => {
  const owner = await db.user.findFirst({
    where: { companyId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return owner?.id ?? null;
};

/** Supprime un compte Supabase Auth ; un compte déjà absent n'est pas une erreur. */
const deleteAuthUser = async (supabase: SupabaseClient, userId: string) => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  return error && error.status !== 404 ? error : null;
};

export const companyRouter = router({
  /**
   * Returns the current user's company (id, name) and its owner.
   * Used for header/nav display in dashboard and settings.
   */
  getMyCompany: protectedProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findFirst({
      where: { id: ctx.companyId },
      select: { id: true, name: true, siren: true },
    });
    if (!company) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const ownerId = await getCompanyOwnerId(ctx.db, ctx.companyId);
    return { ...company, ownerId };
  }),

  updateCompany: protectedProcedure
    .input(updateCompanySchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.company.update({
        where: { id: ctx.companyId },
        data: { name: input.name },
        select: { id: true, name: true, siren: true },
      });
    }),

  listUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { companyId: ctx.companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }),

  /**
   * Supprime un membre du cabinet (compte Supabase Auth puis ligne User).
   * Chacun peut supprimer son propre compte ; seul le créateur du cabinet peut
   * retirer un autre membre. Ses notes sont conservées sans auteur. Le dernier
   * membre ne peut pas supprimer son compte : il supprime le cabinet.
   */
  deleteUser: protectedProcedure
    .input(deleteCompanyUserSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findFirst({
        where: { id: input.userId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const isSelf = input.userId === ctx.user.id;
      const ownerId = await getCompanyOwnerId(ctx.db, ctx.companyId);
      if (!isSelf && ctx.user.id !== ownerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seul le créateur du cabinet peut retirer un membre.",
        });
      }

      const memberCount = await ctx.db.user.count({
        where: { companyId: ctx.companyId },
      });
      if (memberCount <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Vous êtes le dernier membre du cabinet : supprimez le cabinet depuis les paramètres.",
        });
      }

      // Compte Auth d'abord : en cas d'échec, rien n'est supprimé et l'action peut
      // être relancée ; l'inverse laisserait un compte capable de se connecter.
      const authError = await deleteAuthUser(createAdminClient(), input.userId);
      if (authError) {
        console.error("[company.deleteUser] Auth deletion failed:", authError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: GENERIC_ERROR_MESSAGE,
        });
      }

      await ctx.db.user.delete({ where: { id: input.userId } });
      return { success: true, isSelf };
    }),

  /**
   * Supprime le cabinet et toutes ses données (RGPD) : fichiers Storage, lignes
   * en base (cascade depuis Company) puis comptes Supabase Auth de ses membres.
   * Réservé au créateur du cabinet, confirmé par la saisie du nom du cabinet.
   */
  deleteCompany: protectedProcedure
    .input(deleteCompanySchema)
    .mutation(async ({ ctx, input }) => {
      const ownerId = await getCompanyOwnerId(ctx.db, ctx.companyId);
      if (ctx.user.id !== ownerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seul le créateur du cabinet peut le supprimer.",
        });
      }

      const company = await ctx.db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { name: true, users: { select: { id: true } } },
      });
      if (input.confirmName !== company.name.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le nom saisi ne correspond pas au nom du cabinet.",
        });
      }

      // Fichiers d'abord : en cas d'échec, le cabinet est conservé (pas d'orphelin).
      const supabase = createAdminClient();
      const storageErrors = (
        await Promise.all(
          CANDIDATE_BUCKETS.map((bucket) =>
            removeCompanyFiles(supabase, ctx.companyId, bucket)
          )
        )
      ).filter((error) => error !== null);
      if (storageErrors.length > 0) {
        console.error(
          "[company.deleteCompany] Storage removal failed:",
          storageErrors
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: GENERIC_ERROR_MESSAGE,
        });
      }

      await ctx.db.company.delete({ where: { id: ctx.companyId } });

      // Les données ont disparu : un compte Auth restant ne donne plus accès à rien,
      // mais conserve un email. Les échecs sont logués pour suppression manuelle.
      const authResults = await Promise.all(
        company.users.map(async (user) => ({
          userId: user.id,
          error: await deleteAuthUser(supabase, user.id),
        }))
      );
      const authFailures = authResults.filter(
        (result) => result.error !== null
      );
      if (authFailures.length > 0) {
        console.error(
          "[company.deleteCompany] Auth deletion failed, delete manually:",
          authFailures
        );
      }
      return { success: true };
    }),
});
