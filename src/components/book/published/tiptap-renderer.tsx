import type { TiptapDoc, TiptapNode, TiptapMark } from "@/types/book";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarks(text: string, marks?: TiptapMark[]): string {
  if (!marks || marks.length === 0) return escapeHtml(text);
  let result = escapeHtml(text);
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `<strong>${result}</strong>`;
        break;
      case "italic":
        result = `<em>${result}</em>`;
        break;
      case "strike":
        result = `<s>${result}</s>`;
        break;
      case "code":
        result = `<code>${result}</code>`;
        break;
      case "link": {
        const href = escapeHtml(String(mark.attrs?.href ?? ""));
        result = `<a href="${href}" target="_blank" rel="noopener noreferrer">${result}</a>`;
        break;
      }
    }
  }
  return result;
}

function renderChildren(nodes?: TiptapNode[]): string {
  if (!nodes) return "";
  return nodes.map(renderNode).join("");
}

function renderNode(node: TiptapNode): string {
  switch (node.type) {
    case "text":
      return renderMarks(node.text ?? "", node.marks);
    case "paragraph":
      return `<p>${renderChildren(node.content)}</p>`;
    case "heading": {
      const level = node.attrs?.level ?? 2;
      const text = getPlainText(node);
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return `<h${level} id="${escapeHtml(id)}">${renderChildren(node.content)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderChildren(node.content)}</ul>`;
    case "orderedList":
      return `<ol>${renderChildren(node.content)}</ol>`;
    case "listItem":
      return `<li>${renderChildren(node.content)}</li>`;
    case "blockquote":
      return `<blockquote>${renderChildren(node.content)}</blockquote>`;
    case "codeBlock": {
      const lang = node.attrs?.language ?? "plaintext";
      const code = node.content?.map((n) => n.text ?? "").join("") ?? "";
      return `<div class="bb-code-block" data-language="${escapeHtml(String(lang))}">
        <div class="bb-code-header"><span>${escapeHtml(String(lang))}</span></div>
        <pre><code class="language-${escapeHtml(String(lang))}">${escapeHtml(code)}</code></pre>
      </div>`;
    }
    case "callout": {
      const calloutType = node.attrs?.type ?? "info";
      return `<div class="bb-callout bb-callout-${escapeHtml(String(calloutType))}">
        <div class="bb-callout-content">${renderChildren(node.content)}</div>
      </div>`;
    }
    case "image": {
      const src = escapeHtml(String(node.attrs?.src ?? ""));
      const alt = escapeHtml(String(node.attrs?.alt ?? ""));
      return `<img src="${src}" alt="${alt}" loading="lazy" />`;
    }
    case "table":
      return `<div class="bb-table-wrapper"><table>${renderChildren(node.content)}</table></div>`;
    case "tableRow":
      return `<tr>${renderChildren(node.content)}</tr>`;
    case "tableCell":
      return `<td>${renderChildren(node.content)}</td>`;
    case "tableHeader":
      return `<th>${renderChildren(node.content)}</th>`;
    case "horizontalRule":
      return "<hr />";
    case "hardBreak":
      return "<br />";
    default:
      return renderChildren(node.content);
  }
}

export function getPlainText(node: TiptapNode): string {
  if (node.text) return node.text;
  return node.content?.map(getPlainText).join("") ?? "";
}

export function renderTiptapDoc(doc: TiptapDoc): string {
  return renderChildren(doc.content);
}

export function extractHeadings(doc: TiptapDoc): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  function walk(nodes?: TiptapNode[]) {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.type === "heading") {
        const text = getPlainText(node);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        headings.push({ id, text, level: Number(node.attrs?.level ?? 2) });
      }
      walk(node.content);
    }
  }
  walk(doc.content);
  return headings;
}

export function TiptapContent({ html }: { html: string }) {
  return <div className="bb-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
