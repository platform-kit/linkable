import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const cmsDataPath = path.join(rootDir, "cms-data.json");
const defaultDataPath = path.join(rootDir, "default-data.json");
const publicDataPath = path.join(rootDir, "public/data.json");

const ensureCmsData = async () => {
  if (existsSync(cmsDataPath)) {
    return;
  }

  if (existsSync(defaultDataPath)) {
    const seed = await readFile(defaultDataPath, "utf8");
    await writeFile(cmsDataPath, seed);
    return;
  }

  const fallback = JSON.stringify(
    {
      profile: { displayName: "", tagline: "", avatarUrl: "" },
      links: [],
      socials: [],
    },
    null,
    2
  );

  await writeFile(cmsDataPath, fallback);
};

const run = async () => {
  await ensureCmsData();

  const source = await readFile(cmsDataPath, "utf8");
  const parsed = JSON.parse(source);
  const formatted = JSON.stringify(parsed, null, 2);

  await writeFile(cmsDataPath, formatted);
  await writeFile(publicDataPath, formatted);

  console.log("Exported CMS data to public/data.json");
};

await run();