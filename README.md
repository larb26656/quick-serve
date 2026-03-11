# q-serve

CLI tool for serving static files temporarily with auto-expiration and deletion. Built with Bun.

## Use Cases

- **AI Agent Result Sharing**: Allow AI agent to show result to you by serving generated files (images, screenshots, documents) temporarily. The AI can generate files and share them via q-serve for you to preview before saving permanently.

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
npm install -g .

# Or from GitHub
npm install -g https://github.com/larb26656/quick-serve
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
| `--port <number>` | Port to listen              | 3333    |
| `--timeout <sec>` | Session timeout in seconds  | 30      |
| `--open`          | Open browser after serving  | false   |
| `--server`        | Start server if not running | false   |
| `--config <path>` | Config file path            | -       |

## Configuration

### Config File

Create `q-serve.json` in your project directory, or use the global config:

```json
{
  "port": 3333,
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

Override config file settings:

```bash
export Q_SERVE_PORT=3333
export Q_SERVE_STORAGE=./q-storage
export Q_SERVE_DEFAULT_TIMEOUT=30
```

### Priority

CLI flags > Environment variables > Config file > Defaults

## Running as a Service (Linux/systemd)

To run q-serve as a background service on Linux using systemd:

### Create a Systemd Service File

Create `/etc/systemd/system/q-serve.service`:

```ini
[Unit]
Description=q-serve - Temporary file sharing server
After=network.target

[Service]
Type=simple
User=<your-user>
WorkingDirectory=/home/<your-user>
ExecStart=/usr/local/bin/q-serve server --port 3333
Restart=on-failure
RestartSec=5
Environment="Q_SERVE_PORT=3333"
Environment="Q_SERVE_STORAGE=/var/q-serve/storage"

[Install]
WantedBy=multi-user.target
```

### Create Storage Directory

```bash
sudo mkdir -p /var/q-serve/storage
sudo chown -R $USER:$USER /var/q-serve
```

### Enable and Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable q-serve
sudo systemctl start q-serve
```

### Check Status

```bash
sudo systemctl status q-serve
```

### View Logs

```bash
sudo journalctl -u q-serve -f
```

### Commands

| Action | Command |
|--------|---------|
| Start | `sudo systemctl start q-serve` |
| Stop | `sudo systemctl stop q-serve` |
| Restart | `sudo systemctl restart q-serve` |
| Enable on boot | `sudo systemctl enable q-serve` |
| Disable on boot | `sudo systemctl disable q-serve` |

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
🔗 http://localhost:3333/s/abc123xy
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
curl -F "file=@myfile.png" -F "timeout=60" http://localhost:3333/api/sessions

# List active sessions
curl http://localhost:3333/api/sessions

# Check server health
curl http://localhost:3333/api/health

# Delete a session
curl -X DELETE http://localhost:3333/api/sessions/<session-id>
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
