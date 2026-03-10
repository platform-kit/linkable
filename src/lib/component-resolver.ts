/**
 * Component override & layout resolver.
 *
 * Resolution priority (highest → lowest):
 *   1. `src/overrides/<Name>.vue`          — user override
 *   2. `src/themes/<layout>/<Name>.vue`   — active theme variant
 *   3. fallback                            — default component
 *
 * User-provided themes live under `src/themes/user/<name>/` and are
 * discovered as layout name `user/<name>`.
 *
 * `layout` is a Ref<string> (e.g. `computed(() => model.theme.layout)`).
 * When the value changes the resolved component updates reactively.
 */
import { type Component, computed, defineAsyncComponent, type Ref, ref, watch, onScopeDispose, type ShallowRef, shallowRef } from "vue";
import type { LayoutManifest, LayoutRoute } from "./layout-manifest";
import type { BioTheme } from "./model";
import { THEME_PRESETS } from "./model";
import type { Router } from "vue-router";

const overrideModules = import.meta.glob<{ default: Component }>(
  "../overrides/*.vue",
);

const layoutModules = import.meta.glob<{ default: Component }>(
  "../themes/**/*.vue",
);

const manifestModules = import.meta.glob<{ default: LayoutManifest }>(
  "../themes/**/manifest.ts",
  { eager: true },
);

/**
 * List every layout name that ships at least one component override.
 * Always includes "default" even if no files exist under `src/themes/default/`.
 */
export function getAvailableLayouts(): string[] {
  const names = new Set<string>();
  for (const key of Object.keys(layoutModules)) {
    // Matches both "../themes/minimal/X.vue" and "../themes/user/bento/X.vue"
    const match = key.match(/^\.\.\/themes\/((?:user\/)?[^/]+)\//);
    if (match) names.add(match[1]);
  }
  return Array.from(names).sort();
}

/**
 * Resolve a component by name, respecting overrides → layout → fallback.
 *
 * @param name     Component name, e.g. "ProfileHeader"
 * @param fallback Default component from `src/components/`
 * @param layout   Reactive ref to the current layout name (e.g. "default", "minimal")
 */
export function useComponent(
  name: string,
  fallback: Component,
  layout?: Ref<string>,
): Component {
  // If no layout ref supplied, behave like the old static resolver
  if (!layout) {
    const overrideKey = `../overrides/${name}.vue`;
    if (overrideModules[overrideKey]) {
      return defineAsyncComponent(overrideModules[overrideKey]);
    }
    return fallback;
  }

  // Reactive: re-resolve whenever layout changes
  return computed(() => {
    // 1. User override wins first
    const overrideKey = `../overrides/${name}.vue`;
    if (overrideModules[overrideKey]) {
      return defineAsyncComponent(overrideModules[overrideKey]);
    }

    // 2. Theme variant (skip "default" — that's what fallback already is)
    const layoutName = layout.value;
    if (layoutName && layoutName !== "default") {
      const layoutKey = `../themes/${layoutName}/${name}.vue`;
      if (layoutModules[layoutKey]) {
        return defineAsyncComponent(layoutModules[layoutKey]);
      }
    }

    // 3. Fallback
    return fallback;
  }) as unknown as Component;
}

// ── User manifest override ──────────────────────────────────────────
const userManifestModules = import.meta.glob<{ default: Partial<LayoutManifest> }>(
  ["../overrides/manifest.ts", "../overrides/manifest.js"],
  { eager: true },
);
const userManifestOverride: Partial<LayoutManifest> | null =
  Object.values(userManifestModules)[0]?.default ?? null;

/**
 * Merge a user manifest override into a theme manifest.
 * - `contentSchemas` are union-merged by key (user wins on conflict).
 * - `routes` are concatenated.
 * - `cmsTabs` are union-merged by key.
 * - Other fields: user override wins if provided.
 */
function mergeManifests(base: LayoutManifest, override: Partial<LayoutManifest>): LayoutManifest {
  const merged = { ...base };

  // Merge contentSchemas: user schemas added, existing keys overridden
  if (override.contentSchemas) {
    const existing = new Map((base.contentSchemas ?? []).map((s) => [s.key, s]));
    for (const s of override.contentSchemas) {
      existing.set(s.key, s);
    }
    merged.contentSchemas = Array.from(existing.values());
  }

  // Merge routes: concatenate
  if (override.routes) {
    merged.routes = [...(base.routes ?? []), ...override.routes];
  }

  // Merge cmsTabs: union by key
  if (override.cmsTabs) {
    const existingTabs = new Map((base.cmsTabs ?? []).map((t) => [t.key, t]));
    for (const t of override.cmsTabs) {
      existingTabs.set(t.key, t);
    }
    merged.cmsTabs = Array.from(existingTabs.values());
  }

  // Merge vars: concatenate (dedupe by cssVar)
  if (override.vars) {
    const existingVars = new Map((base.vars ?? []).map((v) => [v.cssVar, v]));
    for (const v of override.vars) {
      existingVars.set(v.cssVar, v);
    }
    merged.vars = Array.from(existingVars.values());
  }

  return merged;
}

/**
 * Get the variable manifest for a layout, or null if none exists.
 * Merges user manifest overrides from `src/overrides/manifest.ts` if present.
 */
export function getLayoutManifest(layoutName: string): LayoutManifest | null {
  const key = `../themes/${layoutName}/manifest.ts`;
  const mod = manifestModules[key];
  const base = mod?.default ?? null;
  if (!base) return userManifestOverride ? (userManifestOverride as LayoutManifest) : null;
  if (!userManifestOverride) return base;
  return mergeManifests(base, userManifestOverride);
}

/**
 * Get the theme presets for a layout.
 *
 * Returns the preset record from the layout's manifest, falling back
 * to THEME_PRESETS (generic light/dark) if the layout has no manifest
 * or declares no presets.
 */
export function getLayoutPresets(layoutName: string): Record<string, () => BioTheme> {
  const manifest = getLayoutManifest(layoutName);
  if (manifest?.presets && Object.keys(manifest.presets).length > 0) {
    return manifest.presets;
  }
  return THEME_PRESETS;
}

/** Internal route-name prefix to identify layout-contributed routes. */
const LAYOUT_ROUTE_PREFIX = "__layout_route__";

/**
 * Composable that registers / unregisters layout-contributed routes when
 * the active layout changes.
 *
 * Returns a reactive ref of the currently registered `LayoutRoute[]` entries
 * (useful for rendering nav links).
 *
 * Must be called inside a Vue setup scope.
 */
export function useLayoutRoutes(
  router: Router,
  layout: Ref<string>,
): ShallowRef<LayoutRoute[]> {
  const activeRoutes = shallowRef<LayoutRoute[]>([]);
  let registeredNames: string[] = [];

  const removeOldRoutes = () => {
    for (const name of registeredNames) {
      router.removeRoute(name);
    }
    registeredNames = [];
  };

  const addNewRoutes = (routes: LayoutRoute[]) => {
    const names: string[] = [];
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      const name = `${LAYOUT_ROUTE_PREFIX}${i}_${r.path}`;
      router.addRoute({
        path: r.path,
        name,
        component: defineAsyncComponent(r.component),
        meta: { ...(r.meta ?? {}), layoutRoute: true },
      });
      names.push(name);
    }
    registeredNames = names;
  };

  const rematchCurrentLocationIfNeeded = async () => {
    // Initial navigation can happen before dynamic layout routes are added.
    // Wait for router readiness, then re-resolve current URL against the
    // updated matcher so deep links like /about can render immediately.
    await router.isReady();

    const fullPath = router.currentRoute.value.fullPath;
    const currentMatched = router.currentRoute.value.matched.length;
    const resolvedMatched = router.resolve(fullPath).matched.length;

    if (currentMatched === 0 && resolvedMatched > 0) {
      void router.replace(fullPath).catch(() => {
        // Ignore redundant-navigation and transient route-sync failures.
      });
    }
  };

  watch(
    layout,
    (layoutName) => {
      removeOldRoutes();

      const manifest = getLayoutManifest(layoutName);
      const routes = manifest?.routes ?? [];
      if (routes.length > 0) {
        addNewRoutes(routes);
        void rematchCurrentLocationIfNeeded();
      }
      activeRoutes.value = routes;
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    removeOldRoutes();
  });

  return activeRoutes;
}

/**
 * Check whether the current route was contributed by a layout.
 */
export function isLayoutRoute(route: { name?: string | symbol | null | undefined }): boolean {
  return typeof route.name === "string" && route.name.startsWith(LAYOUT_ROUTE_PREFIX);
}
