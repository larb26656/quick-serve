import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { Elysia, t, file } from "elysia";
import {
  createSession,
  deleteSession,
  getSessionByKey,
  getAllSessions,
  getActiveSessionCount,
  setStoragePath,
} from "./session.js";
import type { Config } from "./config.js";
import { resolve } from "path";

export async function createServer(config: Config) {
  setStoragePath(config.storage);

  if (!existsSync(config.storage)) {
    await mkdir(config.storage, { recursive: true });
  }

  const baseUrl = `http://0.0.0.0:${config.port}`;

  const app = new Elysia()
    .get("/api/health", () => ({
      status: "ok",
      uptime: process.uptime(),
      activeSessions: getActiveSessionCount(),
      storage: config.storage,
    }))
    .get("/api/sessions", () => ({
      sessions: getAllSessions(baseUrl),
      storage: config.storage,
    }))
    .post(
      "/api/sessions",
      async ({ body: { file }, status }) => {
        // const timeoutStr =
        const timeout = config.defaultTimeout;

        if (!file) {
          return new Response(JSON.stringify({ error: "No file provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const tempPath = `/tmp/${Date.now()}-${file.name}`;
        const buffer = await file.arrayBuffer();
        await Bun.write(tempPath, buffer);

        const session = await createSession(
          tempPath,
          timeout,
          config.storage,
          baseUrl,
          file.name,
        );

        return status(201, { session, storage: config.storage });
      },
      {
        body: t.Object({
          file: t.File(),
        }),
      },
    )
    .delete("/api/sessions/:id", async ({ params: { id } }) => {
      await deleteSession(id);
      return { success: true };
    })
    .get("/s/:key", async ({ params: { key }, status, set }) => {
      const session = getSessionByKey(key);

      if (!session) {
        return status(404, { message: "Session not found or expired" });
      }

      const fileExists = existsSync(session.path);
      if (!fileExists) {
        return status(404, { message: "Session not found or expired" });
      }

      const expiresIn = Math.floor(
        (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
      );

      set.headers["x-expires-in"] = expiresIn.toString();

      const path = resolve(session.path);
      return file(path);
    })
    .onError(({ error, code }) => {
      if (code === "NOT_FOUND")
        return {
          message: "Not found",
          error,
        };
    });

  const server = app.listen(config.port, () => {
    console.log(`Server running on http://0.0.0.0:${config.port}`);
    console.log(`Storage: ${config.storage}`);
  });

  return server;
}
