---
name: q-serve
description: CLI tool for serving static files temporarily with auto-expiration and deletion. Use this skill when users want to share files temporarily, run a temporary file server, or need quick file sharing with expiration.
---

# q-serve

CLI tool for serving static files temporarily with auto-expiration and deletion. Built with Bun.

## When to Use This Skill

Use this skill when the user:

- Wants to serve a file temporarily
- Needs to share a file with automatic expiration
- Wants a quick local file server
- Needs to test file uploads or downloads
- Wants to share files via URL with timeout
- Requests to generate a shareable/temporary link for a file

## Key Features

- Temporary file sharing with automatic expiration
- In-memory session management
- RESTful API for session management
- Auto-cleanup when sessions expire
- Cross-platform browser opening (macOS, Windows, Linux)
- Configuration via file, environment variables, or CLI flags

## Common Tasks

### Start the Server

```bash
q-serve server
```

### Serve a File

```bash
q-serve ./myfile.png
```

### With Options

```bash
q-serve ./myfile.png --timeout 60 --open
```

### Serve with Server Auto-start

```bash
q-serve ./document.pdf --server --timeout 120
```

## Configuration

### Config File (`q-serve.json`)

```json
{
  "port": 3000,
  "storage": "./q-storage",
  "defaultTimeout": 30
}
```

Config file locations (in order of priority):

1. `--config <path>` (custom path)
2. `./q-serve.json` (project directory)
3. `~/.q-serve/q-serve.json` (home directory)

On first run, a global config is automatically created at `~/.q-serve/q-serve.json` with default values.

### Environment Variables

```bash
export Q_SERVE_PORT=3000
export Q_SERVE_STORAGE=./q-storage
export Q_SERVE_DEFAULT_TIMEOUT=30
```

### Priority

CLI flags > Environment variables > Config file > Defaults

## Usage Guidelines

- **Do not use `--open` or `-o` option unless the user explicitly requests it**
- Only use `--open` when the user specifically asks to open the browser automatically

## CLI Options

| Flag              | Description                 | Default |
| ----------------- | --------------------------- | ------- |
| `--port <number>` | Port to listen              | 3000    |
| `--timeout <sec>` | Session timeout in seconds  | 30      |
| `--open`          | Open browser after serving  | false   |
| `--server`        | Start server if not running | false   |
| `--config <path>` | Config file path            | -       |

## API Endpoints

| Method | Endpoint          | Description    |
| ------ | ----------------- | -------------- |
| GET    | /api/health       | Health check   |
| POST   | /api/sessions     | Create session |
| GET    | /api/sessions     | List sessions  |
| DELETE | /api/sessions/:id | Delete session |
| GET    | /s/:key           | Access file    |
