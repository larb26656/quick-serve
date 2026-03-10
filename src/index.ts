#!/usr/bin/env bun
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, basename } from 'path';
import { spawn } from 'child_process';
import inquirer from 'inquirer';
import { loadConfig, mergeCliFlags, type Config } from './config.js';
import { createServer } from './server.js';

interface CliFlags {
  port?: number;
  config?: string;
  timeout?: number;
  open?: boolean;
  server?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): { command: string; path?: string; flags: CliFlags } {
  const flags: CliFlags = {};
  const remaining: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' && i + 1 < args.length) {
      flags.port = parseInt(args[++i], 10);
    } else if (arg === '--config' && i + 1 < args.length) {
      flags.config = args[++i];
    } else if (arg === '--timeout' && i + 1 < args.length) {
      flags.timeout = parseInt(args[++i], 10);
    } else if (arg === '--open') {
      flags.open = true;
    } else if (arg === '--server') {
      flags.server = true;
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (!arg.startsWith('-')) {
      remaining.push(arg);
    }
  }

  const command = remaining[0] || 'help';
  const path = remaining[1];

  return { command, path, flags };
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
  port: number
): Promise<void> {
  const fileContent = await readFile(filePath);
  const filename = basename(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileContent]), filename);
  formData.append('timeout', timeout.toString());

  const response = await fetch(`http://localhost:${port}/api/sessions`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  const data = await response.json();
  const session = data.session;

  console.log(`\n🔗 ${session.url}`);
  console.log(`⏰ Expires in ${timeout}s`);

  if (flags.open) {
    console.log(`🌐 Opening browser...`);
    spawn('xdg-open', [session.url], { detached: true, stdio: 'ignore' }).unref();
  }
}

async function promptForOptions(
  useServer: boolean,
  config: Config
): Promise<{ timeout: number; port: number }> {
  const questions = [];

  questions.push({
    type: 'input',
    name: 'timeout',
    message: 'Session timeout (seconds):',
    default: config.defaultTimeout.toString(),
    validate: (input: string) => {
      const num = parseInt(input, 10);
      return !isNaN(num) && num > 0;
    },
  });

  if (useServer) {
    questions.push({
      type: 'input',
      name: 'port',
      message: 'Server port:',
      default: config.port.toString(),
      validate: (input: string) => {
        const num = parseInt(input, 10);
        return !isNaN(num) && num > 0 && num < 65536;
      },
    });
  }

  const answers = await inquirer.prompt(questions);
  return {
    timeout: parseInt(answers.timeout, 10),
    port: useServer ? parseInt(answers.port, 10) : config.port,
  };
}

async function startServer(config: Config): Promise<void> {
  const server = await createServer(config);
  console.log(`Server running on http://0.0.0.0:${server.port}`);
  console.log(`Storage: ${config.storage}`);
  console.log(`Press Ctrl+C to stop`);

  process.stdin.resume();
}

let flags: CliFlags = {};

async function main() {
  const args = process.argv.slice(2);
  const { command, path, flags: parsedFlags } = parseArgs(args);
  flags = parsedFlags;

  if (flags.help) {
    printHelp();
    return;
  }

  let config = await loadConfig(flags.config);
  config = mergeCliFlags(config, {
    port: flags.port,
    defaultTimeout: flags.timeout,
  });

  if (command === 'server') {
    await startServer(config);
    return;
  }

  if (!path) {
    printHelp();
    return;
  }

  const filePath = resolve(path);
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const isRunning = await checkServerRunning(config.port);

  if (!isRunning) {
    if (flags.server) {
      console.log(`Starting server on port ${config.port}...`);
      await startServer(config);
    } else {
      console.error(
        `Error: Server not running on port ${config.port}`
      );
      console.error(
        `Use --server to start server or --port to specify different port`
      );
      process.exit(1);
    }
  }

  let timeout = flags.timeout ?? config.defaultTimeout;

  if (!flags.timeout) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'timeout',
        message: 'Session timeout (seconds):',
        default: timeout.toString(),
        validate: (input: string) => {
          const num = parseInt(input, 10);
          return !isNaN(num) && num > 0;
        },
      },
    ]);
    timeout = parseInt(answers.timeout, 10);
  }

  await uploadFile(filePath, timeout, config.port);
}

function printHelp() {
  console.log(`
q-serve - CLI tool for serving static files temporarily

Usage:
  q-serve server [options]     Start the server
  q-serve <path> [options]     Serve a file or directory

Options:
  --port <number>    Port to listen (default: 3000)
  --timeout <sec>   Session timeout in seconds (default: 30)
  --open            Open browser after serving
  --server          Start server if not running
  --config <path>   Config file path
  --help, -h        Show this help message

Config file locations (in order of priority):
  1. ./q-serve.json (project directory)
  2. ~/.q-serve.json (home directory)

Environment variables (override config):
  Q_SERVE_PORT, Q_SERVE_STORAGE, Q_SERVE_DEFAULT_TIMEOUT
`);
}

main().catch(console.error);
