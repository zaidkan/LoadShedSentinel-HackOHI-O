# Contributing

Start with [development](docs/development.md) and [architecture](docs/architecture.md). Keep changes focused and explain the resulting behavior in the pull request.

## Checks

```bash
python -m pytest -q
cd web
npm test
npm run build
```

Run checks from the repository root unless shown otherwise. Full-source tests need the challenge archives; report any skips and their reason.

## Review expectations

- Keep backend schemas and shared TypeScript contracts aligned.
- Add a focused regression for behavior changes; do not change expected values just to silence a failure.
- Preserve missing-data behavior, source labels, privacy projection, and explicit restoration authorization.
- Identify dependencies, lockfile changes, and migration or deployment requirements.
- Provide browser evidence for changes to layout, interaction, accessibility, or graphics.
- Avoid committing local editor tooling, private data, generated build output, credentials, or internal work logs.

Use the pull-request template to describe the problem, change, and validation. Report security issues through the process in [SECURITY.md](SECURITY.md).
