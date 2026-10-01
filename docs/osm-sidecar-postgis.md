# OSM sidecar PostGIS provisioning (fork-specific)

This note documents the one intentional cross-project coupling in this fork:
`provision_application_postgres` can select a PostGIS-enabled PostgreSQL image
for the OSM lead-source sidecar. It exists because audit finding PA-60 needed a
precise maintenance contract for that coupling after the original
"uncommitted WIP" concern turned out to be stale.

## Why the coupling exists

The OSM lead-source sidecar needs the PostGIS extension at database creation
time. Coolify's generic PostgreSQL database resource is created from the
official `postgres:<version>` image, which does not ship PostGIS, and the
Coolify API offers no extension hook during provisioning. The only safe place
to switch the image is the guarded provisioner in this MCP server.

## Where it lives

- `src/lib/mcp-server.ts`:
  - `OSM_SIDECAR_DATABASE_NAME`, `OSM_SIDECAR_VARIABLE_KEY`,
    `OSM_SIDECAR_POSTGIS_VERSION` constants.
  - `provisionPostgresImage(databaseName, variableKey, postgresVersion)`
    returns `postgis/postgis:<pg>-3.5` only when **both** the database name and
    the environment-variable key match the allowlisted pair; every other request
    keeps `postgres:<pg>`.
- `src/__tests__/provision-postgres-image.test.ts` pins the four relevant
  cases: generic request, exact allowlisted pair, database name only, and
  environment key only.
- `src/__tests__/mcp-server.test.ts` covers the tool handler that consumes the
  selector.

## Maintenance rules

1. The match must stay exact on both the database name and the environment
   variable key. Do not widen it to prefixes, suffixes, or a single-field
   match: other databases that happen to share a name would silently start on
   PostGIS images.
2. To add another PostGIS-backed database, extend the constants into an
   explicit allowlist map and add a case per pair to
   `provision-postgres-image.test.ts`. Keep generic provisioning on the
   official image by default.
3. Bumping `OSM_SIDECAR_POSTGIS_VERSION` is a data-format decision for the OSM
   sidecar; update the constant and the test expectation together.
4. The selector must remain a pure function exported for tests; the tool
   handler keeps calling it for every provisioning request.

## Superseded branch

`fix/osm-postgis-provisioning` (tip `89f3438`) is superseded. Its selector,
provisioner wiring, and `database_image` reporting are already present in
`main` at the same `src/lib/mcp-server.ts` locations, and main additionally
carries later provisioning work. Do not merge that branch; merging it would
replay duplicate history without adding behavior.
