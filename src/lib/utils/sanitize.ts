import sanitizeHtml from "sanitize-html";

// Sanitize le HTML des emails pour prevenir le XSS stocke
// Autorise les balises de mise en forme standard, bloque scripts et event handlers

const ALLOWED_TAGS = [
  "a",
  "b",
  "br",
  "blockquote",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  td: ["colspan", "rowspan", "style"],
  th: ["colspan", "rowspan", "style"],
  div: ["style"],
  span: ["style"],
  p: ["style"],
  table: ["style", "width"],
};

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    // Bloquer les protocoles dangereux dans les liens
    disallowedTagsMode: "discard",
  });
}
