# AGENTS.md — coolify-mcp

Purpose: MCP server for Coolify (fork of StuMason/coolify-mcp) — deployment,
application, and service management tools.
GitHub: `lutzkind/coolify-mcp` (public fork) · Canonical checkout:
`/root/coolify-mcp` · Default branch: `main`.

## Start here

- Agent guide: `CLAUDE.md` — the fork's actual instructions; read it.
- Docs: `README.md` (upstream-oriented), `CHANGELOG.md`, `docs/` (includes the
  tracked OpenAPI spec and chunks), `skills/` (Claude-specific).
- Host map: `/root/REPO_MAP.md`.
- `/root/mcp-shared/chatgpt/**` is continuity/history evidence, not the source
  of truth.

## Branch / state rule

- Observed 2026-10-01: on `fix/coolify-post-endpoints-20260919`, 7 behind /
  1 ahead of `main`, with unrelated in-progress edits
  (`src/lib/mcp-server.ts` + new guardrail files). Do not touch those files,
  do not switch branches, do not reset.
- Production runs an image built from commit `603a6cb6`, which is **not on
  main** (verified drift; Phase 2/3 decision).

## Repository map

- `src/lib/mcp-server.ts` (170 KB) and `src/lib/coolify-client.ts` (90 KB) —
  core server/client; `src/__tests__/` — Jest suites; `scripts/`; `dist/`;
  `site/` (docs site); `docs/coolify-openapi.yaml` (315 KB, tracked).
- `CLAUDE.md`, `repomix-output.xml` (tracked generated bundle).

## Commands

| Purpose | Command |
|---|---|
| Install | `npm ci` |
| Build | `npm run build` |
| Targeted test | `npx jest src/__tests__/mcp-server.test.ts` |
| Full suite | `npm test` (Jest, integration excluded) |
| Lint / format | `npm run lint`, `npm run format:check` |
| Integration | `npm run test:integration` (needs live Coolify + `.env`) |
| Spec drift | `npm run check:spec-drift` |

## CI reality

- `ci.yml` is the real gate: `npm ci`, security audit, prettier check, lint,
  spec drift, build, coverage tests.
- Upstream workflows (publish, openapi-drift, claude) exist because this is a
  fork; treat their defaults as upstream-oriented.

## Production

- Container `mcp-coolify` (image
  `mcp-repair-health-mcp-coolify:20260922-git-commit-603a6cb6-r2`) plus bridge
  `mcp-coolify-bridge`.
- The deployed commit is not on `main` — surfaced drift; do not redeploy from
  this checkout.
- Live verification: a read-only Coolify API call through the MCP server; the
  deployment state comes from the host image, not Git.

## Giant-file index (src/lib/mcp-server.ts, 4,506 lines)

- ~45–160 version/validation helpers; ~159–300 create-application
  validation/payload
- ~310–530 Postgres provisioning plus compose redaction/validation
- ~561–950 logs truncation/filtering, application and deployment summaries
- ~932–1163 mutation preflight, actions, pagination, `CoolifyMcpServer` class

## Traps

- `CLAUDE.md` is invisible to non-Claude agents; this file points to it — do
  not duplicate its contents.
- Upstream README/docs describe upstream behavior, not this fork's deployment
  policy.
- `repomix-output.xml` and the `site/` lockfile are tracked generated
  artifacts (Phase 2 candidate).

## Do not read/search by default

- `/root/agent-tmp/**`, `/root/mcp-shared/chatgpt/**`,
  `/root/coolify-mcp-backup-*/` (duplicates), `node_modules/`, `dist/`,
  OpenAPI chunks under `docs/`.
