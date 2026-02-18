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
import { Textarea } from "@/components/ui/textarea";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 52 }, (_, i) => currentYear - 50 + i);

const experienceFormSchema = z
  .object({
    title: z.string().min(1, "Le titre est requis"),
    company: z.string().min(1, "L'entreprise est requise"),
    startMonth: z.number().min(1, "Mois requis").max(12),
    startYear: z.number().min(1900).max(2100),
    isCurrentJob: z.boolean(),
    endMonth: z.number().min(1).max(12).optional(),
    endYear: z.number().min(1900).max(2100).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine(
    (data) => {
      if (data.isCurrentJob) return true;
      return data.endMonth != null && data.endYear != null;
    },
    { message: "La date de fin est requise", path: ["endYear"] }
  )
  .refine(
    (data) => {
      if (data.isCurrentJob) return true;
      if (data.endMonth == null || data.endYear == null) return true;
      const start = new Date(data.startYear, data.startMonth - 1, 1).getTime();
      const end = new Date(data.endYear, data.endMonth - 1, 1).getTime();
      return end >= start;
    },
    { message: "La date de fin doit être après la date de début", path: ["endYear"] }
  );

type ExperienceFormValues = z.infer<typeof experienceFormSchema>;

export type ExperienceItem = {
  id: string;
  title: string;
  company: string;
  startDate: Date | string;
  endDate: Date | string | null;
  description: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  experience?: ExperienceItem | null;
  onSuccess?: () => void;
};

const defaultValues: ExperienceFormValues = {
  title: "",
  company: "",
  startMonth: new Date().getMonth() + 1,
  startYear: new Date().getFullYear(),
  isCurrentJob: true,
  endMonth: undefined,
  endYear: undefined,
  description: "",
};

export const ExperienceFormDialog = ({
  open,
  onOpenChange,
  candidateId,
  experience,
  onSuccess,
}: Props) => {
  const utils = api.useUtils();
  const isEdit = Boolean(experience?.id);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceFormSchema),
    defaultValues,
  });

  const isCurrentJob = watch("isCurrentJob");

  useEffect(() => {
    if (isCurrentJob) {
      setValue("endMonth", undefined);
      setValue("endYear", undefined);
    }
  }, [isCurrentJob, setValue]);

  useEffect(() => {
    if (open) {
      if (experience) {
        const start = new Date(experience.startDate);
        const end = experience.endDate ? new Date(experience.endDate) : null;
        reset({
          title: experience.title,
          company: experience.company,
          startMonth: start.getMonth() + 1,
          startYear: start.getFullYear(),
          isCurrentJob: !end,
          endMonth: end ? end.getMonth() + 1 : undefined,
          endYear: end ? end.getFullYear() : undefined,
          description: experience.description ?? "",
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, experience, reset]);

  const addMutation = api.candidate.addExperience.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
      onSuccess?.();
      onOpenChange(false);
      reset(defaultValues);
    },
  });

  const updateMutation = api.candidate.updateExperience.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
      onSuccess?.();
      onOpenChange(false);
      reset(defaultValues);
    },
  });

  const onSubmit = (values: ExperienceFormValues) => {
    const startDate = new Date(values.startYear, values.startMonth - 1, 1);
    const endDate = values.isCurrentJob
      ? null
      : values.endMonth != null && values.endYear != null
        ? new Date(values.endYear, values.endMonth - 1, 1)
        : null;

    if (isEdit && experience) {
      updateMutation.mutate({
        candidateId,
        experienceId: experience.id,
        title: values.title,
        company: values.company,
        startDate,
        endDate,
        description: values.description || null,
      });
    } else {
      addMutation.mutate({
        candidateId,
        title: values.title,
        company: values.company,
        startDate,
        endDate,
        description: values.description || null,
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
            {isEdit ? "Modifier l'expérience" : "Ajouter une expérience"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit
              ? "Formulaire de modification d'une expérience professionnelle"
              : "Formulaire d'ajout d'une expérience professionnelle"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="exp-title">Titre du poste *</Label>
            <Input
              id="exp-title"
              {...register("title")}
              placeholder="Ex. Développeur full stack"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="exp-company">Entreprise *</Label>
            <Input
              id="exp-company"
              {...register("company")}
              placeholder="Ex. Acme Inc."
            />
            {errors.company && (
              <p className="mt-1 text-xs text-destructive">{errors.company.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de début *</Label>
              <div className="mt-1 flex gap-2">
                <Controller
                  control={control}
                  name="startMonth"
                  render={({ field }) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
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
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
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
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="isCurrentJob"
              render={({ field }) => (
                <input
                  type="checkbox"
                  id="exp-current"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
              )}
            />
            <Label htmlFor="exp-current" className="cursor-pointer font-normal">
              Poste actuel
            </Label>
          </div>

          {!isCurrentJob && (
            <div>
              <Label>Date de fin</Label>
              <div className="mt-1 flex gap-2">
                <Controller
                  control={control}
                  name="endMonth"
                  render={({ field }) => (
                    <Select
                      value={field.value != null ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
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
                      onValueChange={(v) => field.onChange(Number(v))}
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
                <p className="mt-1 text-xs text-destructive">{errors.endYear.message}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="exp-description">Description</Label>
            <Textarea
              id="exp-description"
              {...register("description")}
              placeholder="Principales missions, réalisations..."
              rows={4}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">Une erreur est survenue. Réessayez.</p>
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
