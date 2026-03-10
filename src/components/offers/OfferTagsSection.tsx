"use client"

import { api } from "@/lib/trpc/client"
import { MAX_TAGS_PER_OFFER } from "@/lib/validations/tag"
import { TagsSection, type TagItem } from "@/components/shared/TagsSection"

export type OfferTagItem = TagItem

type Props = {
  offerId: string
  tags: TagItem[]
}

export const OfferTagsSection = ({ offerId, tags }: Props) => {
  const utils = api.useUtils()

  const addMutation = api.offer.addTag.useMutation({
    onSettled: () => {
      void utils.offer.getById.invalidate({ id: offerId })
      void utils.offer.list.invalidate()
      void utils.tag.list.invalidate()
    },
  })

  const removeMutation = api.offer.removeTag.useMutation({
    onSettled: () => {
      void utils.offer.getById.invalidate({ id: offerId })
      void utils.offer.list.invalidate()
    },
  })

  return (
    <TagsSection
      tags={tags}
      maxTags={MAX_TAGS_PER_OFFER}
      onAdd={(tagName) => addMutation.mutateAsync({ offerId, tagName })}
      onRemove={(tagId) => removeMutation.mutateAsync({ offerId, tagId })}
      ariaLabel="Tags de l'offre"
    />
  )
}
