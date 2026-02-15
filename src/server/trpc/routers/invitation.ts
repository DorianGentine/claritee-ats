import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { createInvitationSchema } from "@/lib/validations/invitation";
import { emailSchema, passwordSchema } from "@/lib/validations/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const INVITATION_EXPIRED_MESSAGE =
  "Cette invitation a expiré. Demandez une nouvelle invitation à votre administrateur.";
const INVITATION_USED_MESSAGE = "Cette invitation a déjà été utilisée.";
const INVITATION_REVOKED_MESSAGE =
  "Cette invitation a été révoquée par l'administrateur.";
const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

export const invitationRouter = router({
  create: protectedProcedure
    .input(createInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.db.user.findFirst({
        where: {
          email: input.email,
          companyId: ctx.companyId,
        },
      });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cet email appartient déjà à un membre de votre cabinet.",
        });
      }

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await ctx.db.invitation.create({
        data: {
          email: input.email,
          token,
          companyId: ctx.companyId,
          expiresAt,
        },
      });

      const origin =
        ctx.headers?.get("x-forwarded-host") ??
        ctx.headers?.get("host") ??
        "localhost:3000";
      const protocol = ctx.headers?.get("x-forwarded-proto") ?? "http";
      const baseUrl = `${protocol}://${origin}`;
      const url = `${baseUrl}/invite/${token}`;

      return {
        id: invitation.id,
        token: invitation.token,
        url,
        expiresAt: invitation.expiresAt,
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    return ctx.db.invitation.findMany({
      where: {
        companyId: ctx.companyId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "asc" },
      select: {
        id: true,
        email: true,
        token: true,
        expiresAt: true,
      },
    });
  }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.invitation.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { expiresAt: "asc" },
      select: {
        id: true,
        email: true,
        token: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });
  }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findFirst({
        where: {
          id: input.id,
          companyId: ctx.companyId,
        },
      });
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.invitation.update({
        where: { id: input.id },
        data: { revokedAt: new Date() },
      });
      return { success: true };
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        select: {
          email: true,
          expiresAt: true,
          usedAt: true,
          revokedAt: true,
        },
      });
      if (!invitation) return null;
      return invitation;
    }),

  accept: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
        email: emailSchema,
        firstName: z.string().min(1, "Le prénom est requis."),
        lastName: z.string().min(1, "Le nom est requis."),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        include: { company: true },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: INVITATION_EXPIRED_MESSAGE,
        });
      }
      if (invitation.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: INVITATION_USED_MESSAGE,
        });
      }
      if (invitation.revokedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: INVITATION_REVOKED_MESSAGE,
        });
      }
      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: INVITATION_EXPIRED_MESSAGE,
        });
      }
      if (invitation.email.toLowerCase() !== input.email.toLowerCase()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: INVITATION_EXPIRED_MESSAGE,
        });
      }

      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cet email est déjà utilisé par un compte existant.",
        });
      }

      const supabaseAdmin = createAdminClient();
      const { data: authUser, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
          user_metadata: {
            firstName: input.firstName,
            lastName: input.lastName,
          },
        });

      if (createAuthError || !authUser?.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: GENERIC_ERROR_MESSAGE,
        });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: authUser.user.id,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            companyId: invitation.companyId,
          },
        });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { usedAt: new Date() },
        });
      });

      return { success: true };
    }),
});
