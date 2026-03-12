#!/usr/bin/env bun
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, basename } from "path";
import { openBrowser } from "./browser";
import { Command } from "commander";
import { loadConfig, mergeCliFlags, type Config } from "./config.js";
import { createServer } from "./server.js";

interface CliOptions {
  port?: number;
  bind?: string;
  hostname?: string;
  config?: string;
  timeout?: number;
  open?: boolean;
  server?: boolean;
}

async function checkServerRunning(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function uploadFile(
  filePath: string,
  timeout: number,
  port: number,
  open: boolean,
): Promise<void> {
  const fileContent = await readFile(filePath);
  const filename = basename(filePath);

  const formData = new FormData();
  formData.append("file", new Blob([fileContent]), filename);
  formData.append("timeout", timeout.toString());

  const response = await fetch(`http://localhost:${port}/api/sessions`, {
    method: "POST",
    body: formData,
  });

  let data: any;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to upload file");
  }

  const session = data.session;

  console.log(`\n🔗 ${session.url}`);
  console.log(`⏰ Expires in ${timeout}s`);

  if (open) {
    console.log(`🌐 Opening browser...`);
    openBrowser(session.url);
  }
}

async function startServer(config: Config): Promise<void> {
  await createServer(config);
  console.log(`Press Ctrl+C to stop`);

  process.stdin.resume();
}

async function serveFile(
  filePath: string,
  config: Config,
  options: CliOptions,
): Promise<void> {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const port = options.port ?? config.port;
  const isRunning = await checkServerRunning(port);

  if (!isRunning) {
    if (options.server) {
      console.log(`Starting server on port ${port}...`);
      const serverConfig = { ...config, port };
      await startServer(serverConfig);
      return;
    } else {
      console.error(`Error: Server not running on port ${port}`);
      console.error(
        `Use --server to start server or --port to specify different port`,
      );
      process.exit(1);
    }
  }

  const timeout = options.timeout ?? config.defaultTimeout;
  await uploadFile(filePath, timeout, port, options.open ?? false);
}

async function main() {
  const program = new Command();

  program
    .name("q-serve")
    .description("CLI tool for serving static files temporarily")
    .version("1.0.0");

  program
    .command("server")
    .description("Start the server")
    .option("-p, --port <number>", "Port to listen", "3333")
    .option("-b, --bind <ip>", "Bind IP (0.0.0.0 or 127.0.0.1)", "0.0.0.0")
    .option("-n, --hostname <url>", "Public URL (e.g., https://www.example.com)")
    .option("-c, --config <path>", "Config file path")
    .action(async (options) => {
      const configOptions = {
        port: options.port ? parseInt(options.port, 10) : undefined,
        bind: options.bind,
        hostname: options.hostname,
        config: options.config,
      };

      let config = await loadConfig(configOptions.config);
      config = mergeCliFlags(config, { 
        port: configOptions.port, 
        bind: configOptions.bind,
        hostname: configOptions.hostname 
      });
      await startServer(config);
    });

  program
    .argument("<path>", "File or directory to serve")
    .option("-t, --timeout <seconds>", "Session timeout in seconds", "30")
    .option("-o, --open", "Open browser after serving")
    .option("-s, --server", "Start server if not running")
    .option("-p, --port <number>", "Server port", "3333")
    .option("-b, --bind <ip>", "Bind IP (0.0.0.0 or 127.0.0.1)", "0.0.0.0")
    .option("-n, --hostname <url>", "Public URL (e.g., https://www.example.com)")
    .option("-c, --config <path>", "Config file path")
    .action(async (path: string, options) => {
      const configOptions = {
        port: options.port ? parseInt(options.port, 10) : undefined,
        bind: options.bind,
        hostname: options.hostname,
        timeout: options.timeout ? parseInt(options.timeout, 10) : undefined,
        config: options.config,
      };

      let config = await loadConfig(configOptions.config);
      config = mergeCliFlags(config, {
        port: configOptions.port,
        bind: configOptions.bind,
        hostname: configOptions.hostname,
        defaultTimeout: configOptions.timeout,
      });

      const filePath = resolve(path);
      await serveFile(filePath, config, {
        port: configOptions.port,
        timeout: configOptions.timeout,
        open: options.open,
        server: options.server,
      });
    });

  program.parse();
}

main().catch(console.error);
