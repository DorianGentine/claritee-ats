"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_LEVELS, languageLevelSchema } from "@/lib/validations/candidate";

const LANGUAGE_LEVEL_LABELS: Record<(typeof LANGUAGE_LEVELS)[number], string> = {
  NOTION: "Notions",
  INTERMEDIATE: "Intermédiaire",
  FLUENT: "Courant",
  BILINGUAL: "Bilingue",
  NATIVE: "Natif",
};

const SUGGESTED_LANGUAGES = [
  "Français",
  "Anglais",
  "Espagnol",
  "Allemand",
  "Italien",
];

const addLanguageFormSchema = z.object({
  name: z.string().min(1, "Le nom de la langue est requis").max(50),
  level: languageLevelSchema,
});

type AddLanguageFormValues = z.infer<typeof addLanguageFormSchema>;

type LanguageItem = { id: string; name: string; level: string };

type Props = {
  candidateId: string;
  languages: LanguageItem[];
};

export const CandidateLanguagesSection = ({ candidateId, languages }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AddLanguageFormValues>({
    resolver: zodResolver(addLanguageFormSchema),
    defaultValues: { name: "", level: undefined },
  });

  const addMutation = api.candidate.addLanguage.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
      reset({ name: "", level: undefined });
      setShowForm(false);
    },
  });

  const removeMutation = api.candidate.removeLanguage.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
    },
  });

  const onSubmit = (values: AddLanguageFormValues) => {
    addMutation.mutate({
      candidateId,
      name: values.name,
      level: values.level,
    });
  };

  const handleRemove = (languageId: string) => {
    removeMutation.mutate({ candidateId, languageId });
  };

  const handleCancel = () => {
    reset({ name: "", level: undefined });
    setShowForm(false);
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Langues</h2>
        {!showForm && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowForm(true)}
            aria-label="Ajouter une langue"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {languages.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {languages.map((lang) => (
            <Badge
              key={lang.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {lang.name} — {LANGUAGE_LEVEL_LABELS[lang.level as keyof typeof LANGUAGE_LEVEL_LABELS] ?? lang.level}
              <button
                type="button"
                onClick={() => handleRemove(lang.id)}
                disabled={removeMutation.isPending}
                className="ml-0.5 rounded-full p-0.5 hover:bg-secondary-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={`Retirer ${lang.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="mt-2 text-sm italic text-muted-foreground/60">
            Aucune langue renseignée
          </p>
        )
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
          <div>
            <Label htmlFor="lang-name">Langue</Label>
            <Input
              id="lang-name"
              {...register("name")}
              list="suggested-languages"
              placeholder="Ex. Anglais"
              autoFocus
            />
            <datalist id="suggested-languages">
              {SUGGESTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang} />
              ))}
            </datalist>
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="lang-level">Niveau</Label>
            <Controller
              control={control}
              name="level"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="lang-level" className="w-full">
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {LANGUAGE_LEVEL_LABELS[lvl]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.level && (
              <p className="mt-1 text-xs text-destructive">
                {errors.level.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "Ajout…" : "Ajouter"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={addMutation.isPending}
            >
              Annuler
            </Button>
          </div>

          {addMutation.error && (
            <p className="text-xs text-destructive">
              Une erreur est survenue. Réessayez.
            </p>
          )}
        </form>
      )}
    </section>
  );
};
