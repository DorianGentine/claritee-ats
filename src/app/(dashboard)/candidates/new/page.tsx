"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCandidateSchema } from "@/lib/validations/candidate";
import { api } from "@/lib/trpc/client";

/** Type du formulaire : champs optionnels pour compatibilité avec useForm + zodResolver */
type NewCandidateFormValues = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  title?: string;
  city?: string;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

export default function NewCandidatePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = api.candidate.create.useMutation({
    onSuccess: (data) => {
      setServerError(null);
      router.push(`/candidates/${data.id}`);
    },
    onError: () => {
      setServerError(GENERIC_ERROR_MESSAGE);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewCandidateFormValues>({
    resolver: zodResolver(createCandidateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      linkedinUrl: "",
      title: "",
      city: "",
    },
  });

  const onSubmit = (data: NewCandidateFormValues) => {
    setServerError(null);
    createMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      linkedinUrl: data.linkedinUrl?.trim() || undefined,
      title: data.title?.trim() || undefined,
      city: data.city?.trim() || undefined,
    });
  };

  const isPending = isSubmitting || createMutation.isPending;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nouveau candidat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez les informations de base du candidat.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                Prénom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                aria-required
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
              <Label htmlFor="lastName">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                aria-required
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="candidat@exemple.fr"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="06 12 34 56 78"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">Profil LinkedIn</Label>
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/..."
              aria-invalid={!!errors.linkedinUrl}
              {...register("linkedinUrl")}
            />
            {errors.linkedinUrl && (
              <p className="text-sm text-destructive" role="alert">
                {errors.linkedinUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Intitulé du poste / Titre</Label>
            <Input
              id="title"
              placeholder="Développeur full stack"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              autoComplete="address-level2"
              placeholder="Paris"
              aria-invalid={!!errors.city}
              {...register("city")}
            />
            {errors.city && (
              <p className="text-sm text-destructive" role="alert">
                {errors.city.message}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/candidates">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
