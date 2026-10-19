"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseNoteContent } from "@/lib/note-utils";

export type NoteEditorRef = {
  getContent: () => string;
  focus: () => void;
};

type FormatAction = {
  label: string;
  icon: LucideIcon;
  /** Les actions d'un même groupe sont regroupées, séparées des autres par un trait */
  group: "mark" | "heading" | "block";
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const FORMAT_ACTIONS: FormatAction[] = [
  {
    label: "Gras",
    icon: Bold,
    group: "mark",
    isActive: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    label: "Italique",
    icon: Italic,
    group: "mark",
    isActive: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    label: "Souligné",
    icon: Underline,
    group: "mark",
    isActive: (editor) => editor.isActive("underline"),
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    label: "Barré",
    icon: Strikethrough,
    group: "mark",
    isActive: (editor) => editor.isActive("strike"),
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    label: "Titre 1",
    icon: Heading1,
    group: "heading",
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Titre 2",
    icon: Heading2,
    group: "heading",
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Titre 3",
    icon: Heading3,
    group: "heading",
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Liste à puces",
    icon: List,
    group: "block",
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Liste numérotée",
    icon: ListOrdered,
    group: "block",
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Citation",
    icon: Quote,
    group: "block",
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
];

/** Barre de mise en forme affichée au-dessus d'une sélection de texte. */
const NoteFormattingMenu = ({ editor }: { editor: Editor }) => {
  const activeStates = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      FORMAT_ACTIONS.map((action) => action.isActive(currentEditor)),
  });

  return (
    <BubbleMenu
      editor={editor}
      // shift garde la barre dans les conteneurs étroits qui rognent (widget de notes)
      options={{
        placement: "top-start",
        offset: 8,
        flip: true,
        shift: { padding: 8 },
      }}
      className="z-50 flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md"
    >
      {FORMAT_ACTIONS.map((action, index) => {
        const Icon = action.icon;
        const isActive = activeStates[index];
        const startsGroup =
          index > 0 && FORMAT_ACTIONS[index - 1].group !== action.group;
        return (
          <span key={action.label} className="flex items-center gap-0.5">
            {startsGroup && (
              <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={action.label}
              aria-pressed={isActive}
              title={action.label}
              className={cn(
                "size-7",
                isActive && "bg-accent text-accent-foreground"
              )}
              // Garde la sélection : sans ça, le clic retire le focus de l'éditeur
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => action.run(editor)}
            >
              <Icon className="size-4" aria-hidden />
            </Button>
          </span>
        );
      })}
    </BubbleMenu>
  );
};

/** Partagées par toutes les instances : des options stables évitent un `setOptions` à chaque rendu. */
const NOTE_EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
  }),
  Placeholder.configure({ placeholder: "Écrivez votre note…" }),
];

/** Même règle que `isNoteContentEmpty`, sans sérialiser le document à chaque frappe. */
const isEditorEmpty = (editor: Editor): boolean =>
  editor.getText().trim() === "";

const NOTE_EDITOR_PROPS = {
  attributes: { "aria-label": "Contenu de la note" },
};

type Props = {
  initialContent?: string;
  editable?: boolean;
  /** Place le curseur en fin de note au montage */
  autoFocus?: boolean;
  /** Appelé quand le contenu change (pour activer/désactiver le bouton Enregistrer) */
  onContentChange?: (isEmpty: boolean) => void;
  /** Appelé avec le contenu JSON brut à chaque modification (pour auto-save debounced) */
  onRawContentChange?: (content: string) => void;
};

/**
 * Éditeur de note Tiptap. `initialContent` n'est lu qu'au montage : pour afficher
 * une autre note, changer la `key` du composant.
 */
export const NoteEditor = forwardRef<NoteEditorRef, Props>(
  (
    {
      initialContent,
      editable = true,
      autoFocus = false,
      onContentChange,
      onRawContentChange,
    },
    ref
  ) => {
    // Les callbacks passent par des refs : options de useEditor stables d'un rendu à l'autre
    const onContentChangeRef = useRef(onContentChange);
    const onRawContentChangeRef = useRef(onRawContentChange);
    useEffect(() => {
      onContentChangeRef.current = onContentChange;
      onRawContentChangeRef.current = onRawContentChange;
    }, [onContentChange, onRawContentChange]);

    // Lu une seule fois : le document de l'éditeur fait foi ensuite
    const [initialDocument] = useState(() => parseNoteContent(initialContent));

    const editorOptions = useMemo(
      () => ({
        extensions: NOTE_EDITOR_EXTENSIONS,
        content: initialDocument,
        editable,
        autofocus: autoFocus ? ("end" as const) : false,
        // Rendu côté client uniquement : évite un écart d'hydratation avec Next
        immediatelyRender: false,
        editorProps: NOTE_EDITOR_PROPS,
        onCreate: ({ editor: createdEditor }: { editor: Editor }) => {
          onContentChangeRef.current?.(isEditorEmpty(createdEditor));
        },
        onUpdate: ({ editor: updatedEditor }: { editor: Editor }) => {
          onContentChangeRef.current?.(isEditorEmpty(updatedEditor));
          onRawContentChangeRef.current?.(
            JSON.stringify(updatedEditor.getJSON())
          );
        },
      }),
      [initialDocument, editable, autoFocus]
    );
    const editor = useEditor(editorOptions);

    useEffect(() => {
      // false : basculer l'édition ne doit pas émettre d'update (sinon auto-save à l'ouverture)
      editor?.setEditable(editable, false);
    }, [editor, editable]);

    useImperativeHandle(
      ref,
      () => ({
        getContent: () => (editor ? JSON.stringify(editor.getJSON()) : ""),
        focus: () => {
          editor?.commands.focus();
        },
      }),
      [editor]
    );

    return (
      <div
        className="note-editor rounded-md bg-white p-2"
        data-editable={editable || undefined}
      >
        {editor && editable && <NoteFormattingMenu editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    );
  }
);

NoteEditor.displayName = "NoteEditor";
