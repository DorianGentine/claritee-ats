import { describe, it, expect } from "vitest";
import {
  getNoteDisplayTitle,
  getNoteExcerpt,
  isNoteContentEmpty,
  parseNoteContent,
} from "@/lib/note-utils";
import { noteContent } from "../../helpers/note-content";

const EMPTY_NOTE = noteContent("");

describe("parseNoteContent", () => {
  it("returns the Tiptap document", () => {
    expect(parseNoteContent(noteContent("Bonjour"))).toMatchObject({
      type: "doc",
    });
  });

  it("returns null for empty, invalid or legacy BlockNote content", () => {
    expect(parseNoteContent("")).toBeNull();
    expect(parseNoteContent("not json")).toBeNull();
    expect(parseNoteContent("null")).toBeNull();
    expect(
      parseNoteContent(JSON.stringify([{ type: "paragraph", content: [] }]))
    ).toBeNull();
  });
});

describe("malformed documents", () => {
  const malformedDocuments = [
    { type: "doc", content: "x" },
    { type: "doc", content: [null] },
    {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: 42 }] }],
    },
    { type: "doc", content: [{ content: [] }] },
  ];

  it("rejects deeply nested documents instead of overflowing the stack", () => {
    // Construit à la main : JSON.stringify déborderait lui-même à cette profondeur
    const levels = 20_000;
    const content =
      '{"type":"doc","content":[' +
      '{"type":"blockquote","content":['.repeat(levels) +
      '{"type":"text","text":"x"}' +
      "]}".repeat(levels) +
      "]}";
    expect(() => parseNoteContent(content)).not.toThrow();
    expect(parseNoteContent(content)).toBeNull();
  });

  it("rejects them and never throws while extracting text", () => {
    for (const document of malformedDocuments) {
      const content = JSON.stringify(document);
      expect(parseNoteContent(content)).toBeNull();
      expect(() => getNoteExcerpt(content)).not.toThrow();
      expect(getNoteDisplayTitle(null, content)).toBe("Sans titre");
    }
  });
});

describe("isNoteContentEmpty", () => {
  it("is true without meaningful text", () => {
    expect(isNoteContentEmpty(EMPTY_NOTE)).toBe(true);
    expect(isNoteContentEmpty(noteContent("   "))).toBe(true);
    expect(isNoteContentEmpty("")).toBe(true);
  });

  it("is false when some text is present", () => {
    expect(isNoteContentEmpty(noteContent("Bonjour"))).toBe(false);
  });
});

describe("getNoteExcerpt", () => {
  it("joins inline text without spaces and blocks with a space", () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Titre" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hel" },
            { type: "text", text: "lo", marks: [{ type: "bold" }] },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "point" }],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(getNoteExcerpt(content)).toBe("Titre Hello point");
  });

  it("truncates long content to 80 characters", () => {
    expect(getNoteExcerpt(noteContent("y".repeat(100)))).toBe(
      "y".repeat(80) + "…"
    );
  });
});

describe("getNoteDisplayTitle", () => {
  it("returns title when provided", () => {
    expect(getNoteDisplayTitle("Mon titre", EMPTY_NOTE)).toBe("Mon titre");
    expect(getNoteDisplayTitle("  Trimmed  ", EMPTY_NOTE)).toBe("Trimmed");
  });

  it("truncates long title with ellipsis", () => {
    expect(getNoteDisplayTitle("a".repeat(35), EMPTY_NOTE)).toBe(
      "a".repeat(30) + "…"
    );
  });

  it("extracts the content text when title is empty", () => {
    const content = noteContent("Hello world from Tiptap");
    expect(getNoteDisplayTitle(null, content)).toBe("Hello world from Tiptap");
    expect(getNoteDisplayTitle("", content)).toBe("Hello world from Tiptap");
  });

  it("truncates content-derived title with ellipsis", () => {
    expect(getNoteDisplayTitle(null, noteContent("x".repeat(50)))).toBe(
      "x".repeat(30) + "…"
    );
  });

  it("returns 'Sans titre' for empty content", () => {
    expect(getNoteDisplayTitle(null, EMPTY_NOTE)).toBe("Sans titre");
    expect(getNoteDisplayTitle(null, "null")).toBe("Sans titre");
  });
});
