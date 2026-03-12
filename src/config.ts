import { readFile, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

export interface Config {
  port: number;
  bind: string;
  hostname: string;
  storage: string;
  defaultTimeout: number;
}

const GLOBAL_CONFIG_DIR = resolve(homedir(), ".q-serve");
const GLOBAL_CONFIG_PATH = resolve(GLOBAL_CONFIG_DIR, "q-serve.json");
const GLOBAL_STORAGE_PATH = resolve(GLOBAL_CONFIG_DIR, "storage");

const DEFAULT_CONFIG: Config = {
  port: 3333,
  bind: "0.0.0.0",
  hostname: "",
  storage: GLOBAL_STORAGE_PATH,
  defaultTimeout: 30,
};

async function ensureGlobalConfig(): Promise<void> {
  if (!existsSync(GLOBAL_CONFIG_DIR)) {
    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(GLOBAL_CONFIG_PATH)) {
    const defaultContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
    await writeFile(GLOBAL_CONFIG_PATH, defaultContent, "utf-8");
  }
}

export async function loadConfig(configPath?: string): Promise<Config> {
  await ensureGlobalConfig();

  let config = { ...DEFAULT_CONFIG };

  const locations = configPath
    ? [resolve(configPath)]
    : [resolve("./q-serve.json"), GLOBAL_CONFIG_PATH];

  for (const location of locations) {
    if (existsSync(location)) {
      try {
        const content = await readFile(location, "utf-8");
        const parsed = JSON.parse(content);
        config = { ...config, ...parsed };
      } catch {
        // Ignore invalid config files
      }
    }
  }

  if (process.env.Q_SERVE_PORT) {
    config.port = parseInt(process.env.Q_SERVE_PORT, 10);
  }
  if (process.env.Q_SERVE_BIND) {
    config.bind = process.env.Q_SERVE_BIND;
  }
  if (process.env.Q_SERVE_HOSTNAME) {
    config.hostname = process.env.Q_SERVE_HOSTNAME;
  }
  if (process.env.Q_SERVE_STORAGE) {
    config.storage = process.env.Q_SERVE_STORAGE;
  }
  if (process.env.Q_SERVE_DEFAULT_TIMEOUT) {
    config.defaultTimeout = parseInt(process.env.Q_SERVE_DEFAULT_TIMEOUT, 10);
  }

  return config;
}

export function mergeCliFlags(
  config: Config,
  flags: { port?: number; bind?: string; hostname?: string; storage?: string; defaultTimeout?: number },
): Config {
  return {
    ...config,
    ...(flags.port !== undefined && { port: flags.port }),
    ...(flags.bind !== undefined && { bind: flags.bind }),
    ...(flags.hostname !== undefined && { hostname: flags.hostname }),
    ...(flags.storage !== undefined && { storage: flags.storage }),
    ...(flags.defaultTimeout !== undefined && {
      defaultTimeout: flags.defaultTimeout,
    }),
  };
}

export function getBaseUrl(config: Config): string {
  if (config.hostname) {
    return config.hostname;
  }
  return `http://${config.bind}:${config.port}`;
}
