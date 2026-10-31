import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { parseNoteContent } from "@/lib/note-utils";
import { cn } from "@/lib/utils";

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

const toSafeHref = (href: unknown): string | null => {
  if (typeof href !== "string") return null;
  try {
    const url = new URL(href, "https://claritee.invalid");
    return SAFE_LINK_PROTOCOLS.includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
};

const renderMarks = (text: ReactNode, marks: JSONContent["marks"]): ReactNode =>
  (marks ?? []).reduce<ReactNode>((child, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{child}</strong>;
      case "italic":
        return <em>{child}</em>;
      case "underline":
        return <u>{child}</u>;
      case "strike":
        return <s>{child}</s>;
      case "link": {
        const href = toSafeHref(mark.attrs?.href);
        return href ? (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {child}
          </a>
        ) : (
          child
        );
      }
      default:
        return child;
    }
  }, text);

const renderChildren = (node: JSONContent): ReactNode =>
  (node.content ?? []).map((child, index) => (
    <NoteNode key={index} node={child} />
  ));

const NoteNode = ({ node }: { node: JSONContent }): ReactNode => {
  switch (node.type) {
    case "text":
      return renderMarks(node.text ?? "", node.marks);
    case "hardBreak":
      return <br />;
    case "paragraph":
      return <p>{renderChildren(node)}</p>;
    case "heading": {
      const level = node.attrs?.level;
      if (level === 1) return <h3 className="text-lg font-semibold">{renderChildren(node)}</h3>;
      if (level === 2) return <h4 className="text-base font-semibold">{renderChildren(node)}</h4>;
      return <h5 className="font-semibold">{renderChildren(node)}</h5>;
    }
    case "bulletList":
      return <ul className="list-disc pl-5">{renderChildren(node)}</ul>;
    case "orderedList":
      return <ol className="list-decimal pl-5">{renderChildren(node)}</ol>;
    case "listItem":
      return <li>{renderChildren(node)}</li>;
    case "blockquote":
      return <blockquote className="border-l-2 border-current/30 pl-3 opacity-90">{renderChildren(node)}</blockquote>;
    default:
      return renderChildren(node);
  }
};

type Props = { content: string; className?: string };

/**
 * Rendu statique (lecture seule) d'une note Tiptap : pas d'éditeur ProseMirror monté,
 * pas de décalage de mise en page. Liens limités aux protocoles sûrs.
 */
export const NoteContent = ({ content, className }: Props) => {
  const document = parseNoteContent(content);
  return (
    <div
      className={cn(
        "space-y-1.5 text-sm leading-relaxed break-words [&_a]:underline",
        className
      )}
    >
      {document ? renderChildren(document) : null}
    </div>
  );
};
