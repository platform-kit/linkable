import type { BioModel } from "./model";
import { sanitizeModel, stableStringify } from "./model";

const DEV_ENDPOINT = "/cms-data";
const PROD_ENDPOINT = "/data.json";

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

export const persistModel = async (input: BioModel): Promise<void> => {
  if (!import.meta.env.DEV) {
    return;
  }

  const sanitized = sanitizeModel(input);
  await fetch(DEV_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stableStringify(sanitized),
  });
};