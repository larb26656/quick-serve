# q-serve

CLI tool for serving static files temporarily with auto-expiration and deletion. Built with Bun.

## Features

- Temporary file sharing with automatic expiration
- In-memory session management (like Redis)
- RESTful API for session management
- Auto-cleanup when sessions expire
- Interactive CLI prompts
- Configuration via file, environment variables, or CLI flags

### Development

```bash
bun install
```

## Quick Start

## Installation

### Global (recommended)

```bash
# From local directory
bun install -g .

# Or from GitHub
bun install -g https://github.com/larb26656/quick-serve
```

Then use `q-serve` from anywhere:

### Start the Server

```bash
q-serve server
```

Or use npm scripts:

```bash
bun run serve
```

### Serve a File

```bash
q-serve ./myfile.png
```

### With Options

```bash
q-serve ./myfile.png --timeout 60 --open
```

```bash
q-serve ./myfile.png
q-serve server
```

## Usage

### CLI Commands

```bash
q-serve
# Start server server [options]

# Serve a file or directory
q-serve <path> [options]
```

### Options

| Flag              | Description                 | Default |
| ----------------- | --------------------------- | ------- |
| `--port <number>` | Port to listen              | 3000    |
| `--timeout <sec>` | Session timeout in seconds  | 30      |
| `--open`          | Open browser after serving  | false   |
| `--server`        | Start server if not running | false   |
| `--config <path>` | Config file path            | -       |

## Configuration

### Config File

Create `q-serve.json` in your project directory or home directory:

```json
{
  "port": 3000,
  "storage": "./q-storage",
  "defaultTimeout": 30
}
```

Config file locations (in order of priority):

1. `./q-serve.json` (project directory)
2. `~/.q-serve.json` (home directory)

### Environment Variables

Override config file settings:

```bash
export Q_SERVE_PORT=3000
export Q_SERVE_STORAGE=./q-storage
export Q_SERVE_DEFAULT_TIMEOUT=30
```

### Priority

CLI flags > Environment variables > Config file > Defaults

## API Endpoints

### Health Check

```bash
GET /api/health
```

### Create Session

```bash
POST /api/sessions
Content-Type: multipart/form-data

file: <binary file>
timeout: <number> (optional, seconds)
```

### List Sessions

```bash
GET /api/sessions
```

### Delete Session

```bash
DELETE /api/sessions/:id
```

### Access File

```bash
GET /s/:key
```

## Tutorial

### Basic Usage

1. Start the server:

```bash
bun run serve
```

2. In another terminal, serve a file:

```bash
q-serve ./image.png
```

You'll see output like:

```
🔗 http://localhost:3000/s/abc123xy
⏰ Expires in 30s
```

3. Open the URL in your browser to view the file

### Using --server Flag

Automatically start the server if not running:

```bash
q-serve ./document.pdf --server --timeout 120
```

### Using --open Flag

Automatically open browser after serving:

```bash
q-serve ./screenshot.png --open
```

### Interactive Mode

Run without flags to be prompted for options:

```bash
q-serve ./file.txt
```

You'll be asked for:

- Session timeout (seconds)

### Programmatic Usage

You can also use the API directly:

```bash
# Upload file
curl -F "file=@myfile.png" -F "timeout=60" http://localhost:3000/api/sessions

# List active sessions
curl http://localhost:3000/api/sessions

# Check server health
curl http://localhost:3000/api/health

# Delete a session
curl -X DELETE http://localhost:3000/api/sessions/<session-id>
```

## File Type Detection

| Extension                                        | Type  |
| ------------------------------------------------ | ----- |
| `.html`, `.htm`                                  | web   |
| `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp` | image |
| `.txt`, `.json`, `.md`, `.css`, `.js`            | text  |
| Others                                           | other |

## Architecture

```
┌─────────────────────────────────────────────┐
│  CLI (q-serve)                             │
│  ├── server subcommand (start server)      │
│  └── <path> (serve file/folder)            │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Server (Bun.serve)                         │
│  ├── REST API (session management)         │
│  ├── Static file serving (/s/:key)         │
│  └── In-memory session storage + cleanup   │
└─────────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
bun install

# Run server
bun run serve

# Run in development mode
bun run dev

# Run tests
bun test
```

## License

MIT
