import type { TiptapDoc, TiptapNode, TiptapMark } from "@/types/book";

/**
 * Convert a TipTap JSON document to clean Markdown.
 * Pure function with zero external dependencies.
 */
export function tiptapToMarkdown(doc: TiptapDoc): string {
  if (!doc.content || doc.content.length === 0) return "";
  return doc.content.map(renderNode).join("\n\n");
}

function renderNode(node: TiptapNode): string {
  switch (node.type) {
    case "heading":
      return renderHeading(node);
    case "paragraph":
      return renderInlineContent(node.content);
    case "bulletList":
      return renderList(node, "bullet");
    case "orderedList":
      return renderList(node, "ordered");
    case "listItem":
      return renderInlineContent(node.content);
    case "codeBlock":
      return renderCodeBlock(node);
    case "blockquote":
      return renderBlockquote(node);
    case "horizontalRule":
      return "---";
    case "image":
      return renderImage(node);
    case "hardBreak":
      return "\n";
    default:
      return renderInlineContent(node.content);
  }
}

function renderHeading(node: TiptapNode): string {
  const level = (node.attrs?.level as number) ?? 1;
  const prefix = "#".repeat(Math.min(level, 6));
  return `${prefix} ${renderInlineContent(node.content)}`;
}

function renderCodeBlock(node: TiptapNode): string {
  const language = (node.attrs?.language as string) ?? "";
  const code = node.content?.map((c) => c.text ?? "").join("") ?? "";
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

function renderBlockquote(node: TiptapNode): string {
  if (!node.content) return ">";
  return node.content
    .map(renderNode)
    .join("\n\n")
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function renderList(
  node: TiptapNode,
  type: "bullet" | "ordered",
  depth = 0,
): string {
  if (!node.content) return "";
  const indent = "  ".repeat(depth);
  return node.content
    .map((item, index) => {
      const prefix = type === "bullet" ? "-" : `${index + 1}.`;
      const parts: string[] = [];
      for (const child of item.content ?? []) {
        if (child.type === "bulletList") {
          parts.push(renderList(child, "bullet", depth + 1));
        } else if (child.type === "orderedList") {
          parts.push(renderList(child, "ordered", depth + 1));
        } else {
          if (parts.length === 0) {
            parts.push(
              `${indent}${prefix} ${renderInlineContent(child.content)}`,
            );
          } else {
            parts.push(`${indent}  ${renderInlineContent(child.content)}`);
          }
        }
      }
      return parts.join("\n");
    })
    .join("\n");
}

function renderImage(node: TiptapNode): string {
  const src = (node.attrs?.src as string) ?? "";
  const alt = (node.attrs?.alt as string) ?? "";
  return `![${alt}](${src})`;
}

function renderInlineContent(content: TiptapNode[] | undefined): string {
  if (!content) return "";
  return content.map(renderInlineNode).join("");
}

function renderInlineNode(node: TiptapNode): string {
  if (node.type === "hardBreak") return "\n";
  if (node.type === "image") return renderImage(node);
  const text = node.text ?? "";
  if (!text) return "";
  return applyMarks(text, node.marks);
}

function applyMarks(text: string, marks: TiptapMark[] | undefined): string {
  if (!marks || marks.length === 0) return text;
  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
      case "strong":
        result = `**${result}**`;
        break;
      case "italic":
      case "em":
        result = `*${result}*`;
        break;
      case "code":
        result = `\`${result}\``;
        break;
      case "link": {
        const href = (mark.attrs?.href as string) ?? "";
        result = `[${result}](${href})`;
        break;
      }
      case "strike":
        result = `~~${result}~~`;
        break;
    }
  }
  return result;
}
