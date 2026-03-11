import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { resolve } from "path";
import {
  createSession,
  deleteSession,
  getSessionByKey,
  getSessionById,
  getAllSessions,
  getActiveSessionCount,
  setStoragePath,
  clearAllSessions,
} from "../src/session";

const TEST_DIR = resolve(".test-session-temp");
const TEST_STORAGE = resolve(TEST_DIR, "storage");

describe("session", () => {
  beforeEach(() => {
    clearAllSessions();
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    const testFile = resolve(TEST_DIR, "test.txt");
    writeFileSync(testFile, "test content");
    const testHtml = resolve(TEST_DIR, "test.html");
    writeFileSync(testHtml, "<html></html>");
    const testPng = resolve(TEST_DIR, "test.png");
    writeFileSync(testPng, "fake png");
    const testXyz = resolve(TEST_DIR, "test.xyz");
    writeFileSync(testXyz, "fake content");
    setStoragePath(TEST_STORAGE);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("getFileType", () => {
    it("classifies web files correctly", async () => {
      const session = await createSession(
        resolve(TEST_DIR, "test.html"),
        30,
        TEST_STORAGE,
        "http://localhost:3333",
        "test.html"
      );
      expect(session.type).toBe("web");
    });

    it("classifies image files correctly", async () => {
      const session = await createSession(
        resolve(TEST_DIR, "test.png"),
        30,
        TEST_STORAGE,
        "http://localhost:3333",
        "test.png"
      );
      expect(session.type).toBe("image");
    });

    it("classifies text files correctly", async () => {
      const session = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333",
        "test.txt"
      );
      expect(session.type).toBe("text");
    });

    it("classifies other files correctly", async () => {
      const session = await createSession(
        resolve(TEST_DIR, "test.xyz"),
        30,
        TEST_STORAGE,
        "http://localhost:3333",
        "test.xyz"
      );
      expect(session.type).toBe("other");
    });
  });

  describe("createSession", () => {
    it("creates a session with correct properties", async () => {
      const session = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333",
        "test.txt"
      );

      expect(session.id).toBeDefined();
      expect(session.key).toBeDefined();
      expect(session.key.length).toBe(8);
      expect(session.filename).toBe("test.txt");
      expect(session.type).toBe("text");
      expect(session.createdAt).toBeDefined();
      expect(session.expiresAt).toBeDefined();
      expect(session.url).toBe("http://localhost:3333/s/" + session.key);
    });

    it("stores file in correct location", async () => {
      const session = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333",
        "test.txt"
      );

      const storedFile = resolve(TEST_STORAGE, session.id, "test.txt");
      expect(existsSync(storedFile)).toBe(true);
    });

    it("generates unique keys", async () => {
      const session1 = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333"
      );
      const session2 = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333"
      );

      expect(session1.key).not.toBe(session2.key);
    });
  });

  describe("getSessionByKey", () => {
    it("returns session when key is valid", async () => {
      const created = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333"
      );
      const retrieved = getSessionByKey(created.key);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("returns null for invalid key", () => {
      const session = getSessionByKey("invalid");
      expect(session).toBeNull();
    });
  });

  describe("getSessionById", () => {
    it("returns session when id is valid", async () => {
      const created = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333"
      );
      const retrieved = getSessionById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.key).toBe(created.key);
    });

    it("returns null for invalid id", () => {
      const session = getSessionById("invalid-id");
      expect(session).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("removes session from memory", async () => {
      const created = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333"
      );
      await deleteSession(created.id);

      const retrieved = getSessionById(created.id);
      expect(retrieved).toBeNull();
    });

    it("clears timer and removes from key lookup", async () => {
      const created = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333"
      );
      await deleteSession(created.id);

      const retrieved = getSessionByKey(created.key);
      expect(retrieved).toBeNull();
    });

    it("removes file from storage", async () => {
      const created = await createSession(
        resolve(TEST_DIR, "test.txt"),
        30,
        TEST_STORAGE,
        "http://localhost:3333"
      );
      await deleteSession(created.id);

      const sessionDir = resolve(TEST_STORAGE, created.id);
      expect(existsSync(sessionDir)).toBe(false);
    });
  });

  describe("getAllSessions", () => {
    it("returns all active sessions", async () => {
      await createSession(resolve(TEST_DIR, "test.txt"), 30, TEST_STORAGE, "http://localhost:3333");
      await createSession(resolve(TEST_DIR, "test.html"), 30, TEST_STORAGE, "http://localhost:3333");

      const sessions = getAllSessions("http://localhost:3333");
      expect(sessions.length).toBe(2);
    });
  });

  describe("getActiveSessionCount", () => {
    it("returns correct count", async () => {
      expect(getActiveSessionCount()).toBe(0);

      await createSession(resolve(TEST_DIR, "test.txt"), 30, TEST_STORAGE, "http://localhost:3333");
      expect(getActiveSessionCount()).toBe(1);

      await createSession(resolve(TEST_DIR, "test.html"), 30, TEST_STORAGE, "http://localhost:3333");
      expect(getActiveSessionCount()).toBe(2);
    });
  });
});
