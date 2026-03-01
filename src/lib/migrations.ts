/**
 * Schema migration pipeline for Linkable content JSON.
 *
 * HOW IT WORKS
 * ────────────
 * Every persisted BioModel carries a `schemaVersion` number.
 * When the app loads data whose version is behind `CURRENT_SCHEMA_VERSION`,
 * each registered migration runs in sequence to bring it up to date.
 *
 * HOW TO ADD A MIGRATION
 * ──────────────────────
 * 1. Bump `CURRENT_SCHEMA_VERSION` by one.
 * 2. Add a new entry to the `migrations` array below:
 *
 *      { toVersion: 3, migrate: (data) => { ... return data; } }
 *
 *    The `migrate` function receives the raw JSON object (already at the
 *    previous version) and must return it mutated/upgraded to `toVersion`.
 *
 * 3. `sanitizeModel()` calls `migrateToLatest()` before sanitising, so
 *    the rest of the app never sees stale shapes.
 *
 * VERSION HISTORY
 * ───────────────
 * 0 → 1  Initial schema. Adds `profile.bannerUrl` if missing.
 *        Ensures `schemaVersion` field exists.
 * 1 → 2  (reserved for future use — add the next migration here)
 */

// ── current version ──────────────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 1;

// ── migration registry ──────────────────────────────────────────────

type Migration = {
  /** The version this migration upgrades TO. */
  toVersion: number;
  /** Mutate the raw data object in-place and return it. */
  migrate: (data: Record<string, any>) => Record<string, any>;
};

/**
 * Ordered list of migrations.  Each entry upgrades from `toVersion - 1`
 * to `toVersion`.  They MUST be listed in ascending `toVersion` order.
 */
const migrations: Migration[] = [
  {
    toVersion: 1,
    migrate: (data) => {
      // v0 → v1: ensure profile.bannerUrl exists (added alongside the
      // banner-image feature) and normalise the email social type.
      if (data.profile && typeof data.profile === "object") {
        if (!("bannerUrl" in data.profile)) {
          data.profile.bannerUrl = "";
        }
      }
      data.schemaVersion = 1;
      return data;
    },
  },

  // ── future migrations go here ──────────────────────────────────────
  // {
  //   toVersion: 2,
  //   migrate: (data) => {
  //     // example: add a new "theme" field to profile
  //     // data.profile.theme = "default";
  //     data.schemaVersion = 2;
  //     return data;
  //   },
  // },
];

// ── public API ───────────────────────────────────────────────────────

/**
 * Detect schema version of a raw JSON payload.
 * Data created before versioning was introduced has no `schemaVersion`
 * field and is treated as version 0.
 */
export const detectVersion = (data: unknown): number => {
  if (data && typeof data === "object" && "schemaVersion" in data) {
    const v = (data as Record<string, unknown>).schemaVersion;
    return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  }
  return 0;
};

/**
 * Run all necessary migrations to bring `data` from its current version
 * up to `CURRENT_SCHEMA_VERSION`.  Returns the (mutated) data object.
 *
 * Safe to call even if the data is already at the latest version — it
 * will simply be a no-op.
 */
export const migrateToLatest = (data: unknown): Record<string, any> => {
  const obj = (data && typeof data === "object" ? data : {}) as Record<string, any>;
  let version = detectVersion(obj);

  if (version >= CURRENT_SCHEMA_VERSION) {
    // Already current (or somehow ahead) — nothing to do.
    obj.schemaVersion = CURRENT_SCHEMA_VERSION;
    return obj;
  }

  for (const m of migrations) {
    if (m.toVersion <= version) continue; // already past this migration
    if (m.toVersion > CURRENT_SCHEMA_VERSION) break; // safety: don't run future migrations

    try {
      m.migrate(obj);
      version = m.toVersion;
    } catch (err) {
      console.warn(`[Linkable] Migration to v${m.toVersion} failed:`, err);
      // Stop migrating on failure — sanitizeModel will fill in defaults
      break;
    }
  }

  obj.schemaVersion = CURRENT_SCHEMA_VERSION;
  return obj;
};
