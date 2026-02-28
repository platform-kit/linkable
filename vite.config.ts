import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sanitizeModel, stableStringify } from "./src/lib/model";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFilePath = path.resolve(__dirname, "cms-data.json");
const defaultDataFilePath = path.resolve(__dirname, "default-data.json");
const publicDataFilePath = path.resolve(__dirname, "public/data.json");

const readDefaultModel = () => {
  if (!fs.existsSync(defaultDataFilePath)) {
    return sanitizeModel({});
  }

  const raw = fs.readFileSync(defaultDataFilePath, "utf8");
  return sanitizeModel(JSON.parse(raw));
};

const ensureSeedData = () => {
  const seed = readDefaultModel();
  const payload = stableStringify(seed);

  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, payload);
  }

  if (!fs.existsSync(publicDataFilePath)) {
    fs.writeFileSync(publicDataFilePath, payload);
  }
};

const collectRequestBody = async (req: NodeJS.ReadableStream) => {
  const chunks: Uint8Array[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Uint8Array);
  }

  return Buffer.concat(chunks).toString("utf8");
};

export default defineConfig(() => {
  ensureSeedData();

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [vue()],
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0];

        if (url !== "/cms-data") {
          next();
          return;
        }

        ensureSeedData();

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === "GET") {
          const payload = fs.readFileSync(dataFilePath, "utf8");
          res.setHeader("Content-Type", "application/json");
          res.end(payload);
          return;
        }

        if (req.method === "POST") {
          const body = await collectRequestBody(req);
          const parsed = sanitizeModel(body ? JSON.parse(body) : {});
          fs.writeFileSync(dataFilePath, stableStringify(parsed));
          res.statusCode = 204;
          res.end();
          return;
        }

        res.statusCode = 405;
        res.end("Method Not Allowed");
      });
    },
  };
});