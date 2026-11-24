# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in `Romance-web`:

1. **Do NOT open a public GitHub issue** for undisclosed vulnerabilities.
2. Submit a private report via GitHub Security Advisories (`Security -> Advisories -> Report a vulnerability`).
3. Include affected file paths, line numbers, reproduction steps, and estimated severity.
4. Initial acknowledgement will be provided within **48 hours**.

## Implemented Security Controls

- **Fail-Closed Authentication**: Requests are rejected (`503`) if `APP_PASSWORD` is unconfigured, and passwords are verified using constant-time SHA-256 `crypto.timingSafeEqual`.
- **Static Directory Isolation**: Express serves static frontend assets strictly from `src/` with `dotfiles: 'deny'`, preventing exposure of server source files, `.env`, or manifests.
- **Upload & Path Validation**: All uploads enforce MIME type and extension allowlists (excluding script-capable types such as SVG/HTML), and `DELETE /api/upload/:filename` blocks path traversal sequences.
- **Defense-in-Depth Headers & Rate Limiting**: Sliding-window rate limiting protects `/api/verify` and `/api/upload`, alongside strict `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and configurable CORS origin allowlists.
- **Automated Supply-Chain Hygiene**: Weekly Dependabot updates (`semver-major` ignored), ESLint checks, Semgrep SAST, and Trivy container image scanning in CI.
