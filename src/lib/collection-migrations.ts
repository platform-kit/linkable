/**
 * Collection-level content migration pipeline.
 *
 * Handles two types of transformations applied to each collection item:
 *
 * 1. **Imperative migrations** (version-gated, run once)
 *    Declared as `migrations` on the collection config. Each entry has
 *    a `toVersion` and a `transform` function. They run in ascending
 *    version order when the item's `_schemaVersion` is behind.
 *
 * 2. **Declarative reconciliation** (idempotent, always runs)
 *    - `fieldRenames`: moves values from old field names to new ones
 *    - `fieldDefaults`: fills in missing fields with default values
 *
 * The pipeline runs: imperative first, then declarative, then stamps
 * the item's `_schemaVersion` to the collection's current version.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface CollectionMigrationEntry {
  /** The version this migration upgrades TO. */
  toVersion: number;
  /** Transform function — mutates the item in-place and returns it. */
  transform: (item: Record<string, unknown>) => Record<string, unknown>;
}

export interface CollectionMigrationConfig {
  /** Current schema version for this collection. Default: 0 */
  version: number;
  /** Map of new field name → old field name. */
  fieldRenames: Record<string, string>;
  /** Map of field name → default value for missing fields. */
  fieldDefaults: Record<string, unknown>;
  /** Imperative migration entries, sorted ascending by toVersion. */
  migrations: CollectionMigrationEntry[];
}

// ── Pipeline ─────────────────────────────────────────────────────────

/**
 * Migrate a single collection item through the pipeline.
 * Returns `{ item, changed }` — `changed` is true if any field was
 * modified (caller can decide whether to write back to disk).
 */
export function migrateCollectionItem(
  item: Record<string, unknown>,
  config: CollectionMigrationConfig,
): { item: Record<string, unknown>; changed: boolean } {
  const originalJson = JSON.stringify(item);
  const currentVersion =
    typeof item._schemaVersion === "number" ? item._schemaVersion : 0;

  // 1. Imperative migrations (version-gated)
  let version = currentVersion;
  for (const m of config.migrations) {
    if (m.toVersion <= version) continue;
    if (m.toVersion > config.version) break;
    try {
      m.transform(item);
      version = m.toVersion;
    } catch (err) {
      console.warn(
        `[collection-migration] Migration to v${m.toVersion} failed:`,
        err,
      );
      break;
    }
  }

  // 2. Declarative reconciliation — field renames
  for (const [newName, oldName] of Object.entries(config.fieldRenames)) {
    if (oldName in item && !(newName in item)) {
      item[newName] = item[oldName];
      delete item[oldName];
    }
  }

  // 3. Declarative reconciliation — field defaults
  for (const [field, defaultValue] of Object.entries(config.fieldDefaults)) {
    if (!(field in item)) {
      item[field] = defaultValue;
    }
  }

  // 4. Stamp version
  if (config.version > 0) {
    item._schemaVersion = config.version;
  }

  const changed = JSON.stringify(item) !== originalJson;
  return { item, changed };
}
