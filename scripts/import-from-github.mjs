/**
 * import-from-github.mjs
 *
 * Fetches data.json and uploaded files from a GitHub repo at build time.
 * Configured via environment variables (see .env.example):
 *
 *   GITHUB_OWNER       – repo owner (user or org)
 *   GITHUB_REPO        – repo name
 *   GITHUB_TOKEN       – personal access token (fine-grained or classic)
 *   GITHUB_BRANCH      – branch to pull from (default: main)
 *   GITHUB_DATA_PATH   – path to data.json inside the repo (default: data.json)
 *   GITHUB_UPLOADS_DIR – path to uploads folder inside the repo (default: uploads)
 *   GITHUB_AUDIO_DIR    – path to audio folder inside the repo (default: audio)
 *   GITHUB_BLOG_DIR     – path to blog folder inside the repo (default: blog)
 *
 * Usage:
 *   node scripts/import-from-github.mjs
 *   # or via npm script:
 *   npm run import
 */

import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── helpers ──────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

/** Load .env file manually (no external deps) */
const loadEnv = async () => {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return;
  const { readFile } = await import("node:fs/promises");
  const text = await readFile(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
};

const ghFetch = async (url, token) => {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${url}\n${body}`);
  }
  return res;
};

// ── main ─────────────────────────────────────────────────────────────

const run = async () => {
  await loadEnv();

  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  const branch = process.env.GITHUB_BRANCH?.trim() || "main";
  const dataPath = process.env.GITHUB_DATA_PATH?.trim() || "data.json";
  const uploadsDir = process.env.GITHUB_UPLOADS_DIR?.trim() || "uploads";
  const audioDir = process.env.GITHUB_AUDIO_DIR?.trim() || "audio";
  const blogDir = process.env.GITHUB_BLOG_DIR?.trim() || "blog";

  if (!owner || !repo) {
    console.log(
      "⏭  GITHUB_OWNER / GITHUB_REPO not set — skipping remote import."
    );
    return;
  }

    console.log(`📥  Importing from ${owner}/${repo} (branch: ${branch})…`);

    // Fetch data.json from GitHub
    const dataUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dataPath}?ref=${branch}`;
    const dataRes = await ghFetch(dataUrl, token);
    const dataMeta = await dataRes.json();

  if (!dataMeta.content) {
    throw new Error(`Could not read ${dataPath} from repo — file may not exist.`);
  }

  const dataContent = Buffer.from(dataMeta.content, "base64").toString("utf8");
  const localDataPath = path.join(rootDir, "public", "content", "data.json");
  mkdirSync(path.dirname(localDataPath), { recursive: true });
  await writeFile(localDataPath, dataContent);
  console.log(`  ✔ data.json → public/content/data.json`);

  // Also write to cms-data.json so the CMS picks it up locally
  const localCmsPath = path.join(rootDir, "cms-data.json");
  await writeFile(localCmsPath, dataContent);
  console.log(`  ✔ data.json → cms-data.json`);

  // ── 2. Fetch uploads directory listing ─────────────────────────────

  const uploadsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${uploadsDir}?ref=${branch}`;
  let uploadFiles = [];
  try {
    const uploadsRes = await ghFetch(uploadsUrl, token);
    uploadFiles = await uploadsRes.json();
    if (!Array.isArray(uploadFiles)) uploadFiles = [];
  } catch (err) {
    // uploads dir may not exist — that's fine
    console.log(`  ⚠ No uploads directory found at ${uploadsDir} — skipping.`);
    uploadFiles = [];
  }

  if (uploadFiles.length === 0) {
    console.log(`  ⏭ No uploaded files to import.`);
  } else {
    const localUploadsDir = path.join(rootDir, "public", "content", "uploads");
    mkdirSync(localUploadsDir, { recursive: true });

    let count = 0;
    for (const file of uploadFiles) {
      if (file.type !== "file") continue;

      // Use download_url (raw) to avoid the 1MB base64 limit of the Contents API
      const rawUrl = file.download_url;
      if (!rawUrl) {
        console.log(`  ⚠ No download URL for ${file.name} — skipping.`);
        continue;
      }

      const rawRes = await fetch(rawUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!rawRes.ok) {
        console.log(`  ⚠ Failed to download ${file.name} (${rawRes.status}) — skipping.`);
        continue;
      }

      const buf = Buffer.from(await rawRes.arrayBuffer());
      const dest = path.join(localUploadsDir, file.name);
      await writeFile(dest, buf);
      count++;
    }

    console.log(`  ✔ ${count} uploaded file(s) → public/content/uploads/`);
  }

  // ── 3. Recursively fetch all files from /content ──────────────────
  const fetchContentRecursive = async (repoPath, localPath) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}?ref=${branch}`;
    let items = [];
    try {
      const res = await ghFetch(url, token);
      items = await res.json();
      if (!Array.isArray(items)) items = [];
    } catch (err) {
      return;
    }
    for (const item of items) {
      if (item.type === "file") {
        // Use download_url for raw files
        const rawUrl = item.download_url;
        if (!rawUrl) continue;
        const rawRes = await fetch(rawUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!rawRes.ok) continue;
        const buf = Buffer.from(await rawRes.arrayBuffer());
        const dest = path.join(localPath, item.name);
        mkdirSync(path.dirname(dest), { recursive: true });
        await writeFile(dest, buf);
      } else if (item.type === "dir") {
        const subLocal = path.join(localPath, item.name);
        await fetchContentRecursive(`${repoPath}/${item.name}`, subLocal);
      }
    }
  };

  const repoContentDir = "content";
  const localContentDir = path.join(rootDir, "content");
  await fetchContentRecursive(repoContentDir, localContentDir);
  console.log(`  ✔ All content files imported recursively → content/`);

  // ── 4. Fetch audio files ───────────────────────────────────────────

  const audioUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${audioDir}?ref=${branch}`;
  let audioFiles = [];
  try {
    const audioRes = await ghFetch(audioUrl, token);
    audioFiles = await audioRes.json();
    if (!Array.isArray(audioFiles)) audioFiles = [];
  } catch (err) {
    console.log(`  ⚠ No audio directory found at ${audioDir} — skipping.`);
    audioFiles = [];
  }

  if (audioFiles.length === 0) {
    console.log(`  ⏭ No audio files to import.`);
  } else {
    const localAudioDir = path.join(rootDir, "public", "content", "blog", "audio");
    mkdirSync(localAudioDir, { recursive: true });

    let count = 0;
    for (const file of audioFiles) {
      if (file.type !== "file") continue;

      // Use download_url (raw) to avoid the 1MB base64 limit of the Contents API
      const rawUrl = file.download_url;
      if (!rawUrl) {
        console.log(`  ⚠ No download URL for ${file.name} — skipping.`);
        continue;
      }

      const rawRes = await fetch(rawUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!rawRes.ok) {
        console.log(`  ⚠ Failed to download ${file.name} (${rawRes.status}) — skipping.`);
        continue;
      }

      const buf = Buffer.from(await rawRes.arrayBuffer());
      const dest = path.join(localAudioDir, file.name);
      await writeFile(dest, buf);
      count++;
    }

    console.log(`  ✔ ${count} audio file(s) → public/content/blog/audio/`);
  }

  console.log(`✅  Import complete.`);

  // ── 4. Install user theme dependencies ─────────────────────────────
  //   If GITHUB_CONTENT_DIR is set (pointing to the local content checkout),
  //   check for a package.json with dependencies and install them.
  //   Write a .user-deps.json marker so Vite can resolve the packages.
  const contentLocalDir = process.env.GITHUB_CONTENT_DIR?.trim();
  if (contentLocalDir && existsSync(path.join(contentLocalDir, "package.json"))) {
    console.log(`\n📦  Installing user theme dependencies…`);
    try {
      execSync("npm install --production", {
        cwd: contentLocalDir,
        stdio: "inherit",
      });
      const marker = {
        nodeModulesPath: path.join(contentLocalDir, "node_modules"),
        installedAt: new Date().toISOString(),
      };
      await writeFile(
        path.join(rootDir, ".user-deps.json"),
        JSON.stringify(marker, null, 2),
      );
      console.log(`  ✔ User deps installed — marker written to .user-deps.json`);
    } catch (err) {
      console.warn(`  ⚠ User dependency install failed: ${err.message}`);
    }
  }
};

await run().catch((err) => {
  console.error("❌  Import failed:", err.message);
  process.exit(1);
});
