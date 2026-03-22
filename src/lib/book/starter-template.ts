import type { TiptapDoc, TiptapNode } from "@/types/book";

function text(content: string, marks?: TiptapNode["marks"]): TiptapNode {
  return marks ? { type: "text", text: content, marks } : { type: "text", text: content };
}

function heading(level: number, ...children: TiptapNode[]): TiptapNode {
  return { type: "heading", attrs: { level }, content: children };
}

function paragraph(...children: TiptapNode[]): TiptapNode {
  return { type: "paragraph", content: children };
}

function orderedList(...items: TiptapNode[]): TiptapNode {
  return { type: "orderedList", content: items };
}

function listItem(...children: TiptapNode[]): TiptapNode {
  return { type: "listItem", content: children };
}

function codeBlock(language: string, code: string): TiptapNode {
  return {
    type: "codeBlock",
    attrs: { language },
    content: [{ type: "text", text: code }],
  };
}

function blockquote(...children: TiptapNode[]): TiptapNode {
  return { type: "blockquote", content: children };
}

function table(...rows: TiptapNode[]): TiptapNode {
  return { type: "table", content: rows };
}

function tableRow(...cells: TiptapNode[]): TiptapNode {
  return { type: "tableRow", content: cells };
}

function tableHeader(...children: TiptapNode[]): TiptapNode {
  return { type: "tableHeader", content: children };
}

function tableCell(...children: TiptapNode[]): TiptapNode {
  return { type: "tableCell", content: children };
}

export function createStarterTemplate(spaceName: string): TiptapDoc {
  return {
    type: "doc",
    content: [
      heading(1, text(`Welcome to ${spaceName}`)),
      paragraph(
        text("This is your first documentation page. You can edit everything here — or delete it and start fresh."),
      ),
      blockquote(
        paragraph(
          text("Tip:", [{ type: "bold" }]),
          text(" Type "),
          text("/", [{ type: "code" }]),
          text(" anywhere to open the slash command menu. Try inserting a callout, code block, or table."),
        ),
      ),
      heading(2, text("Quick Start")),
      paragraph(text("Here's what you can do with BlinkBook:")),
      orderedList(
        listItem(
          paragraph(
            text("Write", [{ type: "bold" }]),
            text(" — Use the block editor to create rich documentation with headings, lists, callouts, code blocks, images, and tables."),
          ),
        ),
        listItem(
          paragraph(
            text("Organize", [{ type: "bold" }]),
            text(" — Drag and drop pages in the sidebar to reorder them. Create nested pages for hierarchies."),
          ),
        ),
        listItem(
          paragraph(
            text("Publish", [{ type: "bold" }]),
            text(" — Hit the publish button when you're ready. Your docs go live instantly."),
          ),
        ),
        listItem(
          paragraph(
            text("Customize", [{ type: "bold" }]),
            text(" — Choose from 6 themes, add your logo, connect a custom domain."),
          ),
        ),
      ),
      heading(2, text("Example Code Block")),
      codeBlock(
        "javascript",
        '// Install the goBlink SDK\nnpm install @goblink/sdk\n\n// Initialize\nimport { GoBlink } from \'@goblink/sdk\';\nconst client = new GoBlink({ apiKey: \'your-key\' });',
      ),
      heading(2, text("Keyboard Shortcuts")),
      table(
        tableRow(
          tableHeader(paragraph(text("Shortcut"))),
          tableHeader(paragraph(text("Action"))),
        ),
        tableRow(
          tableCell(paragraph(text("/", [{ type: "code" }]))),
          tableCell(paragraph(text("Open slash command menu"))),
        ),
        tableRow(
          tableCell(paragraph(text("Cmd+S", [{ type: "code" }]))),
          tableCell(paragraph(text("Save page"))),
        ),
        tableRow(
          tableCell(paragraph(text("Cmd+Z", [{ type: "code" }]))),
          tableCell(paragraph(text("Undo"))),
        ),
        tableRow(
          tableCell(paragraph(text("Cmd+Shift+Z", [{ type: "code" }]))),
          tableCell(paragraph(text("Redo"))),
        ),
      ),
      { type: "horizontalRule" },
      paragraph(
        text("Delete this page content and start writing your own docs. Happy documenting!", [{ type: "italic" }]),
      ),
    ],
  };
}
