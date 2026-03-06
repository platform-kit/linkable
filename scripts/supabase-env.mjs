#!/usr/bin/env node
/**
 * Extract Supabase local dev credentials from `supabase status`
 * and upsert them into the project .env file.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");

// Run supabase status and capture output
let output;
try {
  output = execSync("npx supabase status -o env", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
} catch (err) {
  console.error("Failed to run `supabase status`. Is the local Supabase running? (`npm run supabase:start`)");
  process.exit(1);
}

// Parse key=value pairs from the env-formatted output
const envVars = {};
for (const line of output.split("\n")) {
  const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (match) envVars[match[1]] = match[2];
}

const apiUrl = envVars.API_URL;
const anonKey = envVars.ANON_KEY;

if (!apiUrl || !anonKey) {
  console.error("Could not parse API_URL or ANON_KEY from supabase status output.");
  console.error("Raw output:\n", output);
  process.exit(1);
}

// Read existing .env or start fresh
let env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf-8") : "";

/**
 * Set a key in the .env content string.
 * If the key already exists (even commented out with a value), replace it.
 * Otherwise append it.
 */
function upsert(content, key, value) {
  const re = new RegExp(`^#?\\s*${key}\\s*=.*$`, "m");
  const line = `${key}=${value}`;
  if (re.test(content)) {
    return content.replace(re, line);
  }
  // Append with a newline if needed
  const nl = content.endsWith("\n") ? "" : "\n";
  return content + nl + line + "\n";
}

env = upsert(env, "VITE_SUPABASE_URL", apiUrl);
env = upsert(env, "VITE_SUPABASE_ANON_KEY", anonKey);

writeFileSync(ENV_PATH, env, "utf-8");

console.log(`✓ Updated ${ENV_PATH}`);
console.log(`  VITE_SUPABASE_URL=${apiUrl}`);
console.log(`  VITE_SUPABASE_ANON_KEY=${anonKey}`);
