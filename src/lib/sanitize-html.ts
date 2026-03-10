import DOMPurify from "dompurify";

/** Sanitize HTML for safe v-html rendering. Allows iframes for embed content. */
export const sanitizeHtml = (dirty: string): string =>
  DOMPurify.sanitize(dirty, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "loading"],
  });
