const DISPLAY_TITLE_MAX_LEN = 30

/**
 * Extrait le texte brut des blocks BlockNote (récursif)
 */
const extractTextFromBlocks = (blocks: unknown): string => {
  if (!blocks || !Array.isArray(blocks)) return ""
  return blocks
    .map((block) => {
      if (block?.content?.some?.((c: { text?: string }) => c?.text)) {
        return block.content
          .map((c: { text?: string }) => c?.text ?? "")
          .join("")
      }
      if (block?.children?.length) {
        return extractTextFromBlocks(block.children)
      }
      return ""
    })
    .join(" ")
}

const EXCERPT_MAX_LEN = 80

/**
 * Retourne un extrait du contenu (texte brut tronqué) pour l'affichage en liste.
 */
export const getNoteExcerpt = (content: string): string => {
  try {
    const parsed = JSON.parse(content) as unknown
    const text = extractTextFromBlocks(Array.isArray(parsed) ? parsed : [parsed])
    const plain = text.replace(/\s+/g, " ").trim()
    if (!plain) return ""
    return plain.length > EXCERPT_MAX_LEN ? plain.slice(0, EXCERPT_MAX_LEN) + "…" : plain
  } catch {
    return ""
  }
}

/**
 * Retourne le titre d'affichage d'une note : title si fourni, sinon 30 premiers caractères du contenu.
 */
export const getNoteDisplayTitle = (title: string | null | undefined, content: string): string => {
  const t = title?.trim()
  if (t) return t.length > DISPLAY_TITLE_MAX_LEN ? t.slice(0, DISPLAY_TITLE_MAX_LEN) + "…" : t
  try {
    const parsed = JSON.parse(content) as unknown
    const text = extractTextFromBlocks(Array.isArray(parsed) ? parsed : [parsed])
    const plain = text.replace(/\s+/g, " ").trim()
    if (!plain) return "Sans titre"
    return plain.length > DISPLAY_TITLE_MAX_LEN ? plain.slice(0, DISPLAY_TITLE_MAX_LEN) + "…" : plain
  } catch {
    return "Sans titre"
  }
}
