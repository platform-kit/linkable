/**
 * Layout Variable Manifest
 *
 * Each layout can export a manifest describing custom CSS variables it uses.
 * These variables get:
 *   1. Registered as CSS custom properties on :root
 *   2. Displayed as editable fields in the CMS Theme panel
 *   3. Persisted in `theme.layoutVars` keyed by the CSS property name
 */

import type { FormKitSchemaNode } from "@formkit/core";
import type { Component } from "vue";
import type { ZodSchema } from "zod";

export type LayoutVarType = "color" | "text";

export interface LayoutVar {
  /** CSS custom property name, e.g. "--minimal-header-gradient-start" */
  cssVar: string;
  /** Human-readable label for the CMS editor */
  label: string;
  /** Editor type: "color" shows a color picker, "text" shows a text input */
  type: LayoutVarType;
  /** Default value when preset is "light" */
  defaultLight: string;
  /** Default value when preset is "dark" */
  defaultDark: string;
}

/**
 * A full top-level CMS tab contributed by the layout.
 *
 * Provide either `schema` (auto-rendered form) or `component` (custom Vue UI).
 * If both are provided, `component` takes precedence.
 *
 * Schema-driven tabs write to `layoutData[tab.key]`.
 * Component-driven tabs receive `modelValue` = `layoutData[tab.key]` and emit `update:modelValue`.
 */
export interface LayoutCmsTab {
  /** Unique key — used as the tab value and as the `layoutData` sub-key. Must not collide with built-in tabs. */
  key: string;
  /** Tab button label */
  label: string;
  /** PrimeIcons class for the tab icon (e.g. "pi-th-large") */
  icon: string;
  /** FormKit schema — platform auto-renders the form. Data stored at `layoutData[key]`. */
  schema?: FormKitSchemaNode[];
  /** Optional Zod validation for this tab's data slice */
  validation?: ZodSchema;
  /** Custom Vue component — replaces auto-generated form. Receives `modelValue` / emits `update:modelValue`. */
  component?: () => Promise<{ default: Component }>;
}

/**
 * A route contributed by a layout.
 *
 * Layout routes render a full-page component when the URL matches.
 * They are registered dynamically via `router.addRoute()` when their
 * layout is active and removed when the layout changes.
 */
export interface LayoutRoute {
  /** URL path (must start with `/`). Supports Vue Router params like `/projects/:slug`. */
  path: string;
  /** Async component factory for the page. */
  component: () => Promise<{ default: Component }>;
  /** Human-readable label — surfaced in navigation when provided. */
  label?: string;
  /** PrimeIcons class for an optional nav icon (e.g. "pi-briefcase"). */
  icon?: string;
  /** Optional Vue Router route meta. */
  meta?: Record<string, unknown>;
  /**
   * When set, a static HTML shell with OG meta tags is generated for this
   * route at build time so social crawlers and SEO bots can read it.
   * The page content is still rendered client-side.
   */
  prerender?: {
    /** Page title (used in `<title>` and `og:title`). */
    title: string;
    /** Meta description (used in `<meta name="description">` and `og:description`). */
    description?: string;
    /** OG image URL (absolute or root-relative). */
    ogImage?: string;
  };
}

/**
 * A content collection schema declared by a layout.
 *
 * Layouts declare which content collections they consume via `contentSchemas`.
 * Data for each collection lives in `model.collections[schema.key]`.
 * Multiple layouts can declare the same key — data survives layout switches.
 */
export interface ContentSchema {
  /** Collection key — used as the key in model.collections (e.g. "links", "gallery") */
  key: string;
  /** Human-visible label (e.g. "Links", "Gallery") */
  label: string;
  /** PrimeIcons class for CMS tab icon (e.g. "pi-link") */
  icon: string;
  /** Default enabled state for new users */
  defaultEnabled: boolean;
  /** Whether searchbar is available for this collection */
  searchable: boolean;
  /**
   * If true, collection holds a single data object (items[0]) instead of a list.
   * The CMS renders the editor directly instead of showing a list.
   */
  singleton?: boolean;
  /**
   * If true, items are stored externally (e.g. blog posts as Markdown files).
   * The collection entry in the model only holds metadata (enabled, label, etc.)
   * and items[] stays empty.
   */
  external?: boolean;

  // ── File-based collection fields ─────────────────────────────────
  /**
   * Directory where content files live, relative to project root.
   * When set, this collection is treated as a file-based collection
   * with automatic CRUD endpoints and build-time JSON generation.
   * Example: "content/projects"
   */
  directory?: string;
  /**
   * File format for file-based collections.
   * - "markdown": YAML frontmatter + body (like blog posts)
   * - "json": Single JSON object per file
   * - "yaml": Single YAML document per file
   * Defaults to "markdown" when directory is set.
   */
  format?: "markdown" | "json" | "yaml";
  /**
   * Which schema field to use for generating the filename/slug.
   * Defaults to "title". The value is slugified (lowercase, dashes).
   */
  slugField?: string;
  /**
   * Field name to sort by in list views and build output.
   * Defaults to "date" if the field exists, otherwise insertion order.
   */
  sortField?: string;
  /**
   * Sort direction. Defaults to "desc".
   */
  sortOrder?: "asc" | "desc";

  /**
   * FormKit schema for editing a single item (or the singleton object).
   * When provided, the CMS auto-renders this form in a drawer (list mode)
   * or inline (singleton mode).
   *
   * Can be a static array or a function that receives the current item
   * and returns the schema — useful for conditional fields.
   */
  itemSchema?: FormKitSchemaNode[] | ((item: Record<string, unknown>) => FormKitSchemaNode[]);
  /**
   * Custom Vue editor component — replaces auto-generated UI entirely.
   * Receives props: modelValue (collection data), model (full draft BioModel).
   * Emits: update:modelValue.
   */
  editorComponent?: () => Promise<{ default: Component }>;
  /**
   * Factory function that returns a new blank item with default field values.
   * Required for list collections that use itemSchema (so "Add" works).
   */
  newItem?: () => Record<string, unknown>;
  /**
   * Extract a short display label from an item for the list view.
   * Falls back to item.title or item.label or "Untitled".
   */
  itemLabel?: (item: any) => string;
  /**
   * Extract a subtitle / secondary text from an item for the list view.
   */
  itemSublabel?: (item: any) => string;
  /**
   * Extract a thumbnail URL from an item for the list view.
   */
  itemThumbnail?: (item: any) => string | undefined;
}

/**
 * Serializable subset of ContentSchema for file-based collections.
 * Injected at build time via Vite `define` so the server and build
 * plugins know which directories to scan and what format to use.
 * Functions and components are NOT included — only data.
 */
export interface ContentCollectionDef {
  key: string;
  label: string;
  directory: string;
  format: "markdown" | "json" | "yaml";
  slugField: string;
  sortField?: string;
  sortOrder: "asc" | "desc";
  /** Current schema version for items in this collection. */
  version: number;
  /** Recursively scan subdirectories for nested content. */
  recursive: boolean;
}

/**
 * @deprecated Use `PlatformKitConfig` from `./config` instead.
 * Kept as a backwards-compat alias — all UI/theme fields now live
 * on PlatformKitConfig so there is one unified config type.
 */

