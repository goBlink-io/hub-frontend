"use client";

import DOMPurify from "isomorphic-dompurify";

export function TiptapContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote", "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "hr", "div", "span", "sup", "sub", "mark", "details", "summary"],
    ALLOWED_ATTR: ["href", "src", "alt", "class", "id", "target", "rel", "width", "height", "colspan", "rowspan", "style"],
    ALLOW_DATA_ATTR: false,
  });

  return <div className="bb-content" dangerouslySetInnerHTML={{ __html: clean }} />;
}
