import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { homedir } from "os";
import { loadConfig, mergeCliFlags } from "../src/config";
import { chdir } from "process";

const TEST_DIR = resolve(".test-temp");
const GLOBAL_CONFIG_DIR = resolve(homedir(), ".q-serve");
let originalDir: string;

describe("loadConfig", () => {
  beforeEach(() => {
    originalDir = process.cwd();
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    if (existsSync(GLOBAL_CONFIG_DIR)) {
      rmSync(GLOBAL_CONFIG_DIR, { recursive: true, force: true });
    }
    delete process.env.Q_SERVE_PORT;
    delete process.env.Q_SERVE_STORAGE;
    delete process.env.Q_SERVE_DEFAULT_TIMEOUT;
  });

  afterEach(() => {
    chdir(originalDir);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("returns default config when no config file exists", async () => {
    const config = await loadConfig();
    expect(config.port).toBe(3333);
    expect(config.storage).toContain(".q-serve");
    expect(config.defaultTimeout).toBe(30);
  });

  it("loads config from project directory", async () => {
    chdir(TEST_DIR);
    const configPath = resolve(TEST_DIR, "q-serve.json");
    writeFileSync(configPath, JSON.stringify({ port: 4000, defaultTimeout: 60 }), "utf-8");
    
    const config = await loadConfig(configPath);
    expect(config.port).toBe(4000);
    expect(config.defaultTimeout).toBe(60);
  });

  it("environment variables override config file", async () => {
    const configPath = resolve(TEST_DIR, "q-serve.json");
    writeFileSync(configPath, JSON.stringify({ port: 4000 }), "utf-8");
    process.env.Q_SERVE_PORT = "5000";

    const config = await loadConfig(configPath);
    expect(config.port).toBe(5000);

    delete process.env.Q_SERVE_PORT;
  });

  it("accepts custom config path", async () => {
    const customConfigPath = resolve(TEST_DIR, "custom.json");
    writeFileSync(customConfigPath, JSON.stringify({ port: 6000 }), "utf-8");

    const config = await loadConfig(customConfigPath);
    expect(config.port).toBe(6000);
  });

  it("ignores invalid JSON in config file", async () => {
    chdir(TEST_DIR);
    const configPath = resolve(TEST_DIR, "q-serve.json");
    writeFileSync(configPath, "invalid json", "utf-8");

    const config = await loadConfig();
    expect(config.port).toBe(3333);
  });
});

describe("mergeCliFlags", () => {
  const baseConfig = {
    port: 3333,
    storage: "./storage",
    defaultTimeout: 30,
  };

  it("merges only provided CLI flags", () => {
    const result = mergeCliFlags(baseConfig, { port: 4000 });
    expect(result.port).toBe(4000);
    expect(result.storage).toBe("./storage");
    expect(result.defaultTimeout).toBe(30);
  });

  it("overrides multiple flags", () => {
    const result = mergeCliFlags(baseConfig, {
      port: 4000,
      defaultTimeout: 60,
    });
    expect(result.port).toBe(4000);
    expect(result.defaultTimeout).toBe(60);
  });

  it("returns original config when no flags provided", () => {
    const result = mergeCliFlags(baseConfig, {});
    expect(result).toEqual(baseConfig);
  });
});
