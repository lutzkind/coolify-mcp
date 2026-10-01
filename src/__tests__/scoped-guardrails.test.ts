import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { composeDeploymentPreflight, deduplicateEnvironmentRecords, identifyResourceKind, resolveComposeFilePath } from '../lib/compose-guardrails.js';

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
    expect(composeDeploymentPreflight(`services:\n  api:\n    image: example/api\n    environment:\n      API_PORT: "8000"\n  worker:\n    image: example/worker\nnetworks:\n  shared:\n    external: true\n`)).toEqual({
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
});
