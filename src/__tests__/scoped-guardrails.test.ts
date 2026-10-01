import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  composeDeploymentPreflight,
  deduplicateEnvironmentRecords,
  identifyResourceKind,
  resolveComposeFilePath,
} from '../lib/compose-guardrails.js';

describe('scoped connector guardrails', () => {
  it('detects both supported compose filenames and rejects missing files', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'coolify-compose-'));
    try {
      fs.writeFileSync(path.join(directory, 'docker-compose.yaml'), 'services: {}\n');
      expect(path.basename(resolveComposeFilePath(directory))).toBe('docker-compose.yaml');
      fs.unlinkSync(path.join(directory, 'docker-compose.yaml'));
      fs.writeFileSync(path.join(directory, 'docker-compose.yml'), 'services: {}\n');
      expect(path.basename(resolveComposeFilePath(directory))).toBe('docker-compose.yml');
      fs.unlinkSync(path.join(directory, 'docker-compose.yml'));
      expect(() => resolveComposeFilePath(directory)).toThrow(/does not exist/i);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('deduplicates environment records deterministically without allowing blank overrides', () => {
    const result = deduplicateEnvironmentRecords([
      { key: 'ZED', value: 'last-populated' },
      { key: 'FOO', value: 'populated' },
      { key: 'FOO', value: '' },
      { key: 'ZED', value: 'first-populated' },
    ]);
    expect(result.records.map((entry) => entry.key)).toEqual(['FOO', 'ZED']);
    expect(result.records.find((entry) => entry.key === 'FOO')?.value).toBe('populated');
    expect(result.duplicate_keys).toEqual(['FOO', 'ZED']);
    expect(result.blank_overrides_ignored).toEqual(['FOO']);
  });

  it('validates generic Compose services, networks, and environment names before deployment', () => {
    expect(
      composeDeploymentPreflight(
        `services:\n  api:\n    image: example/api\n    environment:\n      API_PORT: "8000"\n  worker:\n    image: example/worker\nnetworks:\n  shared:\n    external: true\n`,
      ),
    ).toEqual({
      expected_services: ['api', 'worker'],
      required_networks: ['shared'],
      environment_keys: ['API_PORT'],
    });
    expect(() => composeDeploymentPreflight('services: {}')).toThrow(/at least one service/i);
  });

  it('keeps application, service, and database UUID classification typed', () => {
    expect(identifyResourceKind('app', { application: true })).toBe('application');
    expect(identifyResourceKind('service', { service: true })).toBe('service');
    expect(identifyResourceKind('db', { database: true })).toBe('database');
    expect(identifyResourceKind('ambiguous', { application: true, service: true })).toBeNull();
  });

  it('accepts an explicit supported compose filename', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'coolify-compose-'));
    try {
      fs.writeFileSync(path.join(directory, 'docker-compose.yml'), 'services: {}\n');
      expect(path.basename(resolveComposeFilePath(directory, 'docker-compose.yml'))).toBe(
        'docker-compose.yml',
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects compose file paths that escape the selected directory', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'coolify-compose-'));
    try {
      expect(() => resolveComposeFilePath(directory, '../docker-compose.yml')).toThrow(
        /remain inside/i,
      );
      expect(() =>
        resolveComposeFilePath(directory, path.join(os.tmpdir(), 'outside-docker-compose.yml')),
      ).toThrow(/remain inside/i);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects explicit filenames that are not supported compose names', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'coolify-compose-'));
    try {
      expect(() => resolveComposeFilePath(directory, 'compose.yml')).toThrow(
        /docker-compose\.yml or docker-compose\.yaml/i,
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('handles blank keys, real_value fallbacks, conflicts, and blank overrides', () => {
    const result = deduplicateEnvironmentRecords([
      { key: ' KEEP ', value: 'first' },
      { key: 'KEEP', value: 'second' },
      { key: 'EMPTY', value: '' },
      { key: 'REAL_ONLY', real_value: 'from-real' },
      { key: 'NO_VALUE' },
      { key: 'BLANK_LAST', value: 'kept' },
      { key: 'BLANK_LAST', value: '' },
      { value: 'no-key' },
      { key: '   ', value: 'blank-key' },
    ]);

    const byKey = new Map(result.records.map((entry) => [entry.key, entry]));
    expect([...byKey.keys()]).toEqual(['BLANK_LAST', 'EMPTY', 'KEEP', 'NO_VALUE', 'REAL_ONLY']);
    expect(byKey.get('KEEP')?.value).toBe('second');
    // All-blank values fall back to the last record so the key survives.
    expect(byKey.get('EMPTY')?.value).toBe('');
    // real_value is used when `value` is not populated.
    expect(byKey.get('REAL_ONLY')?.real_value).toBe('from-real');
    expect(result.duplicate_keys).toEqual(['BLANK_LAST', 'KEEP']);
    expect(result.conflicting_keys).toEqual(['KEEP']);
    expect(result.blank_overrides_ignored).toEqual(['BLANK_LAST']);
  });

  it('rejects invalid YAML and payloads without a usable service map', () => {
    expect(() => composeDeploymentPreflight('services:\n  api: [unclosed')).toThrow(
      /Invalid Docker Compose YAML/i,
    );
    expect(() => composeDeploymentPreflight('networks:\n  shared: {}\n')).toThrow(
      /at least one service/i,
    );
    expect(() => composeDeploymentPreflight('services: "not-a-map"')).toThrow(
      /at least one service/i,
    );
  });

  it('reads array and mapping environments and ignores invalid keys', () => {
    const result = composeDeploymentPreflight(
      [
        'services:',
        '  array-env:',
        '    image: example/api',
        '    environment:',
        '      - API_PORT=8000',
        '      - "INVALID KEY=1"',
        '      - STANDALONE',
        '  map-env:',
        '    image: example/worker',
        '    environment:',
        '      GOOD_ONE: "1"',
        '      "BAD KEY": "2"',
        '  bad-service: not-a-map',
        'networks: "not-a-map"',
        '',
      ].join('\n'),
    );

    expect(result.expected_services).toEqual(['array-env', 'bad-service', 'map-env']);
    expect(result.required_networks).toEqual([]);
    expect(result.environment_keys).toEqual(['API_PORT', 'GOOD_ONE', 'STANDALONE']);
  });
});
