import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';

const COMPOSE_FILE_NAMES = ['docker-compose.yml', 'docker-compose.yaml'] as const;

export type CoolifyResourceKind = 'application' | 'service' | 'database';

export interface ComposeEnvironmentRecord {
  key?: string;
  value?: string;
  real_value?: string;
  uuid?: string;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveComposeFilePath(directory: string, requestedFile?: string): string {
  const base = path.resolve(directory);
  const candidateNames = requestedFile ? [requestedFile] : [...COMPOSE_FILE_NAMES];
  for (const name of candidateNames) {
    const resolved = path.resolve(base, name);
    if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
      throw new Error('compose file must remain inside the selected directory');
    }
    if (!COMPOSE_FILE_NAMES.includes(path.basename(resolved) as (typeof COMPOSE_FILE_NAMES)[number])) {
      throw new Error('compose file must be docker-compose.yml or docker-compose.yaml');
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  }
  throw new Error('selected Docker Compose file does not exist (expected docker-compose.yml or docker-compose.yaml)');
}

export function deduplicateEnvironmentRecords(records: ComposeEnvironmentRecord[]): {
  records: ComposeEnvironmentRecord[];
  duplicate_keys: string[];
  conflicting_keys: string[];
  blank_overrides_ignored: string[];
} {
  const byKey = new Map<string, ComposeEnvironmentRecord[]>();
  for (const record of records) {
    const key = String(record.key ?? '').trim();
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), { ...record, key }]);
  }
  const duplicateKeys = [...byKey.entries()].filter(([, values]) => values.length > 1).map(([key]) => key).sort();
  const conflictingKeys: string[] = [];
  const blankOverridesIgnored: string[] = [];
  const result: ComposeEnvironmentRecord[] = [];
  for (const key of [...byKey.keys()].sort()) {
    const values = byKey.get(key)!;
    const populated = values.filter((item) => String(item.value ?? item.real_value ?? '').length > 0);
    const chosen = populated.at(-1) ?? values.at(-1)!;
    const distinct = new Set(populated.map((item) => String(item.value ?? item.real_value ?? '')));
    if (distinct.size > 1) conflictingKeys.push(key);
    if (populated.length > 0 && values.at(-1) !== chosen && String(values.at(-1)?.value ?? values.at(-1)?.real_value ?? '') === '') {
      blankOverridesIgnored.push(key);
    }
    result.push(chosen);
  }
  return { records: result, duplicate_keys: duplicateKeys, conflicting_keys: conflictingKeys.sort(), blank_overrides_ignored: blankOverridesIgnored.sort() };
}

export function identifyResourceKind(_uuid: string, found: Partial<Record<CoolifyResourceKind, boolean>>): CoolifyResourceKind | null {
  const kinds = (['application', 'service', 'database'] as const).filter((kind) => found[kind]);
  return kinds.length === 1 ? kinds[0] : null;
}

export function composeDeploymentPreflight(compose: string): {
  expected_services: string[];
  required_networks: string[];
  environment_keys: string[];
} {
  const document = parseDocument(compose);
  if (document.errors.length) throw new Error(`Invalid Docker Compose YAML: ${document.errors[0].message}`);
  const value = document.toJS() as Record<string, unknown>;
  const services = isRecord(value.services) ? Object.keys(value.services).sort() : [];
  if (services.length === 0) throw new Error('Docker Compose must define at least one service');
  const networks = isRecord(value.networks) ? Object.keys(value.networks).sort() : [];
  const environmentKeys = new Set<string>();
  for (const serviceName of services) {
    const service = isRecord((value.services as Record<string, unknown>)[serviceName])
      ? ((value.services as Record<string, unknown>)[serviceName] as Record<string, unknown>)
      : {};
    const environment = service.environment;
    if (Array.isArray(environment)) {
      for (const item of environment) {
        const key = String(item).split('=', 1)[0].trim();
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) environmentKeys.add(key);
      }
    } else if (isRecord(environment)) {
      for (const key of Object.keys(environment)) if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) environmentKeys.add(key);
    }
  }
  return { expected_services: services, required_networks: networks, environment_keys: [...environmentKeys].sort() };
}
