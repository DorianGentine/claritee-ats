"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, X } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tagNameSchema } from "@/lib/validations/tag"
import { getTagBadgeStyle, getTagColor } from "@/lib/tag-colors"

const addTagFormSchema = z.object({
  tagName: tagNameSchema,
})

type AddTagFormValues = z.infer<typeof addTagFormSchema>

export type TagItem = { id: string; name: string; color: string }

let nextPendingId = 0

type Props = {
  tags: TagItem[]
  maxTags: number
  onAdd: (tagName: string) => Promise<unknown>
  onRemove: (tagId: string) => Promise<unknown>
  ariaLabel?: string
}

export const TagsSection = ({
  tags,
  maxTags,
  onAdd,
  onRemove,
  ariaLabel = "Tags",
}: Props) => {
  const [showForm, setShowForm] = useState(false)
  const [pendingTags, setPendingTags] = useState<TagItem[]>([])
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  const tagListQuery = api.tag.list.useQuery()
  const existingTags = tagListQuery.data ?? []

  // Reconcile optimistic state when real tags arrive
  useEffect(() => {
    setPendingTags((prev) => {
      const next = prev.filter(
        (pt) => !tags.some((t) => t.name === pt.name),
      )
      return next.length !== prev.length ? next : prev
    })
    setRemovingIds((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (tags.some((t) => t.id === id)) next.add(id)
      }
      return next.size !== prev.size ? next : prev
    })
  }, [tags])

  const displayTags = [
    ...tags.filter((t) => !removingIds.has(t.id)),
    ...pendingTags.filter((pt) => !tags.some((t) => t.name === pt.name)),
  ]

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddTagFormValues>({
    resolver: zodResolver(addTagFormSchema),
    defaultValues: { tagName: "" },
  })

  const handleAdd = async (tagName: string) => {
    const optimisticTag: TagItem = {
      id: `pending-${++nextPendingId}`,
      name: tagName,
      color: getTagColor(tagName),
    }
    setPendingTags((prev) => [...prev, optimisticTag])
    try {
      await onAdd(tagName)
    } catch {
      setPendingTags((prev) => prev.filter((t) => t.id !== optimisticTag.id))
    }
  }

  const handleRemove = async (tagId: string) => {
    setRemovingIds((prev) => new Set(prev).add(tagId))
    try {
      await onRemove(tagId)
    } catch {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(tagId)
        return next
      })
    }
  }

  const onSubmit = (values: AddTagFormValues) => {
    void handleAdd(values.tagName)
    reset({ tagName: "" })
    setShowForm(false)
  }

  const handleCancel = () => {
    reset({ tagName: "" })
    setShowForm(false)
  }

  const atLimit = displayTags.length >= maxTags

  return (
    <section aria-label={ariaLabel}>
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

      {displayTags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {displayTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 pr-1"
              style={getTagBadgeStyle(tag.color)}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => void handleRemove(tag.id)}
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
          Maximum {maxTags} tags par élément. Supprimez un tag existant pour en
          ajouter un nouveau.
        </p>
      )}

      {showForm && !atLimit && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
          <div>
            <Label htmlFor="tags-section-input">Ajouter un tag</Label>
            <Input
              id="tags-section-input"
              {...register("tagName")}
              list="tags-section-datalist"
              placeholder="Ex. CDI, Remote, Senior"
              autoFocus
            />
            <datalist id="tags-section-datalist">
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
            <Button type="submit" size="sm">
              Ajouter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
