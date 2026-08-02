# Security Policy — Deveng Bot

## Supported versions

Security fixes are accepted against the default branch (`main`) of this repository.

## Reporting a vulnerability

Please **do not** open a public issue for vulnerabilities that expose secrets, auth bypass, or remote code execution.

Prefer a private report via
[GitHub Security Advisories](https://github.com/pinqponq/deveng-bot/security/advisories/new).

Include:

- Affected component (API / Web BFF / Bot)
- Reproduction steps
- Impact assessment
- Suggested fix (optional)

## Self-host secrets

When running Deveng Bot yourself:

1. Never commit `.env`, `config.local.json`, or filled `appsettings.Development.json`.
2. Use long random values for `BOT_SHARED_SECRET`, `SESSION_SECRET`, DB and Redis passwords.
3. Rotate Discord application secrets and bot tokens if they were ever exposed.
4. Rotate Spotify / YouTube / other third-party credentials if used.
5. Secrets are injected via environment only — container images must not `COPY` `.env`.

This public repository is intended to ship with a **clean history** (orphan / fresh export). Do not reintroduce private deploy stacks, production host IPs, or filled secret files.
