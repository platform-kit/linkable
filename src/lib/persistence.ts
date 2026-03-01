import type { BioModel } from "./model";
import { sanitizeModel, stableStringify } from "./model";
import { canUseGithubSync, pushCmsDataToGithub } from "./github";

// use a unique path that won't collide with Vite's internal module
// handling for JSON files. `/cms-data` was being rewritten by the server, so
// fetching it returned a JS module rather than raw JSON.
const DEV_ENDPOINT = "/__cms-data";
const PROD_ENDPOINT = "/data.json";

export type PersistResult = "dev" | "github" | "skipped";

export const fetchModel = async (): Promise<BioModel> => {
  const endpoint = import.meta.env.DEV ? DEV_ENDPOINT : PROD_ENDPOINT;
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    cache: import.meta.env.DEV ? "no-store" : "default",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CMS data: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return sanitizeModel(payload);
};

export const persistModel = async (input: BioModel): Promise<PersistResult> => {
  const sanitized = sanitizeModel(input);
  const serialized = stableStringify(sanitized);

  if (import.meta.env.DEV) {
    // development writes to local server endpoint
    await fetch(DEV_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: serialized,
    });
    return "dev";
  }

  // production: defer actual GitHub commit, store in localStorage until user triggers commit
  try {
    const storage = window.localStorage;
    storage.setItem("pending-cms", serialized);
  } catch {
    // ignore if storage unavailable
  }
  return "dev"; // still treat as dev so UI doesn't think it's synced
};