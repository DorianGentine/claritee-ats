"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useCallback } from "react"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/shadcn"
import type { Block } from "@blocknote/core"
import { fr } from "@blocknote/core/locales"

export type NoteBlockNoteEditorRef = {
  getContent: () => string
  focus: () => void
}

/** Vérifie si le document BlockNote est vide (pas de texte significatif) */
export const isBlockNoteContentEmpty = (content: string): boolean => {
  if (!content?.trim() || content === "[]" || content === "null") return true
  try {
    const blocks = JSON.parse(content) as unknown
    if (!Array.isArray(blocks) || blocks.length === 0) return true
    const hasText = (block: { content?: { text?: string }[]; children?: unknown[] }): boolean => {
      if (block.content?.some((c) => c?.text && String(c.text).trim().length > 0)) return true
      if (block.children?.some((c) => hasText(c as typeof block))) return true
      return false
    }
    return !blocks.some(hasText)
  } catch {
    return true
  }
}

type Props = {
  initialContent?: string
  editable?: boolean
  /** Appelé quand le contenu change (pour activer/désactiver le bouton Enregistrer) */
  onContentChange?: (isEmpty: boolean) => void
  /** Appelé avec le contenu JSON brut à chaque modification (pour auto-save debounced) */
  onRawContentChange?: (content: string) => void
}

export const NoteBlockNoteEditor = forwardRef<
  NoteBlockNoteEditorRef,
  Props
>(({ initialContent, editable = true, onContentChange, onRawContentChange }, ref) => {
  const initialBlocks = (() => {
    if (!initialContent?.trim()) return undefined
    try {
      const parsed = JSON.parse(initialContent) as unknown
      const blocks = Array.isArray(parsed) ? (parsed as Partial<Block>[]) : undefined
      return blocks?.length ? blocks : undefined
    } catch {
      return undefined
    }
  })()

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
    dictionary: fr
  })

  const editorRef = useRef(editor)
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useImperativeHandle(ref, () => ({
    getContent: () => {
      const e = editorRef.current
      if (!e?.document) return "[]"
      return JSON.stringify(e.document)
    },
    focus: () => {
      editorRef.current?.focus()
    },
  }))

  const notifyContentChange = useCallback(() => {
    const content = JSON.stringify(editor.document)
    onContentChange?.(isBlockNoteContentEmpty(content))
    onRawContentChange?.(content)
  }, [editor, onContentChange, onRawContentChange])

  useEffect(() => {
    notifyContentChange()
  }, [notifyContentChange])

  return (
    <div className={`p-2 bg-white rounded-md ${editable ? "min-h-[8em]" : ""}`}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        onChange={notifyContentChange}
      />
    </div>
  )
})

NoteBlockNoteEditor.displayName = "NoteBlockNoteEditor"
