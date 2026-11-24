# Sweet Memories (Romance-web)

[![CI Pipeline](https://github.com/subki72/Romance-web/actions/workflows/ci.yml/badge.svg)](https://github.com/subki72/Romance-web/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](./LICENSE)
[![Node.js 22](https://img.shields.io/badge/Node.js-22%2B-339933.svg)](https://nodejs.org/)

Sweet Memories is a private romantic memory journal for couples. It combines a responsive Vanilla ES-module web interface (poems, photo/video gallery with lightbox, anniversary day counter, and shared audio playlist) with a security-hardened Express 5 backend backed by Supabase PostgreSQL and Supabase Storage.

## Features

- Fail-closed passphrase authentication with constant-time `crypto.timingSafeEqual` verification
- Editable couple names and live anniversary day counter
- Love poetry journal with create, edit, and delete modals
- Photo and video gallery with captions, drag-and-drop uploads, and lightbox viewing
- Persistent shared audio playlist with playback, seek, and volume controls
- Hardened Express API with structured JSON logging, input validation, TTL caching, sliding-window rate limiting, CORS allowlist, and HTTP security headers

## Architecture & Project Structure

```text
Romance-web/
|-- backend/
|   |-- app.js                  # Express app factory (dependency-injectable for tests)
|   |-- config.js               # Bounded env loader & runtime startup validation
|   |-- middleware/
|   |   |-- auth.js             # Fail-closed constant-time auth & /api/verify handler
|   |   |-- errorHandler.js     # Security headers, 404 handler & centralized ErrorHandler
|   |   `-- rateLimiter.js      # Sliding-window in-memory rate limiter
|   `-- utils/
|       |-- cache.js            # In-memory TTL cache with write invalidation
|       |-- logger.js           # Structured JSON logger with secret redaction
|       `-- validator.js        # Payload schemas, MIME allowlist & traversal guards
|-- docs/
|   `-- runbook.md              # Operational checklist & incident playbooks
|-- migrations/
|   `-- 001_supabase_setup.sql  # Versioned PostgreSQL schema & RLS setup
|-- src/                        # Public ES-module frontend (only directory served statically)
|-- tests/                      # Automated unit & integration test suite (node:test)
|-- server.js                   # Thin HTTP entrypoint
|-- Dockerfile                  # Multi-stage non-root production image (node:22-alpine)
|-- docker-compose.yml          # Hardened container orchestration
|-- Makefile                    # Single-command install, lint, test & Docker workflows
`-- eslint.config.js            # ESLint 10 rules for backend, tests & frontend modules
```

## Quick Start

### Prerequisites

- Node.js 20+ (Node 22 recommended) and npm
- A Supabase project with a `memories` Storage bucket
- Optional: Docker & Docker Compose for containerized deployment

### 1. Install Dependencies & Apply Schema

```bash
make install
```

Run [`migrations/001_supabase_setup.sql`](./migrations/001_supabase_setup.sql) (or [`supabase-setup.sql`](./supabase-setup.sql)) in the Supabase SQL Editor, then create a storage bucket named `memories`.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Key environment variables:
- `APP_PASSWORD`: Required non-empty login passphrase
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Server-side Supabase service role key
- `ALLOWED_ORIGINS`: Comma-separated allowed CORS origins (e.g., `http://localhost:3000`)
- `MAX_UPLOAD_MB`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `REQUEST_TIMEOUT_MS`, `DATA_CACHE_TTL_MS`

### 3. Verify & Run

```bash
make verify
make run
```

Open `http://localhost:3000`.

### 4. Run with Docker

```bash
docker compose up --build
```

Verify container health:

```bash
curl -fsS http://127.0.0.1:3000/health
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Service liveness & uptime JSON probe |
| `POST` | `/api/verify` | Rate-limited | Constant-time passphrase verification |
| `GET` | `/api/data` | `Authorization` | Retrieve couple state JSON (TTL-cached) |
| `POST` | `/api/data` | `Authorization` | Validate & persist couple state JSON |
| `POST` | `/api/upload` | `Authorization` + Rate-limited | Upload validated image/video/audio media |
| `DELETE` | `/api/upload/:filename` | `Authorization` | Delete media object (path-traversal protected) |

## Testing & Quality Gates

All backend routes, validation rules, rate limits, auth guards, and static isolation guarantees run offline via Node's built-in test runner with a mocked Supabase client:

```bash
npm run verify:syntax
npm run lint
npm test
```

## Security & Operations

- Report vulnerabilities privately following [SECURITY.md](./SECURITY.md).
- Operational recovery steps and environment checks are documented in [docs/runbook.md](./docs/runbook.md).
- Release history is tracked in [CHANGELOG.md](./CHANGELOG.md).

## License

This project is licensed under the [MIT License](./LICENSE).
