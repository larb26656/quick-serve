import { mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import {
  createSession,
  deleteSession,
  getSessionByKey,
  getSessionById,
  getAllSessions,
  getActiveSessionCount,
  setStoragePath,
} from './session.js';
import type { Config } from './config.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function getMimeType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function createServer(config: Config) {
  setStoragePath(config.storage);

  if (!existsSync(config.storage)) {
    await mkdir(config.storage, { recursive: true });
  }

  const baseUrl = `http://0.0.0.0:${config.port}`;

  const server = Bun.serve({
    port: config.port,
    hostname: '0.0.0.0',
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      if (pathname === '/api/health') {
        return Response.json({
          status: 'ok',
          uptime: process.uptime(),
          activeSessions: getActiveSessionCount(),
          storage: config.storage,
        });
      }

      if (pathname === '/api/sessions') {
        if (req.method === 'GET') {
          return Response.json({
            sessions: getAllSessions(baseUrl),
            storage: config.storage,
          });
        }

        if (req.method === 'POST') {
          const formData = await req.formData();
          const file = formData.get('file') as File | null;
          const timeoutStr = formData.get('timeout') as string | null;
          const timeout = timeoutStr ? parseInt(timeoutStr, 10) : config.defaultTimeout;

          if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
          }

          const tempPath = `/tmp/${Date.now()}-${file.name}`;
          const buffer = await file.arrayBuffer();
          await Bun.write(tempPath, buffer);

          const session = await createSession(
            tempPath,
            timeout,
            config.storage,
            baseUrl,
            file.name
          );

          return Response.json(
            {
              session,
              storage: config.storage,
            },
            { status: 201 }
          );
        }
      }

      const sessionDeleteMatch = pathname.match(/^\/api\/sessions\/([^\/]+)$/);
      if (sessionDeleteMatch && req.method === 'DELETE') {
        const id = sessionDeleteMatch[1];
        await deleteSession(id);
        return Response.json({ success: true });
      }

      const staticMatch = pathname.match(/^\/s\/([^\/]+)$/);
      if (staticMatch) {
        const key = staticMatch[1];
        const session = getSessionByKey(key);

        if (!session) {
          return Response.json(
            { error: 'Session not found or expired' },
            { status: 404 }
          );
        }

        const fileExists = existsSync(session.path);
        if (!fileExists) {
          return Response.json(
            { error: 'Session not found or expired' },
            { status: 404 }
          );
        }

        const fileStats = await stat(session.path);
        const expiresIn = Math.floor(
          (new Date(session.expiresAt).getTime() - Date.now()) / 1000
        );

        const file = await Bun.file(session.path).arrayBuffer();

        return new Response(file, {
          headers: {
            'Content-Type': getMimeType(session.filename),
            'Content-Length': fileStats.size.toString(),
            'X-Expires-In': expiresIn.toString(),
          },
        });
      }

      return Response.json({ error: 'Not found' }, { status: 404 });
    },
  });

  return server;
}
