"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TRPCClientError } from "@trpc/client";
import { z } from "zod";
import { emailSchema, passwordSchema } from "@/lib/validations/auth";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const INVITATION_EXPIRED_MESSAGE =
  "Cette invitation a expiré. Demandez une nouvelle invitation à votre administrateur.";
const INVITATION_USED_MESSAGE = "Cette invitation a déjà été utilisée.";
const INVITATION_REVOKED_MESSAGE =
  "Cette invitation a été révoquée par l'administrateur.";
const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

const inviteAcceptSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  password: passwordSchema,
});

type InviteAcceptFormValues = z.infer<typeof inviteAcceptSchema>;

const InviteAcceptForm = ({
  token,
  initialEmail,
}: {
  token: string;
  initialEmail: string;
}) => {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const acceptMutation = api.invitation.accept.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteAcceptFormValues>({
    resolver: zodResolver(inviteAcceptSchema),
    defaultValues: {
      email: initialEmail,
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  const onSubmit = async (data: InviteAcceptFormValues) => {
    setServerError(null);
    try {
      await acceptMutation.mutateAsync({
        token,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      });

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        setServerError(GENERIC_ERROR_MESSAGE);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof TRPCClientError) {
        setServerError(err.message || GENERIC_ERROR_MESSAGE);
      } else {
        setServerError(GENERIC_ERROR_MESSAGE);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow"
    >
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          readOnly
          disabled
          className="bg-muted"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            type="text"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive" role="alert">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            type="text"
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive" role="alert">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="mt-2"
        disabled={isSubmitting || acceptMutation.isPending}
        aria-busy={isSubmitting || acceptMutation.isPending}
      >
        {acceptMutation.isPending ? "Création en cours…" : "Créer mon compte"}
      </Button>
    </form>
  );
};

export default function InvitePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const invitationQuery = api.invitation.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const { status, errorMessage, invitationData } = (() => {
    if (!token || invitationQuery.isLoading) {
      return {
        status: "loading" as const,
        errorMessage: null,
        invitationData: null,
      };
    }
    if (invitationQuery.error || !invitationQuery.data) {
      return {
        status: "invalid" as const,
        errorMessage: INVITATION_EXPIRED_MESSAGE,
        invitationData: null,
      };
    }
    const inv = invitationQuery.data;
    if (inv.usedAt) {
      return {
        status: "used" as const,
        errorMessage: INVITATION_USED_MESSAGE,
        invitationData: null,
      };
    }
    if ("revokedAt" in inv && inv.revokedAt) {
      return {
        status: "revoked" as const,
        errorMessage: INVITATION_REVOKED_MESSAGE,
        invitationData: null,
      };
    }
    if (new Date(inv.expiresAt) < new Date()) {
      return {
        status: "expired" as const,
        errorMessage: INVITATION_EXPIRED_MESSAGE,
        invitationData: null,
      };
    }
    return {
      status: "ready" as const,
      errorMessage: null,
      invitationData: inv,
    };
  })();

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-destructive">{INVITATION_EXPIRED_MESSAGE}</p>
        </div>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (
    status === "invalid" ||
    status === "expired" ||
    status === "used" ||
    status === "revoked"
  ) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div
            role="alert"
            className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center"
          >
            <p className="text-destructive">{errorMessage}</p>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Retour à la connexion
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Accepter l'invitation
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez votre compte pour rejoindre l'équipe.
          </p>
        </div>

        {invitationData && (
          <InviteAcceptForm token={token} initialEmail={invitationData.email} />
        )}

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
