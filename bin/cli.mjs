#!/usr/bin/env node

/**
 * Linkable CLI
 *
 * Commands:
 *   npx linkable serve ./my-content        Serve using your content
 *   npx linkable build ./my-content        Build a static site with your content
 *   npx linkable ./my-content              Alias for serve (default)
 *   npx linkable --help                    Show help
 *
 * The content directory should contain:
 *   data.json     — your Linkable CMS data
 *   uploads/      — (optional) uploaded images
 */

import { createServer } from "node:http";
import {
  readFileSync,
  existsSync,
  statSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

// ── CLI arg parsing ──────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`
  Linkable — design-forward link-in-bio sites

  Commands:
    linkable serve <content-dir>     Serve your site locally
    linkable build <content-dir>     Build a static site into ./dist

  Options:
    --port, -p <port>    Port for serve (default: 3000)
    --out, -o <dir>      Output directory for build (default: ./dist)
    --help, -h           Show this help

  The content directory should contain:
    data.json     Your CMS content (exported from Linkable)
    uploads/      Optional folder with uploaded images

  Examples:
    npx linkable serve ./my-site
    npx linkable build ./my-site
    npx linkable build ./my-site --out ./public
    npx linkable ./my-site                        (defaults to serve)
`);
  process.exit(0);
}

// Determine command
let command = "serve"; // default
let positionalArgs = [];
let port = 3000;
let outDir = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (i === 0 && (arg === "serve" || arg === "build")) {
    command = arg;
  } else if ((arg === "--port" || arg === "-p") && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    if (isNaN(port)) {
      console.error(`❌  Invalid port: ${args[i + 1]}`);
      process.exit(1);
    }
    i++;
  } else if ((arg === "--out" || arg === "-o") && args[i + 1]) {
    outDir = path.resolve(args[i + 1]);
    i++;
  } else if (!arg.startsWith("-")) {
    positionalArgs.push(arg);
  }
}

const contentDir = positionalArgs[0] ? path.resolve(positionalArgs[0]) : null;

// ── Resolve content ──────────────────────────────────────────────────

const resolveContent = () => {
  let userDataJson = null;
  let userUploadsDir = null;

  if (contentDir) {
    if (!existsSync(contentDir) || !statSync(contentDir).isDirectory()) {
      console.error(`❌  Content directory not found: ${contentDir}`);
      process.exit(1);
    }

    const dataFile = path.join(contentDir, "data.json");
    if (existsSync(dataFile)) {
      userDataJson = readFileSync(dataFile, "utf8");
      console.log(`  ✔ Using data.json from ${contentDir}`);
    } else {
      console.warn(`  ⚠ No data.json found in ${contentDir} — using default content.`);
    }

    const uploadsPath = path.join(contentDir, "uploads");
    if (existsSync(uploadsPath) && statSync(uploadsPath).isDirectory()) {
      userUploadsDir = uploadsPath;
      const count = readdirSync(uploadsPath).filter((f) => !f.startsWith(".")).length;
      console.log(`  ✔ Found ${count} uploaded file(s) in ${uploadsPath}`);
    }
  } else {
    console.log("  ℹ No content directory specified — using default content.");
  }

  return { userDataJson, userUploadsDir };
};

// ── Recursive copy helper ────────────────────────────────────────────

const copyDirSync = (src, dest) => {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
};

// ── BUILD command ────────────────────────────────────────────────────

const runBuild = () => {
  console.log(`\n🔨  Building Linkable site…\n`);

  // The npm package ships a pre-built dist/ — no need to run Vite.
  // We just copy dist/ to the output folder and inject user content.
  const prebuiltDist = path.join(packageRoot, "dist");
  if (!existsSync(prebuiltDist)) {
    console.error(
      "❌  Pre-built app not found in package. If running from source, run `npm run build` first."
    );
    process.exit(1);
  }

  const buildOutDir = outDir || path.resolve("dist");

  // Copy the pre-built app to the output directory
  console.log(`  ⏳ Copying app to ${buildOutDir}…`);
  copyDirSync(prebuiltDist, buildOutDir);
  console.log(`  ✔ Copied pre-built app`);

  // Overlay user content
  const { userDataJson, userUploadsDir } = resolveContent();

  if (userDataJson) {
    writeFileSync(path.join(buildOutDir, "data.json"), userDataJson);
    console.log(`  ✔ Injected data.json`);
  }

  if (userUploadsDir) {
    const destUploads = path.join(buildOutDir, "uploads");
    mkdirSync(destUploads, { recursive: true });
    const files = readdirSync(userUploadsDir).filter((f) => {
      const full = path.join(userUploadsDir, f);
      return statSync(full).isFile() && !f.startsWith(".");
    });
    for (const file of files) {
      copyFileSync(path.join(userUploadsDir, file), path.join(destUploads, file));
    }
    console.log(`  ✔ Copied ${files.length} upload(s)`);
  }

  console.log(`\n✅  Built to ${buildOutDir}`);
  console.log(`    Deploy this folder to any static host (Vercel, Netlify, etc.)\n`);
};

// ── SERVE command ────────────────────────────────────────────────────

const runServe = () => {
  const distDir = path.resolve(packageRoot, "dist");

  if (!existsSync(distDir)) {
    console.error(
      "❌  Built app not found. Run `linkable build` first, or `npm run build`."
    );
    process.exit(1);
  }

  const { userDataJson, userUploadsDir } = resolveContent();

  // ── MIME types ──────────────────────────────────────────────────────

  const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
  };

  const getMime = (fp) => MIME_TYPES[path.extname(fp).toLowerCase()] || "application/octet-stream";

  const serveFile = (res, fp) => {
    if (!existsSync(fp) || !statSync(fp).isFile()) return false;
    const content = readFileSync(fp);
    res.writeHead(200, { "Content-Type": getMime(fp) });
    res.end(content);
    return true;
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    let pathname = decodeURIComponent(url.pathname);

    // Override /data.json with user content
    if (pathname === "/data.json" && userDataJson) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(userDataJson);
      return;
    }

    // Serve user uploads
    if (pathname.startsWith("/uploads/") && userUploadsDir) {
      const fileName = pathname.slice("/uploads/".length);
      if (!fileName.includes("..") && !fileName.includes("\\")) {
        const filePath = path.join(userUploadsDir, fileName);
        if (serveFile(res, filePath)) return;
      }
    }

    // Serve from dist
    let filePath = path.join(distDir, pathname);
    if (serveFile(res, filePath)) return;

    if (pathname.endsWith("/")) {
      filePath = path.join(distDir, pathname, "index.html");
      if (serveFile(res, filePath)) return;
    }

    // SPA fallback
    const indexPath = path.join(distDir, "index.html");
    if (serveFile(res, indexPath)) return;

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  server.listen(port, () => {
    console.log(`\n  🔗 Linkable is running at http://localhost:${port}\n`);
  });
};

// ── Dispatch ─────────────────────────────────────────────────────────

if (command === "build") {
  runBuild();
} else {
  runServe();
}