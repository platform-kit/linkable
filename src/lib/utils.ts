/** Detect if input is a bare URL (not HTML) and wrap in an iframe. */
export function resolveEmbedHtml(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // If it looks like HTML (contains < and >), return as-is
  if (trimmed.includes("<") && trimmed.includes(">")) return trimmed;
  // Try parsing as a URL
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return `<iframe src="${url.href}" width="100%" height="600" frameborder="0" style="border:0;border-radius:0.75rem" allow="camera;microphone;fullscreen;payment" loading="lazy"></iframe>`;
    }
  } catch {
    // not a valid URL — return as-is
  }
  return trimmed;
}
