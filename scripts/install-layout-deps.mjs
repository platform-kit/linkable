#!/usr/bin/env node
/**
 * install-layout-deps.mjs
 *
 * Scans src/themes/ and src/overrides/ for directories containing a
 * package.json, and installs their dependencies into local node_modules.
 *
 * This keeps theme- and user-specific dependencies declared in their own
 * package.json without needing a pnpm workspace setup.
 */
import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const root = process.cwd();
const themesDir = join(root, "src", "themes");
const overridesDir = join(root, "src", "overrides");

/** Collect dirs that have a package.json with missing deps. */
function collectDirsWithMissingDeps(dirs) {
  const result = [];
  for (const dir of dirs) {
    const pkgPath = join(dir, "package.json");
    if (!existsSync(pkgPath)) continue;

    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (Object.keys(deps).length === 0) continue;

    let hasMissing = false;
    for (const name of Object.keys(deps)) {
      const localInstalledPath = join(dir, "node_modules", name, "package.json");
      if (!existsSync(localInstalledPath)) {
        hasMissing = true;
        break;
      }
    }

    if (hasMissing) {
      result.push(dir);
    }
  }
  return result;
}

// Theme directories
const themeDirs = existsSync(themesDir)
  ? readdirSync(themesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(themesDir, d.name))
  : [];

// User overrides directory
const overrideDirs = existsSync(overridesDir) ? [overridesDir] : [];

const themePaths = collectDirsWithMissingDeps([...themeDirs, ...overrideDirs]);

if (themePaths.length === 0) {
  console.log("[theme-deps] All theme/override dependencies already installed.");
  process.exit(0);
}

const runInstall = (cmd) => {
  for (const themePath of themePaths) {
    console.log(`[theme-deps] Installing deps in ${themePath}`);
    execSync(cmd(themePath), { stdio: "inherit" });
  }
};

try {
  runInstall((layoutPath) => `npm install --prefix \"${layoutPath}\" --no-package-lock`);
} catch {
  execSync("pnpm --version", { stdio: "ignore" });
  runInstall((layoutPath) => `pnpm install --dir \"${layoutPath}\"`);
}
