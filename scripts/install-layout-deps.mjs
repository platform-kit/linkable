#!/usr/bin/env node
/**
 * install-layout-deps.mjs
 *
 * Scans src/layouts/ for any layout directory containing a package.json,
 * and installs its dependencies into the root node_modules.
 *
 * This keeps layout-specific dependencies declared in their own package.json
 * without needing a pnpm workspace setup.
 */
import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const layoutsDir = join(process.cwd(), "src", "layouts");

if (!existsSync(layoutsDir)) {
  process.exit(0);
}

const layouts = readdirSync(layoutsDir, { withFileTypes: true }).filter((d) => d.isDirectory());

const layoutPaths = [];

for (const layout of layouts) {
  const layoutPath = join(layoutsDir, layout.name);
  const pkgPath = join(layoutPath, "package.json");
  if (!existsSync(pkgPath)) continue;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (Object.keys(deps).length === 0) continue;

  let hasMissing = false;
  for (const name of Object.keys(deps)) {
    const localInstalledPath = join(layoutPath, "node_modules", name, "package.json");
    if (!existsSync(localInstalledPath)) {
      hasMissing = true;
      break;
    }
  }

  if (hasMissing) {
    layoutPaths.push(layoutPath);
  }
}

if (layoutPaths.length === 0) {
  console.log("[layout-deps] All layout dependencies already installed.");
  process.exit(0);
}

const runInstall = (cmd) => {
  for (const layoutPath of layoutPaths) {
    console.log(`[layout-deps] Installing deps in ${layoutPath}`);
    execSync(cmd(layoutPath), { stdio: "inherit" });
  }
};

try {
  runInstall((layoutPath) => `npm install --prefix \"${layoutPath}\" --no-package-lock`);
} catch {
  execSync("pnpm --version", { stdio: "ignore" });
  runInstall((layoutPath) => `pnpm install --dir \"${layoutPath}\"`);
}
