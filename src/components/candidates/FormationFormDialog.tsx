"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTHS, YEARS } from "@/lib/date-constants";

const formationFormSchema = z
  .object({
    degree: z.string().min(1, "Le diplôme est requis"),
    field: z.string().max(200).optional(),
    school: z.string().min(1, "L'établissement est requis"),
    startYear: z.number().min(1900).max(2100).optional().nullable(),
    startMonth: z.number().min(1).max(12).optional().nullable(),
    endYear: z.number().min(1900).max(2100).optional().nullable(),
    endMonth: z.number().min(1).max(12).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startYear == null || data.endYear == null) return true;
      const start = new Date(
        data.startYear,
        (data.startMonth ?? 1) - 1,
        1
      ).getTime();
      const end = new Date(data.endYear, (data.endMonth ?? 1) - 1, 1).getTime();
      return end >= start;
    },
    {
      message: "La date de fin doit être après la date de début",
      path: ["endYear"],
    }
  );

type FormationFormValues = z.infer<typeof formationFormSchema>;

export type FormationItem = {
  id: string;
  degree: string;
  field: string | null;
  school: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  formation?: FormationItem | null;
  onSuccess?: () => void;
};

const defaultValues: FormationFormValues = {
  degree: "",
  field: "",
  school: "",
  startYear: null,
  startMonth: null,
  endYear: null,
  endMonth: null,
};

export const FormationFormDialog = ({
  open,
  onOpenChange,
  candidateId,
  formation,
  onSuccess,
}: Props) => {
  const utils = api.useUtils();
  const isEdit = Boolean(formation?.id);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormationFormValues>({
    resolver: zodResolver(formationFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      if (formation) {
        const start = formation.startDate
          ? new Date(formation.startDate)
          : null;
        const end = formation.endDate ? new Date(formation.endDate) : null;
        reset({
          degree: formation.degree,
          field: formation.field ?? "",
          school: formation.school,
          startYear: start ? start.getFullYear() : null,
          startMonth: start ? start.getMonth() + 1 : null,
          endYear: end ? end.getFullYear() : null,
          endMonth: end ? end.getMonth() + 1 : null,
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, formation, reset]);

  const addMutation = api.candidate.addFormation.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
      onSuccess?.();
      onOpenChange(false);
      reset(defaultValues);
    },
  });

  const updateMutation = api.candidate.updateFormation.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
      onSuccess?.();
      onOpenChange(false);
      reset(defaultValues);
    },
  });

  const onSubmit = (values: FormationFormValues) => {
    const startDate =
      values.startYear != null
        ? new Date(values.startYear, (values.startMonth ?? 1) - 1, 1)
        : null;
    const endDate =
      values.endYear != null
        ? new Date(values.endYear, (values.endMonth ?? 1) - 1, 1)
        : null;

    if (isEdit && formation) {
      updateMutation.mutate({
        candidateId,
        formationId: formation.id,
        degree: values.degree,
        field: values.field?.trim() || null,
        school: values.school,
        startDate,
        endDate,
      });
    } else {
      addMutation.mutate({
        candidateId,
        degree: values.degree,
        field: values.field?.trim() || null,
        school: values.school,
        startDate,
        endDate,
      });
    }
  };

  const pending = addMutation.isPending || updateMutation.isPending;
  const error = addMutation.error ?? updateMutation.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la formation" : "Ajouter une formation"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit
              ? "Formulaire de modification d'une formation"
              : "Formulaire d'ajout d'une formation"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="form-degree">Diplôme / Intitulé *</Label>
            <Input
              id="form-degree"
              {...register("degree")}
              placeholder="Ex. Master Informatique"
            />
            {errors.degree && (
              <p className="mt-1 text-xs text-destructive">
                {errors.degree.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="form-field">Domaine</Label>
            <Input
              id="form-field"
              {...register("field")}
              placeholder="Ex. Systèmes d'information"
            />
          </div>

          <div>
            <Label htmlFor="form-school">École / Établissement *</Label>
            <Input
              id="form-school"
              {...register("school")}
              placeholder="Ex. HEC Paris, Jouy-en-Josas"
            />
            {errors.school && (
              <p className="mt-1 text-xs text-destructive">
                {errors.school.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de début</Label>
              <div className="mt-1 flex gap-2">
                <Controller
                  control={control}
                  name="startMonth"
                  render={({ field }) => (
                    <Select
                      value={field.value != null ? String(field.value) : ""}
                      onValueChange={(v) =>
                        field.onChange(v === "" ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Mois" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Controller
                  control={control}
                  name="startYear"
                  render={({ field }) => (
                    <Select
                      value={field.value != null ? String(field.value) : ""}
                      onValueChange={(v) =>
                        field.onChange(v === "" ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div>
              <Label>Date de fin</Label>
              <div className="mt-1 flex gap-2">
                <Controller
                  control={control}
                  name="endMonth"
                  render={({ field }) => (
                    <Select
                      value={field.value != null ? String(field.value) : ""}
                      onValueChange={(v) =>
                        field.onChange(v === "" ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Mois" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Controller
                  control={control}
                  name="endYear"
                  render={({ field }) => (
                    <Select
                      value={field.value != null ? String(field.value) : ""}
                      onValueChange={(v) =>
                        field.onChange(v === "" ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {errors.endYear && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.endYear.message}
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive">
              Une erreur est survenue. Réessayez.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
