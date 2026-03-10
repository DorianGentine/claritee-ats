"use client"

import { api } from "@/lib/trpc/client"
import { MAX_TAGS_PER_CANDIDATE } from "@/lib/validations/tag"
import { TagsSection, type TagItem } from "@/components/shared/TagsSection"

export type { TagItem }

type Props = {
  candidateId: string
  tags: TagItem[]
}

export const CandidateTagsSection = ({ candidateId, tags }: Props) => {
  const utils = api.useUtils()

  const addMutation = api.candidate.addTag.useMutation({
    onSettled: () => {
      void utils.candidate.getById.invalidate({ id: candidateId })
      void utils.candidate.list.invalidate()
      void utils.tag.list.invalidate()
    },
  })

  const removeMutation = api.candidate.removeTag.useMutation({
    onSettled: () => {
      void utils.candidate.getById.invalidate({ id: candidateId })
      void utils.candidate.list.invalidate()
    },
  })

  return (
    <TagsSection
      tags={tags}
      maxTags={MAX_TAGS_PER_CANDIDATE}
      onAdd={(tagName) => addMutation.mutateAsync({ candidateId, tagName })}
      onRemove={(tagId) => removeMutation.mutateAsync({ candidateId, tagId })}
      ariaLabel="Tags du candidat"
    />
  )
}
