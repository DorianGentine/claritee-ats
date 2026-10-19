/** Document Tiptap sérialisé d'un paragraphe, tel que l'enregistre NoteEditor. */
export const noteContent = (text: string): string =>
  JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : undefined,
      },
    ],
  });
