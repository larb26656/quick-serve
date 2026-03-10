# SPEC.md - q-serve

## 1. Overview

A CLI tool for serving static files temporarily with auto-expiration and deletion. Built with Bun.

## 2. Architecture

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
│  ├── Static file serving (/s/:key)          │
│  └── In-memory session storage + cleanup   │
└─────────────────────────────────────────────┘
```

## 3. Configuration

### Config File Location
- `./q-serve.json` (project directory)
- `~/.q-serve.json` (home directory)

### Config Schema
```json
{
  "port": 3000,
  "storage": "./q-storage",
  "defaultTimeout": 30
}
```

### Environment Variables (Override config)
- `Q_SERVE_PORT`
- `Q_SERVE_STORAGE`
- `Q_SERVE_DEFAULT_TIMEOUT`

### Priority
CLI flags > Env variables > Config file > Defaults

## 4. CLI Commands

### Start Server
```bash
q-serve server [options]

Options:
  --port <number>    Port to listen (default: 3000)
  --config <path>   Config file path
```

### Serve File/Folder
```bash
q-serve <path> [options]

Arguments:
  <path>            File or directory to serve

Options:
  --timeout <sec>  Session timeout in seconds (default: 30)
  --open           Open browser after serving
  --server         Start server if not running
  --port <number>  Server port (default: 3000)
  --config <path>  Config file path
```

### Interactive Mode (inquirer)
When running without flags, prompts for:
- Session timeout
- Server port (if --server flag used)
- Storage path (if --server flag used)

## 5. Session

### Session Structure
```typescript
interface Session {
  id: string;          // UUID v4
  key: string;         // Random 8 characters
  path: string;        // Absolute file path on server
  filename: string;    // Original filename
  type: 'web' | 'image' | 'text' | 'other';
  createdAt: string;   // ISO timestamp
  expiresAt: string;   // ISO timestamp
  url: string;         // Full URL to access
}
```

### In-Memory Storage
```typescript
// Like Redis - in-memory Map with auto-cleanup
const sessions = new Map<string, Session & { timer: Timer }>()

// Auto-cleanup on expiration
setTimeout(() => {
  deleteSession(id)
  deleteFileFromDisk(path)
}, expiresIn)
```

### Type Detection
| Extension | Type |
|-----------|------|
| `.html`, `.htm` | `web` |
| `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp` | `image` |
| `.txt`, `.json`, `.md`, `.css`, `.js` | `text` |
| Others | `other` |

## 6. API Endpoints

### POST /api/sessions
Create new session (upload file)

**Request:**
```
POST /api/sessions
Content-Type: multipart/form-data

file: <binary file>
timeout: <number> (optional, seconds)
```

**Response (201):**
```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "key": "abc123xy",
    "type": "image",
    "filename": "image.png",
    "expiresAt": "2026-03-10T12:00:30.000Z",
    "url": "http://localhost:3000/s/abc123xy"
  },
  "storage": "./q-storage"
}
```

### GET /api/sessions
List active sessions

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "key": "abc123xy",
      "type": "image",
      "filename": "image.png",
      "expiresAt": "2026-03-10T12:00:30.000Z",
      "url": "http://localhost:3000/s/abc123xy"
    }
  ],
  "storage": "./q-storage"
}
```

### DELETE /api/sessions/:id
Delete session (force delete)

**Response (200):**
```json
{
  "success": true
}
```

### GET /s/:key
Access session file

- If session expired → 404
- If session not found → 404
- If valid → serve file with correct MIME type
- Header: `X-Expires-In: <seconds>`

**Response (404):**
```json
{
  "error": "Session not found or expired"
}
```

### GET /api/health
Health check

**Response (200):**
```json
{
  "status": "ok",
  "uptime": 12345,
  "activeSessions": 5,
  "storage": "./q-storage"
}
```

## 7. URL Structure

```
http://<host>:<port>/s/<key>
```

Examples:
- `http://localhost:3000/s/abc123xy`
- `http://192.168.1.100:3000/s/abc123xy`

## 8. CLI Output

### Serve File
```
$ q-serve ./image.png

🔗 http://localhost:3000/s/abc123xy
⏰ Expires in 30s
```

### With --open
```
$ q-serve ./image.png --open

🔗 http://localhost:3000/s/abc123xy
⏰ Expires in 30s
🌐 Opening browser...
```

### Server Not Running
```
$ q-serve ./image.png

Error: Server not running on port 3000
Use --server to start server or --port to specify different port
```

### Start Server
```
$ q-serve server

Server running on http://0.0.0.0:3000
Storage: ./q-storage
```

## 9. Error Handling

| Error | Response |
|-------|----------|
| Server not running | CLI error with instructions |
| File not found | CLI error |
| Session expired | 404 Not Found |
| Port in use | CLI error |
| Invalid config | CLI error |

## 10. Storage

- Files stored in: `./q-storage/` (or configured path)
- Directory structure: `{storage}/{session_id}/{filename}`
- Cleanup: Delete session directory when expired

## 11. Security

- Server binds to `0.0.0.0` (all interfaces)
- No authentication (for internal use)
- Random session keys (8 chars, 36^8 combinations)

## 12. Dependencies

```json
{
  "dependencies": {
    "bun": ">=1.0",
    "inquirer": "^9.0"
  }
}
```

## 13. Defaults

| Option | Default |
|--------|---------|
| Port | 3000 |
| Timeout | 30 seconds |
| Storage | `./q-storage` |
| Key length | 8 characters |
