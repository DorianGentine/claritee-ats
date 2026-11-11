"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TRPCClientError } from "@trpc/client";
import { api } from "@/lib/trpc/client";
import { createInvitationSchema, type CreateInvitationInput } from "@/lib/validations/invitation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { signOutBrowser } from "@/lib/supabase/sign-out";
import { toast } from "sonner";

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

const getInvitationStatus = (
  inv: {
    expiresAt: Date | string;
    usedAt: Date | string | null;
    revokedAt?: Date | string | null;
  },
): "active" | "utilisée" | "expirée" | "révoquée" => {
  if (inv.usedAt) return "utilisée";
  if (inv.revokedAt) return "révoquée";
  if (new Date(inv.expiresAt) < new Date()) return "expirée";
  return "active";
};

const STATUS_ORDER: ("active" | "utilisée" | "expirée" | "révoquée")[] = [
  "active",
  "utilisée",
  "expirée",
  "révoquée",
];

const getInvitationUrl = (token: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`;

export const TeamSettings = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const router = useRouter();
  // Membre conservé après fermeture : le titre reste juste pendant l'animation.
  const [memberToDelete, setMemberToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const askDeleteMember = (member: { id: string; firstName: string; lastName: string }) => {
    setMemberToDelete({ id: member.id, name: `${member.firstName} ${member.lastName}` });
    setConfirmOpen(true);
  };

  const membersQuery = api.company.listUsers.useQuery();
  const meQuery = api.auth.getMe.useQuery();
  const companyQuery = api.company.getMyCompany.useQuery();
  const currentUserId = meQuery.data?.id;
  const ownerId = companyQuery.data?.ownerId;
  const isOwner = !!currentUserId && currentUserId === ownerId;
  const isLastMember = membersQuery.data?.length === 1;
  const isDeletingSelf = memberToDelete?.id === currentUserId;

  const deleteUserMutation = api.company.deleteUser.useMutation({
    onSuccess: async ({ isSelf }) => {
      setConfirmOpen(false);
      if (isSelf) {
        await signOutBrowser("local");
        router.push("/");
        router.refresh();
        return;
      }
      toast.success("Membre retiré du cabinet.");
      void membersQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message ?? GENERIC_ERROR_MESSAGE);
    },
  });
  const invitationsQuery = api.invitation.listAll.useQuery();

  const createMutation = api.invitation.create.useMutation({
    onSuccess: (data) => {
      setCreatedUrl(data.url);
      setServerError(null);
      void invitationsQuery.refetch();
    },
    onError: (err) => {
      setServerError(err instanceof TRPCClientError ? err.message : GENERIC_ERROR_MESSAGE);
    },
  });

  const revokeMutation = api.invitation.revoke.useMutation({
    onSuccess: () => {
      void invitationsQuery.refetch();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: CreateInvitationInput) => {
    setServerError(null);
    setCreatedUrl(null);
    createMutation.mutate(data, {
      onSuccess: () => reset(),
    });
  };

  const handleCopyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success("Lien copié.");
  };

  const sortedInvitations = invitationsQuery.data
    ? [...invitationsQuery.data].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(getInvitationStatus(a)) -
          STATUS_ORDER.indexOf(getInvitationStatus(b)),
      )
    : [];

  return (
    <section aria-labelledby="team-settings-heading">
      <h2
        id="team-settings-heading"
        className="text-lg font-semibold text-foreground"
      >
        Équipe
      </h2>

      {/* Membres */}
      <div className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-medium text-foreground">Membres</h3>
        {membersQuery.isLoading ? (
          <div className="mt-3 space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !membersQuery.data?.length ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun membre.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground">Nom</th>
                  <th className="px-4 py-3 font-medium text-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-foreground">Membre depuis</th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {membersQuery.data.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      {member.firstName} {member.lastName}
                      {member.id === ownerId && (
                        <span className="ml-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Créateur
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.id === currentUserId ? (
                        !isLastMember && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => askDeleteMember(member)}
                          >
                            Supprimer mon compte
                          </Button>
                        )
                      ) : (
                        isOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => askDeleteMember(member)}
                            aria-label={`Retirer ${member.firstName} ${member.lastName} du cabinet`}
                          >
                            Retirer
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invitations */}
      <div className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-medium text-foreground">Inviter un collaborateur</h3>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-3 flex flex-col gap-4"
        >
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}
          {createdUrl && (
            <div
              role="status"
              className="rounded-md border border-primary/50 bg-primary/5 px-3 py-2.5 text-sm text-foreground"
            >
              <p className="font-medium">Lien d'invitation créé :</p>
              <p className="mt-1 break-all font-mono text-xs">{createdUrl}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => createdUrl && handleCopyUrl(createdUrl)}
              >
                Copier le lien
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              placeholder="collegue@exemple.fr"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              aria-busy={isSubmitting || createMutation.isPending}
            >
              {createMutation.isPending ? "Création…" : "Inviter"}
            </Button>
          </div>
        </form>

        {/* Liste des invitations */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-foreground">Invitations</h3>
          {invitationsQuery.isLoading ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !invitationsQuery.data?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">Aucune invitation.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-foreground">Email</th>
                    <th className="px-4 py-3 font-medium text-foreground">Statut</th>
                    <th className="px-4 py-3 font-medium text-foreground">Expire le</th>
                    <th className="px-4 py-3 font-medium text-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {sortedInvitations.map((inv) => {
                    const status = getInvitationStatus(inv);
                    const url = getInvitationUrl(inv.token);
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 py-3">{inv.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : status === "utilisée"
                                  ? "bg-muted text-muted-foreground"
                                  : status === "expirée"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {status === "active"
                              ? "Active"
                              : status === "utilisée"
                                ? "Utilisée"
                                : status === "expirée"
                                  ? "Expirée"
                                  : "Révoquée"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(inv.expiresAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyUrl(url)}
                              aria-label={`Copier le lien pour ${inv.email}`}
                            >
                              Copier le lien
                            </Button>
                            {status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => revokeMutation.mutate({ id: inv.id })}
                                disabled={
                                  revokeMutation.isPending &&
                                  revokeMutation.variables?.id === inv.id
                                }
                                aria-label={`Révoquer l'invitation pour ${inv.email}`}
                              >
                                Révoquer
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          isDeletingSelf
            ? "Supprimer votre compte ?"
            : `Retirer ${memberToDelete?.name ?? ""} du cabinet ?`
        }
        description={
          isDeletingSelf
            ? "Votre compte et vos accès sont définitivement supprimés. Vos notes restent visibles par le cabinet, signées « Ancien membre »."
            : "Son compte et ses accès sont définitivement supprimés. Ses notes restent visibles par le cabinet, signées « Ancien membre »."
        }
        confirmLabel={isDeletingSelf ? "Supprimer mon compte" : "Retirer"}
        pendingLabel="Suppression…"
        pending={deleteUserMutation.isPending}
        onConfirm={() => {
          if (memberToDelete) deleteUserMutation.mutate({ userId: memberToDelete.id });
        }}
      />
    </section>
  );
};
