// EditorRichText.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
} from "lucide-react";

import { useEffect } from "react";

export function EditorRichText({
  conteudo,
  setConteudo,
  onDelete,
}: {
  conteudo: string;
  setConteudo: (conteudo: string) => void;
  onDelete?: () => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: conteudo || "<p></p>",
    onUpdate: ({ editor }) => {
      setConteudo(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-gray dark:prose-invert max-w-none focus:outline-none min-h-[300px] prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-em:text-gray-900 dark:prose-em:text-gray-100",
      },
    },
  });

  useEffect(() => {
    if (editor && conteudo && editor.getHTML() !== conteudo) {
      editor.commands.setContent(conteudo, { emitUpdate: false });
    }
  }, [conteudo, editor]);

  if (!editor) return null;

  return (
    <div className="border rounded-md h-full flex flex-col ">
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("paragraph") ? "bg-gray-200 dark:bg-gray-600" : ""
          }`}
          title="Texto normal"
        >
          <Type className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        <div className="border-l mx-1 h-6 border-gray-300 dark:border-gray-600"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("bold") ? "bg-gray-200 dark:bg-gray-600" : ""
          }`}
          title="Negrito"
        >
          <Bold className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("italic") ? "bg-gray-200 dark:bg-gray-600" : ""
          }`}
          title="Itálico"
        >
          <Italic className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("underline") ? "bg-gray-200 dark:bg-gray-600" : ""
          }`}
          title="Sublinhado"
        >
          <UnderlineIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        <div className="border-l mx-1 h-6 border-gray-300 dark:border-gray-600"></div>

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("heading", { level: 1 })
              ? "bg-gray-200 dark:bg-gray-600"
              : ""
          }`}
          title="Título 1"
        >
          <Heading1 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("heading", { level: 2 })
              ? "bg-gray-200 dark:bg-gray-600"
              : ""
          }`}
          title="Título 2"
        >
          <Heading2 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("heading", { level: 3 })
              ? "bg-gray-200 dark:bg-gray-600"
              : ""
          }`}
          title="Título 3"
        >
          <Heading3 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        <div className="border-l mx-1 h-6 border-gray-300 dark:border-gray-600"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive({ textAlign: "left" })
              ? "bg-gray-200 dark:bg-gray-600"
              : ""
          }`}
          title="Alinhar à esquerda"
        >
          <AlignLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive({ textAlign: "center" })
              ? "bg-gray-200 dark:bg-gray-600"
              : ""
          }`}
          title="Centralizar"
        >
          <AlignCenter className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive({ textAlign: "right" })
              ? "bg-gray-200 dark:bg-gray-600"
              : ""
          }`}
          title="Alinhar à direita"
        >
          <AlignRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        {onDelete && (
          <>
            <div className="border-l mx-1 h-6 border-gray-300 dark:border-gray-600"></div>
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              title="Deletar anotação"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Editor area */}
      <div className="p-4 flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
