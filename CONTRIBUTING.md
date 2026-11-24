# Contributing to Romance-web

Thank you for contributing to `Romance-web`. Please follow these engineering standards when preparing changes.

## Development Workflow

1. Fork or branch from `main` using descriptive branch names (e.g., `feat/playlist-shuffle` or `fix/upload-validation`).
2. Install locked dependencies:
   ```bash
   npm ci
   ```
3. Copy `.env.example` to `.env` for local runs with a Supabase project.
4. Keep functions concise (`< 50` lines), avoid swallowed errors, never log secrets, and validate external inputs upfront.
5. Add or update automated tests under `tests/*.test.js` covering happy paths, edge cases, and failure modes.

## Quality Checks Before Opening a Pull Request

Run the full local verification suite:

```bash
make verify
```

Or run individual checks:

```bash
npm run verify:syntax
npm run lint
npm test
```

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new user-facing features or endpoints
- `fix:` for bug fixes and security hardening
- `refactor:` for structural improvements without behavior changes
- `test:` for adding or updating automated tests
- `ci:` / `build:` / `docs:` for pipelines, containerization, and documentation
