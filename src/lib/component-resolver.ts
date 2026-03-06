/**
 * Component override resolver.
 *
 * Users can place Vue SFCs in `src/overrides/` to replace any default
 * user-facing component. The file name must match the component name exactly
 * (e.g. `src/overrides/ProfileHeader.vue` overrides `ProfileHeader`).
 *
 * Usage in App.vue:
 *   const ProfileHeader = useComponent('ProfileHeader', DefaultProfileHeader);
 *
 * At build time, Vite's `import.meta.glob` eagerly collects every `.vue` file
 * in `src/overrides/`. If a match exists, it is returned; otherwise the
 * built-in default component is used.
 */
import { type Component, defineAsyncComponent, shallowRef, type ShallowRef } from "vue";

const overrideModules = import.meta.glob<{ default: Component }>(
  "../overrides/**/*.vue",
);

/**
 * Resolve a component by name.
 * If `src/overrides/<name>.vue` exists, return it (async); otherwise return `fallback`.
 */
export function useComponent(name: string, fallback: Component): Component {
  const key = `../overrides/${name}.vue`;
  if (overrideModules[key]) {
    return defineAsyncComponent(overrideModules[key]);
  }
  return fallback;
}
