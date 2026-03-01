import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

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

type GitCommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type GitCommandError = Error &
  GitCommandResult;

const runGitCommand = (args: string[]): Promise<GitCommandResult> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, {
      cwd: __dirname,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      const result: GitCommandResult = {
        code: code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };

      if (result.code === 0) {
        resolve(result);
        return;
      }

      const error = new Error(`git ${args.join(" ")} exited with code ${result.code}`) as GitCommandError;
      error.code = result.code;
      error.stdout = result.stdout;
      error.stderr = result.stderr;
      reject(error);
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
};

const isGitCommandError = (error: unknown): error is GitCommandError => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Partial<GitCommandError>;
  return (
    typeof candidate.code === "number" &&
    typeof candidate.stdout === "string" &&
    typeof candidate.stderr === "string"
  );
};

const nothingToCommit = (error: GitCommandError) => {
  const combined = `${error.stdout}\n${error.stderr}`.toLowerCase();
  return error.code === 1 && combined.includes("nothing to commit");
};

const sanitizeCommitMessage = (input?: string) => {
  const fallback = "Update CMS data";
  if (!input) return fallback;
  const normalized = input
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u0019]/g, "")
    .trim();
  if (!normalized) return fallback;
  return normalized.slice(0, 140);
};

const asResultPayload = (result?: GitCommandResult | null) =>
  result
    ? {
        code: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
      }
    : undefined;

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

        if (url === "/cms-git") {
          if (server.config.mode !== "development") {
            res.statusCode = 403;
            res.end("Forbidden");
            return;
          }

          ensureSeedData();

          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          try {
            const body = await collectRequestBody(req);
            let parsed: { message?: string } = {};
            if (body) {
              parsed = JSON.parse(body) as { message?: string };
            }

            const commitMessage = sanitizeCommitMessage(parsed.message);

            const addResult = await runGitCommand(["add", "cms-data.json", "public/data.json"]);

            let commitResult: GitCommandResult | null = null;
            try {
              commitResult = await runGitCommand(["commit", "-m", commitMessage]);
            } catch (error) {
              if (isGitCommandError(error) && nothingToCommit(error)) {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    status: "noop",
                    message: "Nothing to commit.",
                    commit: asResultPayload({
                      code: error.code,
                      stdout: error.stdout,
                      stderr: error.stderr,
                    }),
                  }),
                );
                return;
              }
              throw error;
            }

            const pushResult = await runGitCommand(["push"]);
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                status: "ok",
                message: commitMessage,
                add: asResultPayload(addResult),
                commit: asResultPayload(commitResult),
                push: asResultPayload(pushResult),
              }),
            );
          } catch (error) {
            res.statusCode = 500;
            if (isGitCommandError(error)) {
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  status: "error",
                  message: error.message,
                  code: error.code,
                  stdout: error.stdout,
                  stderr: error.stderr,
                }),
              );
              return;
            }

            const message = error instanceof Error ? error.message : "Unknown error.";
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                status: "error",
                message,
              }),
            );
          }

          return;
        }

        if (url === "/cms-data") {
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
          return;
        }

        next();
      });
    },
  };
});