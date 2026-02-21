"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, X } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tagNameSchema, MAX_TAGS_PER_CANDIDATE } from "@/lib/validations/tag"

const addTagFormSchema = z.object({
  tagName: tagNameSchema,
})

type AddTagFormValues = z.infer<typeof addTagFormSchema>;

export type TagItem = { id: string; name: string; color: string };

type Props = {
  candidateId: string;
  tags: TagItem[];
};

export const CandidateTagsSection = ({ candidateId, tags }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const utils = api.useUtils();
  const tagListQuery = api.tag.list.useQuery();
  const existingTags = tagListQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddTagFormValues>({
    resolver: zodResolver(addTagFormSchema),
    defaultValues: { tagName: "" },
  });

  const addMutation = api.candidate.addTag.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
      void utils.tag.list.invalidate();
      reset({ tagName: "" });
      setShowForm(false);
    },
  });

  const removeMutation = api.candidate.removeTag.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
    },
  });

  const onSubmit = (values: AddTagFormValues) => {
    addMutation.mutate({
      candidateId,
      tagName: values.tagName,
    })
  }

  const handleRemove = (tagId: string) => {
    removeMutation.mutate({ candidateId, tagId });
  };

  const handleCancel = () => {
    reset({ tagName: "" });
    setShowForm(false);
  };

  const atLimit = tags.length >= MAX_TAGS_PER_CANDIDATE

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Tags</h2>
        {!showForm && !atLimit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowForm(true)}
            aria-label="Ajouter un tag"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 pr-1"
              style={
                tag.color
                  ? {
                      backgroundColor: `${tag.color}20`,
                      borderColor: tag.color,
                      color: tag.color,
                      borderWidth: 1,
                      borderStyle: "solid",
                    }
                  : undefined
              }
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                disabled={removeMutation.isPending}
                className="ml-0.5 rounded-full p-0.5 hover:bg-secondary-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={`Retirer ${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        !showForm &&
        !atLimit && (
          <p className="mt-2 text-sm italic text-muted-foreground/60">
            Aucun tag
          </p>
        )
      )}

      {atLimit && (
        <p className="mt-2 text-sm text-muted-foreground">
          Maximum 20 tags par élément. Supprimez un tag existant pour en ajouter
          un nouveau.
        </p>
      )}

      {showForm && !atLimit && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
          <div>
            <Label htmlFor="tag-name">Ajouter un tag</Label>
            <Input
              id="tag-name"
              {...register("tagName")}
              list="existing-tags"
              placeholder="Ex. Python, CDI, Paris"
              autoFocus
            />
            <datalist id="existing-tags">
              {existingTags.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
            {errors.tagName && (
              <p className="mt-1 text-xs text-destructive">
                {errors.tagName.message}
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
              {addMutation.error.message ===
              "Maximum 20 tags par élément. Supprimez un tag existant pour en ajouter un nouveau."
                ? addMutation.error.message
                : "Une erreur est survenue. Réessayez."}
            </p>
          )}
        </form>
      )}
    </section>
  );
};
