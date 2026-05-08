"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/trpc/client";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/user";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const passwordChangeSchema = z
  .object({
    newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    confirmPassword: z.string().min(1, "Confirmez le mot de passe."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const ProfileSettings = () => {
  const utils = api.useUtils();
  const profileQuery = api.auth.getMe.useQuery();

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: profileQuery.data
      ? { firstName: profileQuery.data.firstName, lastName: profileQuery.data.lastName }
      : undefined,
  });

  const passwordForm = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const updateProfileMutation = api.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profil mis à jour.");
      void utils.auth.getMe.invalidate();
      // Rafraîchit le JWT client pour que la navbar reflète les nouveaux user_metadata
      const supabase = createClient();
      await supabase.auth.refreshSession();
    },
    onError: () => {
      toast.error("Une erreur est survenue. Réessayez.");
    },
  });

  const onSubmitProfile = (data: UpdateProfileInput) => {
    updateProfileMutation.mutate(data);
  };

  const newPasswordValue = useWatch({ control: passwordForm.control, name: "newPassword" });
  const confirmPasswordValue = useWatch({
    control: passwordForm.control,
    name: "confirmPassword",
  });

  const onSubmitPassword = async (data: PasswordChangeInput) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.newPassword });
    if (error) {
      toast.error("Impossible de modifier le mot de passe. Réessayez.");
    } else {
      toast.success("Mot de passe mis à jour.");
      passwordForm.reset();
    }
  };

  return (
    <section aria-labelledby="profile-settings-heading">
      <h2
        id="profile-settings-heading"
        className="text-lg font-semibold text-foreground"
      >
        Mon profil
      </h2>

      {/* Profil */}
      <div className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-medium text-foreground">Informations personnelles</h3>
        {profileQuery.isLoading ? (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form
            onSubmit={profileForm.handleSubmit(onSubmitProfile)}
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-firstName">Prénom</Label>
                <Input
                  id="profile-firstName"
                  type="text"
                  aria-invalid={!!profileForm.formState.errors.firstName}
                  {...profileForm.register("firstName")}
                />
                {profileForm.formState.errors.firstName && (
                  <p className="text-sm text-destructive" role="alert">
                    {profileForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-lastName">Nom</Label>
                <Input
                  id="profile-lastName"
                  type="text"
                  aria-invalid={!!profileForm.formState.errors.lastName}
                  {...profileForm.register("lastName")}
                />
                {profileForm.formState.errors.lastName && (
                  <p className="text-sm text-destructive" role="alert">
                    {profileForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileQuery.data?.email ?? ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                L'adresse email ne peut pas être modifiée.
              </p>
            </div>

            <Button
              type="submit"
              disabled={
                profileForm.formState.isSubmitting || updateProfileMutation.isPending
              }
              aria-busy={
                profileForm.formState.isSubmitting || updateProfileMutation.isPending
              }
            >
              {updateProfileMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        )}
      </div>

      {/* Mot de passe */}
      <div className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-medium text-foreground">Changer le mot de passe</h3>
        <form
          onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
          className="mt-4 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!passwordForm.formState.errors.newPassword}
              {...passwordForm.register("newPassword")}
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-sm text-destructive" role="alert">
                {passwordForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!passwordForm.formState.errors.confirmPassword}
              {...passwordForm.register("confirmPassword")}
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive" role="alert">
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={
              passwordForm.formState.isSubmitting ||
              !newPasswordValue ||
              !confirmPasswordValue
            }
          >
            {passwordForm.formState.isSubmitting
              ? "Modification…"
              : "Changer le mot de passe"}
          </Button>
        </form>
      </div>
    </section>
  );
};
