/**
 * Generic client-side API for file-based content collections.
 *
 * In dev mode, talks to the Vite CMS middleware at `/__collection/{key}`.
 * In production, reads pre-built static JSON from `/collections/{key}/`.
 */

import type { ContentCollectionDef } from "./layout-manifest";

// Build-time injected collection definitions
const defs: ContentCollectionDef[] =
  typeof __PK_CONTENT_COLLECTIONS__ !== "undefined" ? __PK_CONTENT_COLLECTIONS__ : [];

/** Look up a collection definition by key. */
export const getCollectionDef = (key: string): ContentCollectionDef | undefined =>
  defs.find((d) => d.key === key);

/** Get all collection definitions. */
export const getCollectionDefs = (): ContentCollectionDef[] => defs;

/** Fetch the list of items for a file-based collection. */
export const fetchCollectionItems = async (
  key: string,
): Promise<Record<string, unknown>[]> => {
  if (import.meta.env.DEV) {
    const res = await fetch(`/__collection/${encodeURIComponent(key)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`Failed to fetch collection ${key}: ${res.status}`);
    }
    return res.json();
  }

  const res = await fetch(`/collections/${encodeURIComponent(key)}/index.json`);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch collection ${key}: ${res.status}`);
  }
  return res.json();
};

/** Fetch a single item by slug from a file-based collection. */
export const fetchCollectionItem = async (
  key: string,
  slug: string,
): Promise<Record<string, unknown> | null> => {
  if (import.meta.env.DEV) {
    const res = await fetch(
      `/__collection/${encodeURIComponent(key)}?slug=${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json();
  }

  const res = await fetch(
    `/collections/${encodeURIComponent(key)}/${encodeURIComponent(slug)}.json`,
  );
  if (!res.ok) return null;
  return res.json();
};

/** Save (create or update) a collection item. */
export const saveCollectionItem = async (
  key: string,
  slug: string,
  data: Record<string, unknown>,
): Promise<void> => {
  if (import.meta.env.DEV) {
    await fetch(`/__collection/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, slug }),
    });
    return;
  }
  throw new Error(
    "Collection editing in production requires GitHub sync (not yet implemented for generic collections).",
  );
};

/** Delete a collection item by slug. */
export const deleteCollectionItem = async (
  key: string,
  slug: string,
): Promise<void> => {
  if (import.meta.env.DEV) {
    await fetch(
      `/__collection/${encodeURIComponent(key)}?slug=${encodeURIComponent(slug)}`,
      { method: "DELETE" },
    );
    return;
  }
  throw new Error(
    "Collection editing in production requires GitHub sync (not yet implemented for generic collections).",
  );
};
