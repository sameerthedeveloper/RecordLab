"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const GET_TEXT_OPTIONS = {
  blockSeparator: "\n",
  textSerializers: { hardBreak: () => "\n" },
};

function textToDoc(text: string) {
  const lines = text.split("\n");
  const content: Array<Record<string, unknown>> = [];
  lines.forEach((line, i) => {
    if (i > 0) content.push({ type: "hardBreak" });
    if (line) content.push({ type: "text", text: line });
  });
  return { type: "doc", content: [{ type: "paragraph", content }] };
}

interface TiptapFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * A plain-text-only editing surface built on Tiptap: content is stored and
 * round-tripped as `\n`-joined text (no bold/italic/list marks), so it slots
 * directly into RecordState fields without changing what canvas2pdf, the
 * pagination engine, or .docx export receive.
 */
export function TiptapField({ value, onChange, className }: TiptapFieldProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        underline: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        link: false,
      }),
    ],
    content: textToDoc(value),
    editorProps: {
      attributes: { class: className || "" },
    },
    onUpdate: ({ editor: e }) => onChange(e.getText(GET_TEXT_OPTIONS)),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getText(GET_TEXT_OPTIONS);
    if (current !== value) {
      editor.commands.setContent(textToDoc(value), { emitUpdate: false });
    }
    // Only re-sync when the external value changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return <EditorContent editor={editor} />;
}
