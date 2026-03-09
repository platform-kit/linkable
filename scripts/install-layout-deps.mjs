#!/usr/bin/env node
/**
 * install-layout-deps.mjs
 *
 * Scans src/themes/ for any theme directory containing a package.json,
 * and installs its dependencies into the root node_modules.
 *
 * This keeps theme-specific dependencies declared in their own package.json
 * without needing a pnpm workspace setup.
 */
import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const themesDir = join(process.cwd(), "src", "themes");

if (!existsSync(themesDir)) {
  process.exit(0);
}

const themes = readdirSync(themesDir, { withFileTypes: true }).filter((d) => d.isDirectory());

const themePaths = [];

for (const theme of themes) {
  const themePath = join(themesDir, theme.name);
  const pkgPath = join(themePath, "package.json");
  if (!existsSync(pkgPath)) continue;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (Object.keys(deps).length === 0) continue;

  let hasMissing = false;
  for (const name of Object.keys(deps)) {
    const localInstalledPath = join(themePath, "node_modules", name, "package.json");
    if (!existsSync(localInstalledPath)) {
      hasMissing = true;
      break;
    }
  }

  if (hasMissing) {
    themePaths.push(themePath);
  }
}

if (themePaths.length === 0) {
  console.log("[theme-deps] All theme dependencies already installed.");
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
