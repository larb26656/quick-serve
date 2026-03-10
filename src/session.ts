import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, extname } from 'path';

export interface Session {
  id: string;
  key: string;
  path: string;
  filename: string;
  type: 'web' | 'image' | 'text' | 'other';
  createdAt: string;
  expiresAt: string;
  url: string;
}

interface SessionWithTimer extends Session {
  timer: Timer;
}

const sessions = new Map<string, SessionWithTimer>();
const keyToId = new Map<string, string>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 8; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function getFileType(filename: string): 'web' | 'image' | 'text' | 'other' {
  const ext = extname(filename).toLowerCase();
  const webExts = ['.html', '.htm'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
  const textExts = ['.txt', '.json', '.md', '.css', '.js', '.ts', '.jsx', '.tsx'];

  if (webExts.includes(ext)) return 'web';
  if (imageExts.includes(ext)) return 'image';
  if (textExts.includes(ext)) return 'text';
  return 'other';
}

export async function createSession(
  filePath: string,
  timeout: number,
  storage: string,
  baseUrl: string,
  originalFilename?: string
): Promise<Session> {
  const id = generateId();
  let key = generateKey();

  while (keyToId.has(key)) {
    key = generateKey();
  }

  const filename = originalFilename || basename(filePath);
  const type = getFileType(filename);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + timeout * 1000);

  const sessionDir = `${storage}/${id}`;
  await mkdir(sessionDir, { recursive: true });
  const destPath = `${sessionDir}/${filename}`;

  const fileContent = await readFile(filePath);
  await writeFile(destPath, fileContent);

  const session: Session = {
    id,
    key,
    path: destPath,
    filename,
    type,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    url: `${baseUrl}/s/${key}`,
  };

  const timer = setTimeout(async () => {
    await deleteSession(id);
  }, timeout * 1000);

  const sessionWithTimer: SessionWithTimer = { ...session, timer };
  sessions.set(id, sessionWithTimer);
  keyToId.set(key, id);

  return session;
}

export async function deleteSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) return;

  clearTimeout(session.timer);
  sessions.delete(id);
  keyToId.delete(session.key);

  try {
    await rm(`${storage}/${id}`, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

let storage = './q-storage';

export function setStoragePath(path: string): void {
  storage = path;
}

export function getSessionByKey(key: string): Session | null {
  const id = keyToId.get(key);
  if (!id) return null;

  const session = sessions.get(id);
  if (!session) return null;

  const now = new Date();
  if (new Date(session.expiresAt) < now) {
    deleteSession(id);
    return null;
  }

  const { timer, ...cleanSession } = session;
  return cleanSession;
}

export function getSessionById(id: string): Session | null {
  const session = sessions.get(id);
  if (!session) return null;

  const now = new Date();
  if (new Date(session.expiresAt) < now) {
    deleteSession(id);
    return null;
  }

  const { timer, ...cleanSession } = session;
  return cleanSession;
}

export function getAllSessions(baseUrl: string): Session[] {
  const now = new Date();
  const activeSessions: Session[] = [];

  for (const [id, session] of sessions) {
    if (new Date(session.expiresAt) >= now) {
      const { timer, ...cleanSession } = session;
      activeSessions.push({
        ...cleanSession,
        url: `${baseUrl}/s/${session.key}`,
      });
    } else {
      deleteSession(id);
    }
  }

  return activeSessions;
}

export function getActiveSessionCount(): number {
  return sessions.size;
}
