"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClientCompanySchema } from "@/lib/validations/client";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CityAutocomplete,
  type CityOption,
} from "@/components/shared/CityAutocomplete";

type ClientCompanyFormValues = {
  name: string;
  siren?: string;
};

type ClientCompanyFormProps = {
  mode: "create" | "edit";
  /**
   * Données initiales pour le formulaire en mode édition.
   * `id` est requis en mode "edit" pour déclencher clientCompany.update.
   */
  initialClient?: {
    id?: string;
    name?: string;
    siren?: string | null;
    cities?: CityOption[];
  };
};

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

export const ClientCompanyForm = ({
  mode,
  initialClient,
}: ClientCompanyFormProps) => {
  const router = useRouter();
  const utils = api.useUtils();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedCities, setSelectedCities] = useState<CityOption[]>(
    initialClient?.cities ?? [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientCompanyFormValues>({
    resolver: zodResolver(createClientCompanySchema),
    defaultValues: {
      name: initialClient?.name ?? "",
      siren: initialClient?.siren ?? "",
    },
  });

  const createMutation = api.clientCompany.create.useMutation({
    onSuccess: () => {
      void utils.clientCompany.list.invalidate();
    },
  });

  const updateMutation = api.clientCompany.update.useMutation({
    onSuccess: async (client) => {
      await Promise.all([
        utils.clientCompany.list.invalidate(),
        utils.clientCompany.getById.invalidate({ id: client.id }),
      ]);
    },
  });

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: ClientCompanyFormValues) => {
    setServerError(null);
    const cityIds = selectedCities.map((city) => city.id);

    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync({
          name: data.name.trim(),
          siren: data.siren?.trim() || undefined,
          cityIds,
        });
        toast.success("Client créé.");
        router.push(`/clients/${created.id}`);
        return;
      }

      if (!initialClient?.id) {
        throw new Error("Identifiant client manquant pour la modification.");
      }

      const updated = await updateMutation.mutateAsync({
        id: initialClient.id,
        name: data.name.trim(),
        siren: data.siren?.trim() || undefined,
        cityIds,
      });
      toast.success("Client mis à jour.");
      router.push(`/clients/${updated.id}`);
    } catch (err) {
      setServerError(
        (err as { message?: string })?.message ?? GENERIC_ERROR_MESSAGE,
      );
    }
  };

  const cancelHref =
    mode === "edit" && initialClient?.id
      ? `/clients/${initialClient.id}`
      : "/clients";

  return (
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
          Optionnel pour les clients. Si renseigné, doit contenir exactement 9
          chiffres.
        </p>
        {errors.siren?.message && (
          <p className="text-sm text-destructive">{errors.siren.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="client-cities">Villes</Label>
        <CityAutocomplete
          id="client-cities"
          mode="multi"
          ordered={false}
          value={selectedCities}
          onChange={setSelectedCities}
          placeholder="Ajouter une ville"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending
            ? mode === "create"
              ? "Création…"
              : "Enregistrement…"
            : mode === "create"
              ? "Créer le client"
              : "Enregistrer"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
};
