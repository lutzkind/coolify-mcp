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

- Reconciled 2026-10-01: the guardrail work and the unmerged branch commits
  (`fix/coolify-post-endpoints-20260919`, `codex/application-commit-update-schema-20260922`)
  were landed on `main`; the canonical checkout is on `main`.
- Local checkout is not proof of main/production. Check `git status -sb`.
- Production was rebuilt from `main` on 2026-10-01 (dist verified
  file-for-file against a fresh `main` build).

## Repository map

- `src/lib/mcp-server.ts` (170 KB) and `src/lib/coolify-client.ts` (90 KB) —
  core server/client; `src/__tests__/` — Jest suites; `scripts/`; `dist/`;
  `site/` (docs site); `docs/coolify-openapi.yaml` (315 KB, tracked).
- `CLAUDE.md`, `repomix-output.xml` (tracked generated bundle).

## Commands

| Purpose       | Command                                                  |
| ------------- | -------------------------------------------------------- |
| Install       | `npm ci`                                                 |
| Build         | `npm run build`                                          |
| Targeted test | `npx jest src/__tests__/mcp-server.test.ts`              |
| Full suite    | `npm test` (Jest, integration excluded)                  |
| Lint / format | `npm run lint`, `npm run format:check`                   |
| Integration   | `npm run test:integration` (needs live Coolify + `.env`) |
| Spec drift    | `npm run check:spec-drift`                               |

## CI reality

- `ci.yml` is the real gate: `npm ci`, security audit, prettier check, lint,
  spec drift, build, coverage tests.
- This fork's GitHub Actions only execute via `workflow_dispatch`
  (`gh workflow run ci.yml --repo lutzkind/coolify-mcp --ref main`); the
  `push`/`pull_request` triggers do not fire. A green "no checks" state means
  CI did not run, not that it passed.
- Upstream workflows (publish, openapi-drift, claude) exist because this is a
  fork; treat their defaults as upstream-oriented.

## Production

- Container `mcp-coolify` (image
  `mcp-repair-health-mcp-coolify:20261001-git-commit-3452bca0-r1`, built from
  `main`) plus bridge `mcp-coolify-bridge` (bridge port 3117 → wrapper 3017).
- Deploy mechanism (existing, reconstructed from image history): build context
  with the v16 wrapper files (`/root/package.json`, `/root/package-lock.json`,
  `/root/server.js`), the repo `package.json`/`package-lock.json`, and a fresh
  `dist/` build; `Dockerfile`:
  `FROM mcp-optimized:latest` → `npm ci` for the wrapper → `npm ci --omit=dev`
  in `/app/coolify-mcp` → copy `server.js` and `dist/`; then run with
  `--network o4080ws0og8w00ogs08co4cc`, `-p 3017:3000`,
  `--env-file /root/mcp-coolify.env`, `COMMAND=node /app/coolify-mcp/dist/index.js`.
  The container is image-frozen (no bind mount): a repo change needs a rebuild.
- Live verification: `initialize` + `tools/call get_version` through
  `http://127.0.0.1:3117/mcp` (a live Coolify API read), plus
  `docker logs mcp-coolify` for the spawn/initialize lines.
- Previous image `…:20260922-git-commit-603a6cb6-r2` and stopped container
  `mcp-coolify-prev` are the rollback path.

## Giant-file index (src/lib/mcp-server.ts, 4,681 lines)

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
- `repomix-output.xml` (generated bundle) was untracked and gitignored on
  2026-10-01; regenerate with the external `repomix` tool if ever needed. The
  `site/package-lock.json` is an intentional site lockfile.

## Do not read/search by default

- `/root/agent-tmp/**`, `/root/mcp-shared/chatgpt/**`,
  `/root/coolify-mcp-backup-*/` (duplicates), `node_modules/`, `dist/`,
  OpenAPI chunks under `docs/`.
