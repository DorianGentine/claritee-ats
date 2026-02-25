"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientCompanySchema } from "@/lib/validations/client";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NewClientFormValues = {
  name: string;
  siren?: string;
};

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

export default function NewClientPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const utils = api.useUtils();

  const createMutation = api.clientCompany.create.useMutation({
    onSuccess: () => {
      void utils.clientCompany.list.invalidate();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewClientFormValues>({
    resolver: zodResolver(createClientCompanySchema),
    defaultValues: {
      name: "",
      siren: "",
    },
  });

  const onSubmit = async (data: NewClientFormValues) => {
    setServerError(null);
    try {
      const client = await createMutation.mutateAsync({
        name: data.name.trim(),
        siren: data.siren?.trim() || undefined,
      });
      router.push(`/clients/${client.id}`);
    } catch (err) {
      setServerError(
        (err as { message?: string })?.message ?? GENERIC_ERROR_MESSAGE
      );
    }
  };

  const isPending = isSubmitting || createMutation.isPending;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nouveau client
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseignez la société cliente pour pouvoir y associer des offres.
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

          <div className="space-y-2">
            <Label htmlFor="client-name">Raison sociale *</Label>
            <Input
              id="client-name"
              placeholder="Ex. ACME SA"
              autoComplete="organization"
              {...register("name")}
            />
            {errors.name?.message && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-siren">SIREN (optionnel)</Label>
            <Input
              id="client-siren"
              placeholder="Ex. 123456789"
              maxLength={9}
              inputMode="numeric"
              {...register("siren")}
            />
            <p className="text-xs text-muted-foreground">
              Optionnel pour les clients. Si renseigné, doit contenir exactement
              9 chiffres.
            </p>
            {errors.siren?.message && (
              <p className="text-sm text-destructive">{errors.siren.message}</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/clients">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
