import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';

export interface Config {
  port: number;
  storage: string;
  defaultTimeout: number;
}

const DEFAULT_CONFIG: Config = {
  port: 3000,
  storage: './q-storage',
  defaultTimeout: 30,
};

export async function loadConfig(configPath?: string): Promise<Config> {
  let config = { ...DEFAULT_CONFIG };

  const locations = configPath
    ? [resolve(configPath)]
    : [
        resolve('./q-serve.json'),
        resolve(dirname(homedir()), 'q-serve.json'),
      ];

  for (const location of locations) {
    if (existsSync(location)) {
      try {
        const content = await readFile(location, 'utf-8');
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
  flags: { port?: number; storage?: string; defaultTimeout?: number }
): Config {
  return {
    ...config,
    ...(flags.port !== undefined && { port: flags.port }),
    ...(flags.storage !== undefined && { storage: flags.storage }),
    ...(flags.defaultTimeout !== undefined && { defaultTimeout: flags.defaultTimeout }),
  };
}
