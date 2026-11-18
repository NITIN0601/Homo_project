const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

export function encodeHtmlEntities(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITY_MAP[char] || char);
}

export function escapeJsString(str: string): string {
  if (!str || typeof str !== "string") return "";
  return JSON.stringify(str).slice(1, -1);
}
