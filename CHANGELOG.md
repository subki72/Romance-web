# Changelog

All notable changes to `Romance-web` are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-24

### Added
- Modular `backend/` architecture (`config.js`, `app.js`, `middleware/*`, `utils/*`) with injectable dependencies for offline testing.
- `GET /health` liveness endpoint and centralized `ErrorHandler` middleware without stack trace leaks.
- Structured JSON leveled logger (`backend/utils/logger.js`) with recursive redaction of secrets and credentials.
- Sliding-window in-memory rate limiting (`backend/middleware/rateLimiter.js`) and read-through TTL caching (`backend/utils/cache.js`) with write invalidation.
- Explicit HTTP request timeouts (`REQUEST_TIMEOUT_MS`) for Supabase client calls and frontend `src/api.js` requests.
- Versioned database migration script in `migrations/001_supabase_setup.sql` and `.env.example` template.
- Automated `node:test` test suite across 8 unit and integration test modules (`npm test`).
- Multi-stage non-root `Dockerfile`, `docker-compose.yml`, `Makefile`, ESLint 10 configuration, `.pre-commit-config.yaml`, and GitHub Actions CI/CD + Dependabot.

### Security
- Closed root static directory leak by restricting `express.static` strictly to `src/` (`dotfiles: 'deny'`).
- Fixed `APP_PASSWORD` empty-environment bypass by failing closed (`503`) and using constant-time `crypto.timingSafeEqual`.
- Added strict input validation for `/api/data`, MIME/extension allowlists for `/api/upload`, path-traversal sanitization on `DELETE /api/upload/:filename`, and defense-in-depth HTTP security headers.
- Resolved transitive dependency advisories (`multer`, `body-parser`, `proxy-addr`, `qs`, `ws`) to reach 0 npm audit vulnerabilities.
