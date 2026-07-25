import { describe, expect, it } from '@jest/globals';

import { provisionPostgresImage } from '../lib/mcp-server.js';

describe('provisionPostgresImage', () => {
  it('keeps generic provisioning on the official PostgreSQL image', () => {
    expect(provisionPostgresImage('managed_data', 'MANAGED_DATABASE_URL', '16')).toBe(
      'postgres:16',
    );
  });

  it('selects the allowlisted PostGIS image for the exact OSM sidecar request', () => {
    expect(
      provisionPostgresImage(
        'osm_lead_source',
        'OSM_LEAD_SOURCE_PRODUCTION_DATABASE_URL',
        '16',
      ),
    ).toBe('postgis/postgis:16-3.5');
  });

  it('does not select PostGIS when only the database name matches', () => {
    expect(provisionPostgresImage('osm_lead_source', 'OTHER_DATABASE_URL', '16')).toBe(
      'postgres:16',
    );
  });

  it('does not select PostGIS when only the environment key matches', () => {
    expect(
      provisionPostgresImage(
        'other_database',
        'OSM_LEAD_SOURCE_PRODUCTION_DATABASE_URL',
        '16',
      ),
    ).toBe('postgres:16');
  });
});
