/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { NoteChatWidget } from "@/components/layout/NoteChatWidget";
import { getNoteText } from "@/lib/note-utils";
import { noteContent } from "../../../helpers/note-content";

type MutationOptions = {
  onSuccess?: (data: { id: string }, input: unknown) => void;
  onError?: (error: Error, input: unknown) => void;
};

/** Mutations contrôlées par le test : `settle` termine la dernière mutation lancée. */
const { mutationControls, listState } = vi.hoisted(() => ({
  mutationControls: {
    create: {
      calls: [] as unknown[],
      settle: null as null | ((outcome: "success" | "error") => void),
    },
    update: {
      calls: [] as unknown[],
      settle: null as null | ((outcome: "success" | "error") => void),
    },
  },
  listState: {
    notes: [] as { id: string; title: string | null; content: string }[],
    isFetching: false,
  },
}));

vi.mock("@/lib/trpc/client", async () => {
  const { useEffect, useRef, useState } = await import("react");
  const createMutationHook =
    (control: (typeof mutationControls)["create"]) =>
    (options: MutationOptions) => {
      const [isPending, setIsPending] = useState(false);
      const optionsRef = useRef(options);
      useEffect(() => {
        optionsRef.current = options;
      });
      return {
        isPending,
        mutate: (input: unknown) => {
          control.calls.push(input);
          setIsPending(true);
          control.settle = (outcome) => {
            setIsPending(false);
            if (outcome === "success") {
              optionsRef.current.onSuccess?.({ id: "created-1" }, input);
            } else {
              optionsRef.current.onError?.(new Error("échec"), input);
            }
          };
        },
      };
    };
  return {
    api: {
      auth: {
        getMe: {
          useQuery: () => ({ data: { id: "user-1" }, isLoading: false }),
        },
      },
      note: {
        listFree: {
          useQuery: () => ({
            data: listState.notes,
            isFetching: listState.isFetching,
          }),
        },
        create: { useMutation: createMutationHook(mutationControls.create) },
        update: { useMutation: createMutationHook(mutationControls.update) },
      },
      useUtils: () => ({
        note: {
          listFree: {
            invalidate: vi.fn(),
            setData: (
              _input: undefined,
              updater: (notes: typeof listState.notes) => typeof listState.notes
            ) => {
              listState.notes = updater(listState.notes);
            },
          },
        },
      }),
    },
  };
});

// NoteEditor (Tiptap) remplacé par un textarea qui expose la même API.
vi.mock("@/components/shared/NoteEditor", () => ({
  NoteEditor: React.forwardRef(function MockEditor(
    {
      initialContent,
      onRawContentChange,
    }: {
      initialContent?: string;
      onRawContentChange?: (content: string) => void;
    },
    ref: React.Ref<{ getContent: () => string; focus: () => void }>
  ) {
    const inputRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => ({
      getContent: () => noteContent(inputRef.current?.value ?? ""),
      focus: () => inputRef.current?.focus(),
    }));
    return (
      <textarea
        ref={inputRef}
        aria-label="Contenu de la note"
        defaultValue={getNoteText(initialContent ?? "")}
        onChange={(event) =>
          onRawContentChange?.(noteContent(event.target.value))
        }
      />
    );
  }),
}));

const DRAFT_KEY = "claritee:note-draft:user-1";

const toggleButton = () =>
  screen.getByRole("button", { name: /notes rapides/ });

const editor = () =>
  screen.queryByLabelText("Contenu de la note") as HTMLTextAreaElement | null;

const typeInEditor = (text: string) => {
  const textarea = editor();
  if (!textarea) throw new Error("éditeur absent");
  fireEvent.change(textarea, { target: { value: text } });
};

const closeWidget = () =>
  fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

const selectNote = (label: string) => {
  fireEvent.click(
    screen.getByRole("button", { name: "Sélectionner une note" })
  );
  fireEvent.click(screen.getByRole("button", { name: label }));
};

const settle = (mutation: "create" | "update", outcome: "success" | "error") =>
  act(() => {
    mutationControls[mutation].settle?.(outcome);
  });

describe("NoteChatWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mutationControls.create.calls = [];
    mutationControls.update.calls = [];
    mutationControls.create.settle = null;
    mutationControls.update.settle = null;
    listState.notes = [];
    listState.isFetching = false;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the keyboard shortcut and the action in the button title", () => {
    render(<NoteChatWidget />);
    expect(toggleButton().getAttribute("title")).toBe(
      "Ouvrir les notes rapides (⌘J / Ctrl+J)"
    );
    fireEvent.click(toggleButton());
    expect(toggleButton().getAttribute("title")).toBe(
      "Fermer les notes rapides (⌘J / Ctrl+J)"
    );
  });

  it("keeps a new note as a local draft while typing and creates it on close", () => {
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    typeInEditor("Ma nouvelle note");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mutationControls.create.calls).toEqual([]);
    expect(window.localStorage.getItem(DRAFT_KEY)).toBe(
      noteContent("Ma nouvelle note")
    );

    closeWidget();
    expect(mutationControls.create.calls).toEqual([
      { content: noteContent("Ma nouvelle note") },
    ]);
    expect(editor()).toBeNull();

    settle("create", "success");
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("creates the new note when closing with the keyboard shortcut", () => {
    render(<NoteChatWidget />);
    fireEvent.keyDown(window, { key: "j", ctrlKey: true });
    typeInEditor("Via raccourci");
    fireEvent.keyDown(window, { key: "j", ctrlKey: true });
    expect(mutationControls.create.calls).toEqual([
      { content: noteContent("Via raccourci") },
    ]);
  });

  it("does not create an empty note", () => {
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mutationControls.create.calls).toEqual([]);
  });

  it("restores the local draft after a reload", () => {
    const { unmount } = render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    typeInEditor("Avant rechargement");
    unmount();

    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    expect(editor()?.value).toBe("Avant rechargement");
  });

  it("reopens on the intact draft when creation fails after closing", () => {
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    typeInEditor("Brouillon");
    closeWidget();
    expect(editor()).toBeNull();

    settle("create", "error");
    expect(screen.getByRole("alert").textContent).toBe(
      "Impossible d'enregistrer la note"
    );
    expect(editor()?.value).toBe("Brouillon");
  });

  it("waits for a pending creation before showing the new note editor", () => {
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    typeInEditor("Note en cours");
    closeWidget();
    fireEvent.click(toggleButton());
    expect(editor()).toBeNull();

    listState.notes = [
      { id: "created-1", title: null, content: noteContent("Note en cours") },
    ];
    settle("create", "success");
    expect(editor()?.value).toBe("Note en cours");
    expect(mutationControls.create.calls).toHaveLength(1);
  });

  it("restores the draft when creation fails while switching notes", () => {
    listState.notes = [
      { id: "note-1", title: "Existante", content: noteContent("x") },
    ];
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    typeInEditor("Brouillon A");
    selectNote("Existante");
    expect(mutationControls.create.calls).toEqual([
      { content: noteContent("Brouillon A") },
    ]);

    settle("create", "error");
    expect(screen.getByRole("alert").textContent).toBe(
      "Impossible d'enregistrer la note"
    );
    expect(editor()?.value).toBe("Brouillon A");
  });

  it("keeps autosaving an existing note while typing", () => {
    listState.notes = [
      { id: "note-1", title: "Existante", content: noteContent("x") },
    ];
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    selectNote("Existante");
    typeInEditor("Modifiée");
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(mutationControls.update.calls).toEqual([
      { id: "note-1", content: noteContent("Modifiée") },
    ]);
  });

  it("reopens an existing note on the content saved at close, not the stale cache", () => {
    listState.notes = [
      { id: "note-1", title: "Existante", content: noteContent("v1") },
    ];
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    selectNote("Existante");
    typeInEditor("v2");
    closeWidget();
    expect(mutationControls.update.calls).toEqual([
      { id: "note-1", content: noteContent("v2") },
    ]);

    fireEvent.click(toggleButton());
    expect(editor()?.value).toBe("v2");
  });

  it("reopens the note and resends it when an update fails after closing", () => {
    listState.notes = [
      { id: "note-1", title: "Existante", content: noteContent("v1") },
    ];
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    selectNote("Existante");
    typeInEditor("v2");
    closeWidget();

    settle("update", "error");
    expect(screen.getByRole("alert").textContent).toBe(
      "Impossible d'enregistrer la note"
    );
    expect(editor()?.value).toBe("v2");

    closeWidget();
    expect(mutationControls.update.calls).toEqual([
      { id: "note-1", content: noteContent("v2") },
      { id: "note-1", content: noteContent("v2") },
    ]);
  });

  it("keeps an explicit « Nouvelle note » choice when a pending creation succeeds", () => {
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    typeInEditor("Première");
    closeWidget();
    fireEvent.click(toggleButton());
    fireEvent.click(
      screen.getByRole("button", { name: "Sélectionner une note" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Nouvelle note" }));

    listState.notes = [
      { id: "created-1", title: null, content: noteContent("Première") },
    ];
    settle("create", "success");
    expect(editor()?.value).toBe("");
    expect(
      screen.getByRole("button", { name: "Sélectionner une note" }).textContent
    ).toContain("Nouvelle note");
  });

  it("does not pull the user off an existing note when a creation succeeds", () => {
    listState.notes = [
      { id: "note-1", title: "Existante", content: noteContent("x") },
    ];
    render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    typeInEditor("Nouvelle");
    closeWidget();
    fireEvent.click(toggleButton());
    selectNote("Existante");

    settle("create", "success");
    expect(editor()?.value).toBe("x");
  });

  it("does not mount an editor for a note that is no longer listed", () => {
    listState.notes = [
      { id: "note-1", title: "Existante", content: noteContent("x") },
    ];
    const { rerender } = render(<NoteChatWidget />);
    fireEvent.click(toggleButton());
    selectNote("Existante");

    listState.notes = [];
    rerender(<NoteChatWidget />);
    expect(editor()).toBeNull();
    expect(
      screen.getByText(
        "Cette note n'est plus disponible (supprimée ou déplacée)."
      )
    ).toBeTruthy();
  });
});
