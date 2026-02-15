"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TRPCClientError } from "@trpc/client";
import { createInvitationSchema, type CreateInvitationInput } from "@/lib/validations/invitation";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

export default function SettingsTeamPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const createMutation = api.invitation.create.useMutation({
    onSuccess: (data) => {
      setCreatedUrl(data.url);
      setServerError(null);
      invitationsQuery.refetch();
    },
    onError: (err) => {
      setServerError(err instanceof TRPCClientError ? err.message : GENERIC_ERROR_MESSAGE);
    },
  });

  const invitationsQuery = api.invitation.listAll.useQuery();
  const revokeMutation = api.invitation.revoke.useMutation({
    onSuccess: () => {
      invitationsQuery.refetch();
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

  const onSubmit = async (data: CreateInvitationInput) => {
    setServerError(null);
    setCreatedUrl(null);
    createMutation.mutate(data, {
      onSuccess: () => {
        reset();
      },
    });
  };

  const handleCopyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
  };

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

  const sortedInvitations = invitationsQuery.data
    ? [...invitationsQuery.data].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(getInvitationStatus(a)) -
          STATUS_ORDER.indexOf(getInvitationStatus(b)),
      )
    : [];

  const getInvitationUrl = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`;

  return (
    <main className="bg-background p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Équipe
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Invitez des collaborateurs à rejoindre votre cabinet.
      </p>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-medium text-foreground">
          Inviter un collaborateur
        </h2>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow sm:max-w-md"
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
              <p className="font-medium">Lien d&apos;invitation créé :</p>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
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
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            aria-busy={isSubmitting || createMutation.isPending}
          >
            {createMutation.isPending ? "Création…" : "Inviter un collaborateur"}
          </Button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-foreground">
          Invitations
        </h2>
        {invitationsQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Chargement…
          </p>
        ) : !invitationsQuery.data?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucune invitation.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Statut
                  </th>
                  <th className="px-4 py-3 font-medium text-foreground">
                    Expire le
                  </th>
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
      </section>
    </main>
  );
}
