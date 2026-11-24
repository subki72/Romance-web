# Operational Runbook — Romance-web

## Service Overview

- **Service Name**: `romance-web`
- **Runtime**: Node.js 22 / Express 5 (`server.js` -> `backend/app.js`)
- **Primary Dependencies**: Supabase PostgreSQL (`app_data` table) and Supabase Storage (`memories` bucket)
- **Health Endpoint**: `GET /health` (returns `200 { "status": "ok" }`)

## Deployment & Startup Checklist

1. Ensure database schema is applied from `migrations/001_supabase_setup.sql` (and bucket `memories` exists in Supabase Storage).
2. Populate required environment variables (see `.env.example`):
   - `APP_PASSWORD` (mandatory non-empty passphrase)
   - `SUPABASE_URL` (`https://<project>.supabase.co`)
   - `SUPABASE_SERVICE_KEY` (server-side service role key)
   - `ALLOWED_ORIGINS` (production origin allowlist, comma-separated)
3. Start via Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. Verify liveness probe:
   ```bash
   curl -fsS http://127.0.0.1:3000/health
   ```

## Incident Playbooks

### 1. HTTP 503 on `/api/verify` or `/api/data`
- **Cause**: `APP_PASSWORD` is empty, whitespace-only, or unset in container/runtime environment.
- **Resolution**: Set a non-empty `APP_PASSWORD` in `.env` or secret manager and restart the service (`docker compose restart app`).

### 2. HTTP 500 on `/api/data` or `/api/upload`
- **Cause**: Supabase network timeout (`REQUEST_TIMEOUT_MS`), invalid `SUPABASE_SERVICE_KEY`, or missing `app_data` table / `memories` bucket.
- **Diagnosis**: Inspect structured JSON stderr logs (`level: "error"`) for sanitized `reason` fields.
- **Resolution**: Re-verify Supabase credentials, check Supabase status, confirm `migrations/001_supabase_setup.sql` was executed, and adjust `REQUEST_TIMEOUT_MS` if upstream latency spikes.

### 3. HTTP 429 Too Many Requests
- **Cause**: Client exceeded `RATE_LIMIT_MAX` within `RATE_LIMIT_WINDOW_MS` on `/api/verify` or `/api/upload`.
- **Resolution**: Inspect `Retry-After` response header; tune `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` only if legitimate traffic patterns require higher bursts.

### 4. Container Healthcheck Failing
- **Diagnosis**: Run `docker inspect --format='{{json .State.Health}}' romance-web` and `docker logs --tail=100 romance-web`.
- **Rollback**: Redeploy previous tagged container image (`romance-web:<previous-tag>`).
