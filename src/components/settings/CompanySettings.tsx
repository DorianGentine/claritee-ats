"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/trpc/client";
import { updateCompanySchema, type UpdateCompanyInput } from "@/lib/validations/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const CompanySettings = () => {
  const utils = api.useUtils();
  const companyQuery = api.company.getMyCompany.useQuery();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
    values: companyQuery.data ? { name: companyQuery.data.name } : undefined,
  });

  const updateMutation = api.company.updateCompany.useMutation({
    onSuccess: () => {
      toast.success("Informations mises à jour.");
      void utils.company.getMyCompany.invalidate();
    },
    onError: () => {
      toast.error("Une erreur est survenue. Réessayez.");
    },
  });

  const onSubmit = (data: UpdateCompanyInput) => {
    updateMutation.mutate(data);
  };

  return (
    <section aria-labelledby="company-settings-heading">
      <h2
        id="company-settings-heading"
        className="text-lg font-semibold text-foreground"
      >
        Informations du cabinet
      </h2>
      <div className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        {companyQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nom du cabinet</Label>
              <Input
                id="company-name"
                type="text"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-siren">SIREN</Label>
              <Input
                id="company-siren"
                type="text"
                value={companyQuery.data?.siren ?? ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Le numéro SIREN ne peut pas être modifié.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || updateMutation.isPending}
              aria-busy={isSubmitting || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
};
