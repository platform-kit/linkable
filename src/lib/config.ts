// ── PlatformKit Configuration ──────────────────────────────────────────
// Users drop a `platformkit.config.js` (or `.ts`) at their project /
// content root. The config is loaded at Vite-config time and steers
// site identity, RSS feeds, dev-server defaults, and build behaviour.

/** A single RSS feed definition. */
export interface RssFeedConfig {
  /** Output file path relative to public/ (default: "rss.xml") */
  output?: string;
  /** Feed title — falls back to site name */
  title?: string;
  /** Feed description — falls back to site tagline */
  description?: string;
  /** BCP-47 language code (default: "en") */
  language?: string;
  /** Only include posts whose file path matches this regex */
  pathFilter?: string;
  /** Only include posts whose raw markdown body matches this regex */
  contentFilter?: string;
  /** Only include posts carrying at least one of these tags */
  tags?: string[];
}

export interface PlatformKitConfig {
  /** Site identity — used in RSS, PWA manifest, OG meta fallbacks. */
  site?: {
    /** Display name (default: profile.displayName from CMS data) */
    name?: string;
    /** One-line tagline / description */
    tagline?: string;
    /** Canonical site URL (default: VITE_SITE_URL env var) */
    url?: string;
    /** BCP-47 language code (default: "en") */
    language?: string;
  };

  /** RSS feed generation. */
  rss?: {
    /** Master toggle — set false to skip RSS entirely (default: true) */
    enabled?: boolean;
    /**
     * One or more named feeds. Each feed can filter posts by path regex,
     * content regex, or tag list. When omitted a single default feed at
     * `/rss.xml` is generated containing all published posts.
     */
    feeds?: RssFeedConfig[];
  };

  /** Dev-server defaults (overridden by CLI flags). */
  server?: {
    host?: string;
    port?: number;
  };

  /** Build-time options. */
  build?: {
    /** Enable Puppeteer pre-rendering (default: false) */
    prerender?: boolean;
    /** Strip items outside their schedule window at build time */
    scheduleExclude?: boolean;
  };
}

/**
 * Identity helper for type-safe config files:
 * ```ts
 * import { defineConfig } from "./src/lib/config";
 * export default defineConfig({ site: { name: "My Site" } });
 * ```
 */
export function defineConfig(config: PlatformKitConfig): PlatformKitConfig {
  return config;
}
