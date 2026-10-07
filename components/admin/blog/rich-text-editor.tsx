"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Heading3, Italic, Link2, List, ListOrdered, Redo2, Undo2, Unlink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { safeHref, type RichDoc } from "@/lib/blog/rich-text";
import { cn } from "@/lib/utils";

/**
 * A deliberately small editor for one section body: paragraphs, bold,
 * italic, links, bullet and numbered lists, and H3. Nothing else is
 * switched on — no H1/H2 (the template owns those), no colours, quotes,
 * code, images or embeds.
 *
 * This is guidance, not the security boundary. Whatever JSON comes out of
 * here is rebuilt from an allow-list on save and again on render
 * (lib/blog/rich-text.ts). Pasting from Word or a website is safe for the
 * same reason: ProseMirror drops anything its schema has no node for, and
 * the server drops anything the allow-list does not name.
 */
export function RichTextEditor({
  initialContent,
  onChange,
  placeholder,
  labelledBy,
}: {
  initialContent: RichDoc;
  onChange: (doc: RichDoc) => void;
  placeholder?: string;
  labelledBy?: string;
}) {
  const editor = useEditor({
    // SSR: render nothing on the server, mount in the browser — otherwise
    // React reports a hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",
          // Same rule the server enforces, so the editor never shows a link
          // that would silently vanish on save.
          isAllowedUri: (url) => safeHref(url) !== null,
          HTMLAttributes: { rel: "noopener noreferrer", target: null },
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Write this section…" }),
    ],
    content: initialContent.content.length ? initialContent : undefined,
    editorProps: {
      attributes: {
        class: "text-sm leading-relaxed text-foreground/85",
        ...(labelledBy && { "aria-labelledby": labelledBy }),
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichDoc),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card focus-within:border-ring">
      <Toolbar editor={editor} />
      <div className="blog-editor-content px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            link: e.isActive("link"),
            href: (e.getAttributes("link").href as string | undefined) ?? "",
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  if (!editor || !state) {
    return <div className="h-11 border-b border-border bg-muted/60" aria-hidden />;
  }

  function openLink() {
    setLinkValue(state?.href ?? "");
    setLinkError(null);
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const href = safeHref(linkValue);
    if (!href) {
      setLinkError("Use a full web address (https://…) or a page on the site (/service…).");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  return (
    <div className="border-b border-border bg-muted/60">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Sub-heading (H3)"
          active={state.h3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolButton>
        <ToolButton
          label="Bulleted list"
          active={state.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={state.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton label={state.link ? "Edit link" : "Add link"} active={state.link || linkOpen} onClick={openLink}>
          <Link2 className="size-4" />
        </ToolButton>
        {state.link && (
          <ToolButton label="Remove link" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>
            <Unlink className="size-4" />
          </ToolButton>
        )}
        <span className="ml-auto flex items-center gap-0.5">
          <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="size-4" />
          </ToolButton>
        </span>
      </div>

      {linkOpen && (
        <div className="flex flex-wrap items-start gap-2 border-t border-border px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <Input
              autoFocus
              value={linkValue}
              onChange={(e) => {
                setLinkValue(e.target.value);
                setLinkError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") setLinkOpen(false);
              }}
              placeholder="/service  or  https://…"
              aria-label="Link address"
              aria-invalid={linkError ? true : undefined}
              className="h-9"
            />
            {linkError ? (
              <p className="mt-1 text-xs text-destructive">{linkError}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Select the words to link first. Links to other pages on this site start with “/”.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={applyLink}
            className="h-9 rounded-full bg-blue-900 px-4 text-sm font-medium text-white hover:bg-blue-800"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="h-9 rounded-full px-3 text-sm text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor's selection: a mousedown on the button would blur it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "bg-blue-900 text-white hover:bg-blue-900 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}
