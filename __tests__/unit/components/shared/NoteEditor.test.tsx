/**
 * @vitest-environment jsdom
 */
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NoteEditor, type NoteEditorRef } from "@/components/shared/NoteEditor";
import { parseNoteContent } from "@/lib/note-utils";
import { noteContent } from "../../../helpers/note-content";

describe("NoteEditor", () => {
  it("renders the initial Tiptap content", async () => {
    render(
      <NoteEditor initialContent={noteContent("Bonjour")} editable={false} />
    );
    // findByText échoue si le texte n'est pas rendu
    await screen.findByText("Bonjour");
  });

  it("ignores legacy BlockNote content instead of crashing", async () => {
    const onContentChange = vi.fn();
    render(
      <NoteEditor
        initialContent={JSON.stringify([{ type: "paragraph", content: [] }])}
        onContentChange={onContentChange}
      />
    );
    await waitFor(() => expect(onContentChange).toHaveBeenCalledWith(true));
  });

  it("exposes the document through getContent", async () => {
    const ref = createRef<NoteEditorRef>();
    render(<NoteEditor ref={ref} initialContent={noteContent("Bonjour")} />);
    await screen.findByText("Bonjour");
    expect(parseNoteContent(ref.current?.getContent())).toMatchObject({
      type: "doc",
    });
    expect(ref.current?.getContent()).toContain("Bonjour");
  });

  it("reports a non-empty note on creation", async () => {
    const onContentChange = vi.fn();
    render(
      <NoteEditor
        initialContent={noteContent("Bonjour")}
        onContentChange={onContentChange}
      />
    );
    await waitFor(() => expect(onContentChange).toHaveBeenCalledWith(false));
  });

  it("does not emit a content change on mount (no autosave on open)", async () => {
    const onRawContentChange = vi.fn();
    render(
      <NoteEditor
        initialContent={noteContent("Bonjour")}
        onRawContentChange={onRawContentChange}
      />
    );
    await screen.findByText("Bonjour");
    expect(onRawContentChange).not.toHaveBeenCalled();
  });

  it("does not render the formatting menu when read-only", async () => {
    render(
      <NoteEditor initialContent={noteContent("Bonjour")} editable={false} />
    );
    await screen.findByText("Bonjour");
    expect(screen.queryByRole("button", { name: "Gras" })).toBeNull();
  });
});
