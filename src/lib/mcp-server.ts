/**
 * Coolify MCP Server
 * Consolidated tools for efficient token usage
 */

import { createRequire } from 'module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';
import {
  CoolifyClient,
  composeHash,
  decodeCompose,
  redactSensitiveText,
  type ServerSummary,
  type ProjectSummary,
  type ApplicationSummary,
  type DatabaseSummary,
  type ServiceSummary,
  type GitHubAppSummary,
} from './coolify-client.js';
import { parseDocument } from 'yaml';
import type {
  CoolifyConfig,
  GitHubApp,
  BuildPack,
  ResponseAction,
  ResponsePagination,
  Deployment,
} from '../types/coolify.js';
import { DocsSearchEngine } from './docs-search.js';

const _require = createRequire(import.meta.url);
export const VERSION: string = _require('../../package.json').version;

const CREATE_APPLICATION_ENDPOINT = '/api/v1/applications/public';
const COOLIFY_RESOURCE_ID =
  /^(?:[a-z0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const CREATE_APPLICATION_BUILD_PACKS = [
  'nixpacks',
  'railpack',
  'static',
  'dockerfile',
  'dockercompose',
] as const;

interface CreateApplicationToolArgs {
  name?: string;
  git_repository?: string;
  git_branch?: string;
  server_uuid?: string;
  project_uuid?: string;
  environment_uuid?: string;
  environment_name?: string;
  destination_uuid?: string;
  build_pack?: string;
  build_type?: string;
  dockerfile_location?: string;
  base_directory?: string;
  ports_exposes?: string;
  domain?: string;
  auto_deploy?: boolean;
  execute?: boolean;
}

function isSafeCoolifyResourceId(value: string): boolean {
  return COOLIFY_RESOURCE_ID.test(value.trim());
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => character.charCodeAt(0) < 32);
}

function validateRepository(value: string): string | undefined {
  if (/\s/.test(value) || hasControlCharacter(value))
    return 'git_repository must not contain whitespace or control characters';
  if (/^(?:https?|ssh):\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.username || url.password || /(?:token|secret|password|key)=/i.test(url.search)) {
        return 'git_repository must not contain credentials or secret query parameters';
      }
      if (!url.hostname) return 'git_repository must contain a repository host';
      return undefined;
    } catch {
      return 'git_repository must be a valid repository URL';
    }
  }
  if (/^git@[^:]+:[^\s]+$/i.test(value)) return undefined;
  return 'git_repository must be an HTTPS, SSH URL, or git@host:path repository';
}

function validateRepositoryPath(value: string, field: string): string | undefined {
  if (value.includes('\u0000') || value.includes('\\') || /(^|\/)\.\.(?:\/|$)/.test(value)) {
    return `${field} must be a repository-relative path without traversal`;
  }
  if (value.trim() === '') return `${field} must not be empty`;
  return undefined;
}

export function validateCreateApplicationInput(args: CreateApplicationToolArgs): string[] {
  const errors: string[] = [];
  for (const field of ['server_uuid', 'project_uuid'] as const) {
    const value = args[field]?.trim();
    if (!value) errors.push(`${field} is required`);
    else if (!isSafeCoolifyResourceId(value))
      errors.push(`${field} is not a valid Coolify resource identifier`);
  }
  const environmentUuid = args.environment_uuid?.trim();
  const environmentName = args.environment_name?.trim();
  const destinationUuid = args.destination_uuid?.trim();
  if (args.environment_uuid !== undefined && !environmentUuid) {
    errors.push('environment_uuid must not be blank');
  }
  if (args.environment_name !== undefined && !environmentName) {
    errors.push('environment_name must not be blank');
  }
  if (!environmentUuid && !environmentName) {
    errors.push('exactly one of environment_uuid or environment_name is required');
  } else if (environmentUuid && environmentName) {
    errors.push('environment_uuid and environment_name are mutually exclusive');
  }
  if (environmentUuid && !isSafeCoolifyResourceId(environmentUuid)) {
    errors.push('environment_uuid is not a valid Coolify resource identifier');
  }
  if (args.destination_uuid !== undefined && !destinationUuid) {
    errors.push('destination_uuid must not be blank');
  }
  if (destinationUuid && !isSafeCoolifyResourceId(destinationUuid)) {
    errors.push('destination_uuid is not a valid Coolify resource identifier');
  }
  for (const field of ['name', 'git_repository', 'git_branch'] as const) {
    if (!args[field]?.trim()) errors.push(`${field} is required`);
  }
  if (args.name && args.name.trim().length > 255)
    errors.push('name must be 255 characters or fewer');
  if (args.git_repository?.trim()) {
    const error = validateRepository(args.git_repository.trim());
    if (error) errors.push(error);
  }
  if (args.git_branch && (/\s/.test(args.git_branch) || hasControlCharacter(args.git_branch))) {
    errors.push('git_branch must not contain whitespace or control characters');
  }

  const buildPack = args.build_pack?.trim();
  const buildType = args.build_type?.trim();
  if (!buildPack && !buildType) errors.push('build_pack or build_type is required');
  if (
    buildPack &&
    !CREATE_APPLICATION_BUILD_PACKS.includes(
      buildPack as (typeof CREATE_APPLICATION_BUILD_PACKS)[number],
    )
  ) {
    errors.push(`unsupported build configuration: ${buildPack}`);
  }
  if (
    buildType &&
    !CREATE_APPLICATION_BUILD_PACKS.includes(
      buildType as (typeof CREATE_APPLICATION_BUILD_PACKS)[number],
    )
  ) {
    errors.push(`unsupported build configuration: ${buildType}`);
  }
  if (buildPack && buildType && buildPack !== buildType) {
    errors.push('build_pack and build_type must match when both are supplied');
  }
  if (args.dockerfile_location) {
    const error = validateRepositoryPath(args.dockerfile_location, 'dockerfile_location');
    if (error) errors.push(error);
    if ((buildPack ?? buildType) !== 'dockerfile') {
      errors.push('dockerfile_location is only supported with the dockerfile build pack');
    }
  }
  if (args.base_directory) {
    const error = validateRepositoryPath(args.base_directory, 'base_directory');
    if (error) errors.push(error);
  }
  if (args.ports_exposes !== undefined) {
    const ports = args.ports_exposes.split(',').map((port) => port.trim());
    if (
      ports.length === 0 ||
      ports.some((port) => !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    ) {
      errors.push('ports_exposes must be a comma-separated list of ports from 1 to 65535');
    }
  }
  if (args.domain) {
    for (const domain of args.domain.split(',').map((item) => item.trim())) {
      try {
        const url = new URL(domain.includes('://') ? domain : `https://${domain}`);
        if (!url.hostname || url.username || url.password || /\s/.test(domain)) {
          errors.push('domain must be a hostname or URL without credentials');
          break;
        }
      } catch {
        errors.push('domain must be a valid hostname or URL');
        break;
      }
    }
  }
  return errors;
}

function createApplicationPayload(args: CreateApplicationToolArgs): Record<string, unknown> {
  const buildPack = (args.build_pack ?? args.build_type)!.trim();
  const environmentUuid = args.environment_uuid?.trim();
  const environmentName = args.environment_name?.trim();
  const destinationUuid = args.destination_uuid?.trim();
  return {
    project_uuid: args.project_uuid!.trim(),
    server_uuid: args.server_uuid!.trim(),
    ...(environmentUuid
      ? { environment_uuid: environmentUuid }
      : { environment_name: environmentName }),
    ...(destinationUuid ? { destination_uuid: destinationUuid } : {}),
    name: args.name!.trim(),
    git_repository: args.git_repository!.trim(),
    git_branch: args.git_branch!.trim(),
    build_pack: buildPack,
    ...(args.dockerfile_location !== undefined
      ? { dockerfile_location: args.dockerfile_location.trim() }
      : {}),
    ...(args.base_directory !== undefined ? { base_directory: args.base_directory.trim() } : {}),
    ...(args.ports_exposes !== undefined ? { ports_exposes: args.ports_exposes.trim() } : {}),
    ...(args.domain !== undefined ? { domains: args.domain.trim() } : {}),
    ...(args.auto_deploy !== undefined ? { is_auto_deploy_enabled: args.auto_deploy } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Wrap handler with error handling */
function wrap<T>(
  fn: () => Promise<T>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  return fn()
    .then((result) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }))
    .catch((error) => ({
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    }));
}

function redactCompose(compose: string): string {
  return compose
    .split('\n')
    .map((line) => {
      // Keep variable names and interpolation references, never their values.
      if (/^\s*-[^:]*:\s*/.test(line) || /^\s*[A-Za-z_][A-Za-z0-9_.-]*:\s*/.test(line)) {
        const match = line.match(/^(\s*(?:-\s*)?[A-Za-z_][A-Za-z0-9_.-]*:\s*)(.*)$/);
        if (match && /(password|secret|token|key|credential|auth|environment)/i.test(match[1])) {
          return `${match[1]}***REDACTED***`;
        }
      }
      if (/^\s*-\s*[A-Za-z_][A-Za-z0-9_]*=/.test(line)) {
        return line.replace(/(=).*/, '$1***REDACTED***');
      }
      return redactSensitiveText(line);
    })
    .join('\n');
}

function validateCompose(compose: string): void {
  const document = parseDocument(compose);
  if (document.errors.length)
    throw new Error(`Invalid Docker Compose YAML: ${document.errors[0].message}`);
}

function redactedComposeDiff(
  before: string,
  after: string,
): { added: string[]; removed: string[] } {
  const oldLines = new Set(redactCompose(before).split('\n'));
  const newLines = new Set(redactCompose(after).split('\n'));
  return {
    added: [...newLines].filter((line) => !oldLines.has(line)),
    removed: [...oldLines].filter((line) => !newLines.has(line)),
  };
}

const TRUNCATION_PREFIX = '...[truncated]...\n';

interface LogEntry {
  output?: string;
  timestamp?: string;
  type?: string;
  hidden?: boolean;
  command?: string | null;
}

export interface TruncatedLogsResult {
  logs: string;
  total: number;
  showing_start: number;
  showing_end: number;
}

interface ApplicationMutationPreflight {
  uuid: string;
  name?: string;
  requested_action: 'deploy' | 'start' | 'stop' | 'restart';
  effective_action: 'deploy' | 'start' | 'stop' | 'restart';
  status: 'ready' | 'noop' | 'blocked';
  reason?: string;
  current_status?: string;
  active_deployments: number;
}

interface SafeDeploymentRead {
  deployment_uuid: string | null;
  deployment_id?: number;
  application_uuid: string | null;
  application_name: string | null;
  application_status: string | null;
  health_result: string | null;
  server_name: string | null;
  status: string | null;
  commit_sha: string | null;
  force_rebuild?: boolean;
  restart_only?: boolean;
  is_webhook?: boolean;
  is_api?: boolean;
  created_at: string | null;
  updated_at: string | null;
  finished_at: string | null;
  logs?: string;
  logs_meta?: {
    total_entries?: number;
    showing?: string;
    chars?: number;
  };
  logs_redacted?: boolean;
  secrets_redacted: true;
  identifiers?: Record<string, string>;
}

function summarizeApplicationForRead(app: Record<string, any>): Record<string, unknown> {
  return {
    uuid: app.uuid,
    name: app.name,
    description: app.description,
    status: app.status,
    server_status: app.server_status,
    fqdn: app.fqdn,
    git_repository: app.git_repository,
    git_branch: app.git_branch,
    git_commit_sha: app.git_commit_sha,
    build_pack: app.build_pack,
    base_directory: app.base_directory,
    publish_directory: app.publish_directory,
    ports_exposes: app.ports_exposes,
    redirect: app.redirect,
    health_check: {
      enabled: app.health_check_enabled,
      path: app.health_check_path,
      port: app.health_check_port,
      method: app.health_check_method,
      return_code: app.health_check_return_code,
      scheme: app.health_check_scheme,
      interval: app.health_check_interval,
      timeout: app.health_check_timeout,
      retries: app.health_check_retries,
      start_period: app.health_check_start_period,
    },
    source: {
      type: app.source_type,
      id: app.source_id,
    },
    destination: app.destination
      ? {
          id: app.destination.id,
          uuid: app.destination.uuid,
          name: app.destination.name,
          type: app.destination_type,
          server: app.destination.server
            ? {
                uuid: app.destination.server.uuid,
                name: app.destination.server.name,
                ip: app.destination.server.ip,
              }
            : undefined,
        }
      : undefined,
    last_online_at: app.last_online_at,
    last_restart_at: app.last_restart_at,
    last_restart_type: app.last_restart_type,
    restart_count: app.restart_count,
    created_at: app.created_at,
    updated_at: app.updated_at,
    secrets_redacted: true,
    identifiers: {
      ...(app.uuid ? { coolify_application_uuid: String(app.uuid) } : {}),
      ...(app.correlation_id ? { correlation_id: String(app.correlation_id) } : {}),
    },
  };
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function summarizeDeploymentForRead(
  deployment: Record<string, any>,
  options?: {
    logs?: string;
    logs_meta?: { total_entries?: number; showing?: string; chars?: number };
  },
): SafeDeploymentRead {
  const application = deployment.application as Record<string, any> | undefined;
  const applicationUuid =
    readString(deployment.application_uuid) ?? readString(application?.uuid) ?? null;
  const applicationName =
    readString(deployment.application_name) ?? readString(application?.name) ?? null;
  const applicationStatus =
    readString(deployment.application_status) ?? readString(application?.status) ?? null;

  return {
    deployment_uuid: readString(deployment.deployment_uuid) ?? readString(deployment.uuid) ?? null,
    deployment_id: readNumber(deployment.id),
    application_uuid: applicationUuid,
    application_name: applicationName,
    application_status: applicationStatus,
    health_result: applicationStatus,
    server_name:
      readString(deployment.server_name) ??
      readString((deployment.server as Record<string, any> | undefined)?.name) ??
      null,
    status: readString(deployment.status),
    commit_sha: readString(deployment.commit),
    force_rebuild: readBoolean(deployment.force_rebuild),
    restart_only: readBoolean(deployment.restart_only),
    is_webhook: readBoolean(deployment.is_webhook),
    is_api: readBoolean(deployment.is_api),
    created_at: readString(deployment.created_at),
    updated_at: readString(deployment.updated_at),
    finished_at: readString(deployment.finished_at),
    logs: options?.logs,
    logs_meta: options?.logs_meta,
    logs_redacted: options?.logs ? true : undefined,
    secrets_redacted: true,
  };
}

function deploymentIdentifiers(deployment: Record<string, any>): Record<string, string> {
  const app = deployment.application as Record<string, any> | undefined;
  return Object.fromEntries(
    [
      ['coolify_application_uuid', deployment.application_uuid ?? app?.uuid],
      ['coolify_deployment_uuid', deployment.deployment_uuid ?? deployment.uuid],
      ['correlation_id', deployment.correlation_id],
    ]
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );
}

export function filterLogText(
  raw: string,
  options: {
    search?: string;
    search_regex?: boolean;
    case_sensitive?: boolean;
    context_before?: number;
    context_after?: number;
    exception_only?: boolean;
    warning_only?: boolean;
    remove_ansi?: boolean;
    from?: string;
    to?: string;
    max_chars?: number;
  } = {},
): { logs: string; matched_lines: number; truncated: boolean; total_lines: number } {
  const ansi =
    // eslint-disable-next-line no-control-regex
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
  const source = options.remove_ansi === false ? String(raw) : String(raw).replace(ansi, '');
  const lines = source.split('\n');
  const matches = (line: string) => {
    if (options.search) {
      if (options.search_regex) {
        let re: RegExp;
        try {
          re = new RegExp(options.search, options.case_sensitive ? '' : 'i');
        } catch (error) {
          throw new Error(`invalid log search regex: ${(error as Error).message}`, {
            cause: error,
          });
        }
        if (!re.test(line)) return false;
      } else if (
        (options.case_sensitive ? line : line.toLowerCase()).includes(
          options.case_sensitive ? options.search : options.search.toLowerCase(),
        ) === false
      )
        return false;
    }
    if (options.exception_only && !/(exception|traceback|error|fatal|panic|failed)/i.test(line))
      return false;
    if (options.warning_only && !/(warn|warning)/i.test(line)) return false;
    const stamp = line.match(/\b\d{4}-\d\d-\d\dT[^\s\]]+/)?.[0];
    if (stamp && options.from && Date.parse(stamp) < Date.parse(options.from)) return false;
    if (stamp && options.to && Date.parse(stamp) > Date.parse(options.to)) return false;
    return true;
  };
  const matching = lines.map((line, i) => (matches(line) ? i : -1)).filter((i) => i >= 0);
  const selected = new Set<number>();
  if (
    options.search ||
    options.exception_only ||
    options.warning_only ||
    options.from ||
    options.to
  ) {
    const before = Math.min(Math.max(options.context_before ?? 0, 0), 20);
    const after = Math.min(Math.max(options.context_after ?? 0, 0), 20);
    for (const i of matching)
      for (let j = Math.max(0, i - before); j <= Math.min(lines.length - 1, i + after); j += 1)
        selected.add(j);
  } else lines.forEach((_, i) => selected.add(i));
  let result = [...selected]
    .sort((a, b) => a - b)
    .map((i) => lines[i])
    .join('\n');
  const maxChars = Math.min(Math.max(options.max_chars ?? 50000, 200), 100000);
  const truncated = result.length > maxChars;
  if (truncated) result = result.slice(-maxChars);
  return {
    logs: redactSensitiveText(result),
    matched_lines: matching.length,
    truncated,
    total_lines: lines.length,
  };
}

async function preflightApplicationMutation(
  client: CoolifyClient,
  uuid: string,
  requestedAction: 'deploy' | 'start' | 'stop' | 'restart',
): Promise<ApplicationMutationPreflight> {
  const [application, deploymentEnvelope] = await Promise.all([
    client.getApplication(uuid) as Promise<Record<string, any>>,
    client.listApplicationDeployments(uuid),
  ]);
  const deployments = Array.isArray(deploymentEnvelope.deployments)
    ? (deploymentEnvelope.deployments as Deployment[])
    : [];
  const activeDeployments = deployments.filter((deployment) => {
    const status = String(deployment.status || '').toLowerCase();
    return status === 'queued' || status === 'in_progress';
  }).length;
  const currentStatus = String(application.status || '');
  const normalizedStatus = currentStatus.toLowerCase();
  const isRunning = normalizedStatus.includes('running');

  if (
    (requestedAction === 'deploy' ||
      requestedAction === 'start' ||
      requestedAction === 'restart') &&
    activeDeployments > 0
  ) {
    return {
      uuid,
      name: application.name,
      requested_action: requestedAction,
      effective_action: requestedAction,
      status: 'blocked',
      reason: 'deployment_in_progress',
      current_status: currentStatus,
      active_deployments: activeDeployments,
    };
  }

  if (requestedAction === 'start' && isRunning) {
    return {
      uuid,
      name: application.name,
      requested_action: requestedAction,
      effective_action: 'start',
      status: 'noop',
      reason: 'already_running',
      current_status: currentStatus,
      active_deployments: activeDeployments,
    };
  }

  if (requestedAction === 'stop' && !isRunning) {
    return {
      uuid,
      name: application.name,
      requested_action: requestedAction,
      effective_action: 'stop',
      status: 'noop',
      reason: 'already_stopped',
      current_status: currentStatus,
      active_deployments: activeDeployments,
    };
  }

  if (requestedAction === 'restart' && !isRunning) {
    return {
      uuid,
      name: application.name,
      requested_action: requestedAction,
      effective_action: 'start',
      status: 'ready',
      reason: 'restart_translated_to_start',
      current_status: currentStatus,
      active_deployments: activeDeployments,
    };
  }

  return {
    uuid,
    name: application.name,
    requested_action: requestedAction,
    effective_action: requestedAction,
    status: 'ready',
    current_status: currentStatus,
    active_deployments: activeDeployments,
  };
}

/**
 * Truncate logs by entry count with pagination support.
 * Handles both JSON array format (Coolify deployment logs) and plain text.
 * Page 1 = most recent entries, page 2 = next older batch, etc.
 * Exported for testing.
 */
export function truncateLogs(
  logs: string,
  lineLimit: number = 200,
  charLimit: number = 50000,
  page: number = 1,
): TruncatedLogsResult {
  // Try parsing as JSON array (Coolify deployment log format)
  let lines: string[];
  let total: number;
  try {
    const entries: LogEntry[] = JSON.parse(logs);
    if (Array.isArray(entries)) {
      const visible = entries.filter((e) => !e.hidden);
      total = visible.length;
      const end = total - (page - 1) * lineLimit;
      const start = Math.max(0, end - lineLimit);
      const slice = visible.slice(start, end);
      lines = slice.map((e) => `[${e.timestamp ?? ''}] ${e.output ?? ''}`);
    } else {
      const allLines = logs.split('\n');
      total = allLines.length;
      const end = total - (page - 1) * lineLimit;
      const start = Math.max(0, end - lineLimit);
      lines = allLines.slice(start, end);
    }
  } catch {
    // Plain text logs — split by newlines
    const allLines = logs.split('\n');
    total = allLines.length;
    const end = total - (page - 1) * lineLimit;
    const start = Math.max(0, end - lineLimit);
    lines = allLines.slice(start, end);
  }

  const end = total - (page - 1) * lineLimit;
  const start = Math.max(0, end - lineLimit);
  let result = lines.join('\n');

  // Safety net: limit by characters
  if (result.length > charLimit) {
    const prefixLen = TRUNCATION_PREFIX.length;
    result = TRUNCATION_PREFIX + result.slice(-(charLimit - prefixLen));
  }

  return {
    logs: result,
    total,
    showing_start: start + 1,
    showing_end: Math.min(end, total),
  };
}

// =============================================================================
// Action Generators for HATEOAS-style responses
// =============================================================================

/** Generate contextual actions for an application based on its status */
export function getApplicationActions(uuid: string, status?: string): ResponseAction[] {
  const actions: ResponseAction[] = [
    { tool: 'application_logs', args: { uuid }, hint: 'View logs' },
    { tool: 'wait_for_application', args: { uuid }, hint: 'Wait for ready status' },
  ];
  const s = (status || '').toLowerCase();
  if (!s.includes('running')) {
    actions.push({
      tool: 'deployment',
      args: { action: 'list_for_app', uuid },
      hint: 'Deployments',
    });
  }
  return actions;
}

/** Generate contextual actions for a deployment */
export function getDeploymentActions(
  uuid: string,
  status: string,
  appUuid?: string,
): ResponseAction[] {
  const actions: ResponseAction[] = [];
  if (status === 'in_progress' || status === 'queued') {
    actions.push({ tool: 'deployment', args: { action: 'cancel', uuid }, hint: 'Cancel' });
  }
  if (appUuid) {
    actions.push({ tool: 'get_application', args: { uuid: appUuid }, hint: 'View app' });
    actions.push({ tool: 'application_logs', args: { uuid: appUuid }, hint: 'App logs' });
    actions.push({
      tool: 'wait_for_application',
      args: { uuid: appUuid },
      hint: 'Wait for ready status',
    });
  }
  return actions;
}

/** Generate pagination info for list endpoints */
export function getPagination(
  tool: string,
  page?: number,
  perPage?: number,
  count?: number,
): ResponsePagination | undefined {
  const p = page ?? 1;
  const pp = perPage ?? 50;
  if (!count || count < pp) {
    return p > 1 ? { prev: { tool, args: { page: p - 1, per_page: pp } } } : undefined;
  }
  return {
    ...(p > 1 && { prev: { tool, args: { page: p - 1, per_page: pp } } }),
    next: { tool, args: { page: p + 1, per_page: pp } },
  };
}

/** Wrap handler with error handling and HATEOAS actions */
function wrapWithActions<T>(
  fn: () => Promise<T>,
  getActions?: (result: T) => ResponseAction[],
  getPaginationFn?: (result: T) => ResponsePagination | undefined,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  return fn()
    .then((result) => {
      const actions = getActions?.(result) ?? [];
      const pagination = getPaginationFn?.(result);
      const response: Record<string, unknown> = { data: result };
      if (actions.length > 0) response._actions = actions;
      if (pagination) response._pagination = pagination;
      return { content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }] };
    })
    .catch((error) => ({
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    }));
}

export class CoolifyMcpServer extends McpServer {
  private readonly client: CoolifyClient;
  private readonly docsSearch: DocsSearchEngine = new DocsSearchEngine();

  constructor(config: CoolifyConfig) {
    super({ name: 'coolify', version: VERSION });
    this.client = new CoolifyClient(config);
    this.registerTools();
  }

  async connect(transport: Transport): Promise<void> {
    await super.connect(transport);
  }

  private registerTools(): void {
    // =========================================================================
    // Meta (2 tools)
    // =========================================================================
    this.tool('get_version', 'Coolify API version', {}, async () =>
      wrap(() => this.client.getVersion()),
    );

    this.tool('get_mcp_version', 'MCP server version', {}, async () => ({
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ version: VERSION, name: '@masonator/coolify-mcp' }),
        },
      ],
    }));

    // =========================================================================
    // Infrastructure Overview (1 tool)
    // =========================================================================
    this.tool(
      'get_infrastructure_overview',
      'Overview of all resources with counts',
      {},
      async () =>
        wrap(async () => {
          const results = await Promise.allSettled([
            this.client.listServers({ summary: true }),
            this.client.listProjects({ summary: true }),
            this.client.listApplications({ summary: true }),
            this.client.listDatabases({ summary: true }),
            this.client.listServices({ summary: true }),
          ]);
          const extract = <T>(r: PromiseSettledResult<T>): T | [] =>
            r.status === 'fulfilled' ? r.value : [];
          const [servers, projects, applications, databases, services] = [
            extract(results[0]) as ServerSummary[],
            extract(results[1]) as ProjectSummary[],
            extract(results[2]) as ApplicationSummary[],
            extract(results[3]) as DatabaseSummary[],
            extract(results[4]) as ServiceSummary[],
          ];
          const errors = results
            .map((r, i) =>
              r.status === 'rejected'
                ? `${['servers', 'projects', 'applications', 'databases', 'services'][i]}: ${r.reason}`
                : null,
            )
            .filter(Boolean);
          return {
            summary: {
              servers: servers.length,
              projects: projects.length,
              applications: applications.length,
              databases: databases.length,
              services: services.length,
            },
            servers,
            projects,
            applications,
            databases,
            services,
            ...(errors.length > 0 && { errors }),
          };
        }),
    );

    // =========================================================================
    // Diagnostics (3 tools)
    // =========================================================================
    this.tool(
      'diagnose_app',
      'App diagnostics by UUID/name/domain',
      { query: z.string() },
      async ({ query }) => wrap(() => this.client.diagnoseApplication(query)),
    );

    this.tool(
      'diagnose_server',
      'Server diagnostics by UUID/name/IP',
      { query: z.string() },
      async ({ query }) => wrap(() => this.client.diagnoseServer(query)),
    );

    this.tool('find_issues', 'Scan infrastructure for problems', {}, async () =>
      wrap(() => this.client.findInfrastructureIssues()),
    );

    // =========================================================================
    // Servers (5 tools)
    // =========================================================================
    this.tool(
      'list_servers',
      'List servers (summary)',
      { page: z.number().optional(), per_page: z.number().optional() },
      async ({ page, per_page }) =>
        wrap(() => this.client.listServers({ page, per_page, summary: true })),
    );

    this.tool('get_server', 'Server details', { uuid: z.string() }, async ({ uuid }) =>
      wrap(() => this.client.getServer(uuid)),
    );

    this.tool('server_resources', 'Resources on server', { uuid: z.string() }, async ({ uuid }) =>
      wrap(() => this.client.getServerResources(uuid)),
    );

    this.tool('server_domains', 'Domains on server', { uuid: z.string() }, async ({ uuid }) =>
      wrap(() => this.client.getServerDomains(uuid)),
    );

    this.tool(
      'validate_server',
      'Validate server connection',
      { uuid: z.string() },
      async ({ uuid }) => wrap(() => this.client.validateServer(uuid)),
    );

    // =========================================================================
    // Projects (1 tool - consolidated CRUD)
    // =========================================================================
    this.tool(
      'projects',
      'Manage projects: list/get/create/update/delete',
      {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        uuid: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        page: z.number().optional(),
        per_page: z.number().optional(),
      },
      async ({ action, uuid, name, description, page, per_page }) => {
        switch (action) {
          case 'list':
            return wrap(() => this.client.listProjects({ page, per_page, summary: true }));
          case 'get':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.getProject(uuid));
          case 'create':
            if (!name)
              return { content: [{ type: 'text' as const, text: 'Error: name required' }] };
            return wrap(() => this.client.createProject({ name, description }));
          case 'update':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.updateProject(uuid, { name, description }));
          case 'delete':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.deleteProject(uuid));
        }
      },
    );

    // =========================================================================
    // Environments (1 tool - consolidated CRUD)
    // =========================================================================
    this.tool(
      'environments',
      'Manage environments: list/get/create/delete (get includes dragonfly/keydb/clickhouse DBs missing from API)',
      {
        action: z.enum(['list', 'get', 'create', 'delete']),
        project_uuid: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
      },
      async ({ action, project_uuid, name, description }) => {
        switch (action) {
          case 'list':
            return wrap(() => this.client.listProjectEnvironments(project_uuid));
          case 'get':
            if (!name)
              return { content: [{ type: 'text' as const, text: 'Error: name required' }] };
            // Use enhanced method that includes missing DB types (#88)
            return wrap(() => this.client.getProjectEnvironmentWithDatabases(project_uuid, name));
          case 'create':
            if (!name)
              return { content: [{ type: 'text' as const, text: 'Error: name required' }] };
            return wrap(() =>
              this.client.createProjectEnvironment(project_uuid, { name, description }),
            );
          case 'delete':
            if (!name)
              return { content: [{ type: 'text' as const, text: 'Error: name required' }] };
            return wrap(() => this.client.deleteProjectEnvironment(project_uuid, name));
        }
      },
    );

    // =========================================================================
    // Applications (4 tools)
    // =========================================================================
    this.tool(
      'list_applications',
      'List apps (summary)',
      { page: z.number().optional(), per_page: z.number().optional() },
      async ({ page, per_page }) =>
        wrapWithActions(
          () => this.client.listApplications({ page, per_page, summary: true }),
          undefined,
          (result) =>
            getPagination('list_applications', page, per_page, (result as unknown[]).length),
        ),
    );

    this.tool(
      'get_application',
      'App status/details with sensitive fields redacted',
      { uuid: z.string() },
      async ({ uuid }) =>
        wrapWithActions(
          async () =>
            summarizeApplicationForRead(
              (await this.client.getApplication(uuid)) as Record<string, any>,
            ),
          (app) =>
            getApplicationActions(
              String((app as Record<string, unknown>).uuid || ''),
              String((app as Record<string, unknown>).status || ''),
            ),
        ),
    );

    this.tool(
      'create_application',
      'Safely create a Git-backed Coolify application. Preview by default; execute=true is required to create and never deploys.',
      {
        name: z.string(),
        git_repository: z.string(),
        git_branch: z.string(),
        server_uuid: z.string(),
        project_uuid: z.string(),
        environment_uuid: z.string().optional(),
        environment_name: z.string().optional(),
        destination_uuid: z.string().optional(),
        build_pack: z.enum(CREATE_APPLICATION_BUILD_PACKS).optional(),
        build_type: z.enum(CREATE_APPLICATION_BUILD_PACKS).optional(),
        dockerfile_location: z.string().optional(),
        base_directory: z.string().optional(),
        ports_exposes: z.string().optional(),
        domain: z.string().optional(),
        auto_deploy: z.boolean().optional(),
        execute: z.boolean().default(false),
      },
      async (rawArgs) => {
        const args = rawArgs as CreateApplicationToolArgs;
        const validationErrors = validateCreateApplicationInput(args);
        if (args.execute === true && args.ports_exposes === undefined) {
          validationErrors.push(
            'ports_exposes is required by Coolify POST /applications/public when execute=true',
          );
        }
        if (validationErrors.length > 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: create_application refused: ${validationErrors.join('; ')}`,
              },
            ],
          };
        }

        const payload = createApplicationPayload(args);
        if (args.execute !== true) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    mode: 'preview',
                    execute: false,
                    created: false,
                    deployed: false,
                    message: 'Preview only: no Coolify application was created.',
                    endpoint: CREATE_APPLICATION_ENDPOINT,
                    payload,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        try {
          const [server, project, environments] = await Promise.all([
            this.client.getServer(args.server_uuid!.trim()),
            this.client.getProject(args.project_uuid!.trim()),
            this.client.listProjectEnvironments(args.project_uuid!.trim()),
          ]);
          if (!isRecord(server) || server.uuid !== args.server_uuid!.trim()) {
            throw new Error('server_uuid could not be verified against Coolify');
          }
          if (server.is_usable === false || server.is_reachable === false) {
            throw new Error('server_uuid identifies a server that is not usable');
          }
          if (!isRecord(project) || project.uuid !== args.project_uuid!.trim()) {
            throw new Error('project_uuid could not be verified against Coolify');
          }
          if (!Array.isArray(environments)) {
            throw new Error('Coolify returned a malformed environment response');
          }
          const environmentUuid = args.environment_uuid?.trim();
          const environmentName = args.environment_name?.trim();
          const environment = environments.find((item) => {
            if (!isRecord(item)) return false;
            if (environmentUuid) return item.uuid === environmentUuid;
            return item.name === environmentName;
          });
          if (!environment) {
            throw new Error(
              environmentUuid
                ? 'environment_uuid was not found in the requested project'
                : 'environment_name was not found in the requested project',
            );
          }
          if (
            typeof environment.project_uuid === 'string' &&
            environment.project_uuid !== args.project_uuid!.trim()
          ) {
            throw new Error(
              environmentUuid
                ? 'environment_uuid does not belong to project_uuid'
                : 'environment_name does not belong to project_uuid',
            );
          }

          const applications = await this.client.listApplications();
          if (!Array.isArray(applications)) {
            throw new Error('Coolify returned a malformed application list');
          }
          const requestedName = args.name!.trim().toLocaleLowerCase();
          const duplicate = applications.find(
            (application) =>
              isRecord(application) &&
              typeof application.name === 'string' &&
              application.name.trim().toLocaleLowerCase() === requestedName,
          );
          if (duplicate) {
            throw new Error(
              'an application with the same name already exists; refusing to modify it',
            );
          }

          const created = await this.client.createApplicationPublic(payload as any);
          if (
            !isRecord(created) ||
            typeof created.uuid !== 'string' ||
            !isSafeCoolifyResourceId(created.uuid)
          ) {
            throw new Error('Coolify returned malformed creation metadata; refusing to continue');
          }
          const application = await this.client.getApplication(created.uuid);
          if (!isRecord(application) || application.uuid !== created.uuid) {
            throw new Error(
              `Coolify created ${created.uuid}, but returned malformed application metadata`,
            );
          }
          const summarized = summarizeApplicationForRead(application);
          const safeApplication = JSON.parse(
            this.client.sanitizeError(JSON.stringify(summarized)),
          ) as Record<string, unknown>;
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    mode: 'execute',
                    execute: true,
                    created: true,
                    deployed: false,
                    message: 'Application created. No deployment was requested or started.',
                    endpoint: CREATE_APPLICATION_ENDPOINT,
                    application: safeApplication,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: create_application refused or failed safely: ${this.client.sanitizeError(error)}`,
              },
            ],
          };
        }
      },
    );

    this.tool(
      'application',
      'Manage app: create/update/delete/deploy/delete_preview',
      {
        action: z.enum([
          'create_public',
          'create_github',
          'create_key',
          'create_dockerimage',
          'update',
          'deploy',
          'delete',
          'delete_preview',
        ]),
        uuid: z.string().optional(),
        // Create fields
        project_uuid: z.string().optional(),
        server_uuid: z.string().optional(),
        github_app_uuid: z.string().optional(),
        private_key_uuid: z.string().optional(),
        destination_uuid: z.string().optional(),
        git_repository: z.string().optional(),
        git_branch: z.string().optional(),
        environment_name: z.string().optional(),
        environment_uuid: z.string().optional(),
        build_pack: z.string().optional(),
        ports_exposes: z.string().optional(),
        // Docker image fields
        docker_registry_image_name: z.string().optional(),
        docker_registry_image_tag: z.string().optional(),
        // Update fields
        name: z.string().optional(),
        description: z.string().optional(),
        fqdn: z.string().optional(),
        domains: z.string().optional(),
        custom_docker_run_options: z.string().optional(),
        custom_labels: z.string().optional(),
        instant_deploy: z.boolean().optional(),
        force: z.boolean().optional(),
        // Health check fields
        health_check_enabled: z.boolean().optional(),
        health_check_path: z.string().optional(),
        health_check_port: z.number().optional(),
        health_check_host: z.string().optional(),
        health_check_method: z.string().optional(),
        health_check_return_code: z.number().optional(),
        health_check_scheme: z.string().optional(),
        health_check_response_text: z.string().optional(),
        health_check_interval: z.number().optional(),
        health_check_timeout: z.number().optional(),
        health_check_retries: z.number().optional(),
        health_check_start_period: z.number().optional(),
        // Build configuration fields (accepted on create_public/github/key + update;
        // create_dockerimage ignores these — pre-built image, no build step)
        base_directory: z.string().optional(),
        publish_directory: z.string().optional(),
        install_command: z.string().optional(),
        build_command: z.string().optional(),
        start_command: z.string().optional(),
        dockerfile_location: z.string().optional(),
        watch_paths: z.string().optional(),
        // Update-only: Coolify strips dockerfile_target_build on every create endpoint
        // (controller $allowedFields line 1014) but accepts on PATCH (line 2497).
        dockerfile_target_build: z.string().optional(),
        // Delete fields
        delete_volumes: z.boolean().optional(),
        // Preview fields
        pull_request_id: z.number().optional(),
      },
      async (args) => {
        const { action, uuid, delete_volumes } = args;
        switch (action) {
          case 'create_public':
            if (
              !args.project_uuid ||
              !args.server_uuid ||
              !args.git_repository ||
              !args.git_branch ||
              !args.build_pack ||
              !args.ports_exposes
            ) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: 'Error: project_uuid, server_uuid, git_repository, git_branch, build_pack, ports_exposes required',
                  },
                ],
              };
            }
            return wrap(() =>
              this.client.createApplicationPublic({
                project_uuid: args.project_uuid!,
                server_uuid: args.server_uuid!,
                destination_uuid: args.destination_uuid,
                git_repository: args.git_repository!,
                git_branch: args.git_branch!,
                build_pack: args.build_pack! as BuildPack,
                ports_exposes: args.ports_exposes!,
                environment_name: args.environment_name,
                environment_uuid: args.environment_uuid,
                name: args.name,
                description: args.description,
                fqdn: args.fqdn,
                domains: args.domains,
                base_directory: args.base_directory,
                publish_directory: args.publish_directory,
                install_command: args.install_command,
                build_command: args.build_command,
                start_command: args.start_command,
                dockerfile_location: args.dockerfile_location,
                watch_paths: args.watch_paths,
                health_check_enabled: args.health_check_enabled,
                health_check_path: args.health_check_path,
                health_check_port: args.health_check_port,
                health_check_host: args.health_check_host,
                health_check_method: args.health_check_method,
                health_check_return_code: args.health_check_return_code,
                health_check_scheme: args.health_check_scheme,
                health_check_response_text: args.health_check_response_text,
                health_check_interval: args.health_check_interval,
                health_check_timeout: args.health_check_timeout,
                health_check_retries: args.health_check_retries,
                health_check_start_period: args.health_check_start_period,
                custom_docker_run_options: args.custom_docker_run_options,
                custom_labels: args.custom_labels,
                instant_deploy: args.instant_deploy,
              }),
            );
          case 'create_github':
            if (
              !args.project_uuid ||
              !args.server_uuid ||
              !args.github_app_uuid ||
              !args.git_repository ||
              !args.git_branch
            ) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: 'Error: project_uuid, server_uuid, github_app_uuid, git_repository, git_branch required',
                  },
                ],
              };
            }
            return wrap(() =>
              this.client.createApplicationPrivateGH({
                project_uuid: args.project_uuid!,
                server_uuid: args.server_uuid!,
                github_app_uuid: args.github_app_uuid!,
                destination_uuid: args.destination_uuid,
                git_repository: args.git_repository!,
                git_branch: args.git_branch!,
                build_pack: args.build_pack as BuildPack | undefined,
                ports_exposes: args.ports_exposes,
                environment_name: args.environment_name,
                environment_uuid: args.environment_uuid,
                name: args.name,
                description: args.description,
                fqdn: args.fqdn,
                domains: args.domains,
                base_directory: args.base_directory,
                publish_directory: args.publish_directory,
                install_command: args.install_command,
                build_command: args.build_command,
                start_command: args.start_command,
                dockerfile_location: args.dockerfile_location,
                watch_paths: args.watch_paths,
                health_check_enabled: args.health_check_enabled,
                health_check_path: args.health_check_path,
                health_check_port: args.health_check_port,
                health_check_host: args.health_check_host,
                health_check_method: args.health_check_method,
                health_check_return_code: args.health_check_return_code,
                health_check_scheme: args.health_check_scheme,
                health_check_response_text: args.health_check_response_text,
                health_check_interval: args.health_check_interval,
                health_check_timeout: args.health_check_timeout,
                health_check_retries: args.health_check_retries,
                health_check_start_period: args.health_check_start_period,
                custom_docker_run_options: args.custom_docker_run_options,
                custom_labels: args.custom_labels,
                instant_deploy: args.instant_deploy,
              }),
            );
          case 'create_key':
            if (
              !args.project_uuid ||
              !args.server_uuid ||
              !args.private_key_uuid ||
              !args.git_repository ||
              !args.git_branch
            ) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: 'Error: project_uuid, server_uuid, private_key_uuid, git_repository, git_branch required',
                  },
                ],
              };
            }
            return wrap(() =>
              this.client.createApplicationPrivateKey({
                project_uuid: args.project_uuid!,
                server_uuid: args.server_uuid!,
                private_key_uuid: args.private_key_uuid!,
                destination_uuid: args.destination_uuid,
                git_repository: args.git_repository!,
                git_branch: args.git_branch!,
                build_pack: args.build_pack as BuildPack | undefined,
                ports_exposes: args.ports_exposes,
                environment_name: args.environment_name,
                environment_uuid: args.environment_uuid,
                name: args.name,
                description: args.description,
                fqdn: args.fqdn,
                domains: args.domains,
                base_directory: args.base_directory,
                publish_directory: args.publish_directory,
                install_command: args.install_command,
                build_command: args.build_command,
                start_command: args.start_command,
                dockerfile_location: args.dockerfile_location,
                watch_paths: args.watch_paths,
                health_check_enabled: args.health_check_enabled,
                health_check_path: args.health_check_path,
                health_check_port: args.health_check_port,
                health_check_host: args.health_check_host,
                health_check_method: args.health_check_method,
                health_check_return_code: args.health_check_return_code,
                health_check_scheme: args.health_check_scheme,
                health_check_response_text: args.health_check_response_text,
                health_check_interval: args.health_check_interval,
                health_check_timeout: args.health_check_timeout,
                health_check_retries: args.health_check_retries,
                health_check_start_period: args.health_check_start_period,
                custom_docker_run_options: args.custom_docker_run_options,
                custom_labels: args.custom_labels,
                instant_deploy: args.instant_deploy,
              }),
            );
          case 'create_dockerimage':
            if (
              !args.project_uuid ||
              !args.server_uuid ||
              !args.docker_registry_image_name ||
              !args.ports_exposes
            ) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: 'Error: project_uuid, server_uuid, docker_registry_image_name, ports_exposes required',
                  },
                ],
              };
            }
            return wrap(() =>
              this.client.createApplicationDockerImage({
                project_uuid: args.project_uuid!,
                server_uuid: args.server_uuid!,
                destination_uuid: args.destination_uuid,
                docker_registry_image_name: args.docker_registry_image_name!,
                ports_exposes: args.ports_exposes!,
                docker_registry_image_tag: args.docker_registry_image_tag,
                environment_name: args.environment_name,
                environment_uuid: args.environment_uuid,
                name: args.name,
                description: args.description,
                fqdn: args.fqdn,
                domains: args.domains,
                // Build-config fields (base_directory, install_command, etc.)
                // are intentionally NOT forwarded: /applications/dockerimage is
                // for pre-built registry images and has no build step.
                health_check_enabled: args.health_check_enabled,
                health_check_path: args.health_check_path,
                health_check_port: args.health_check_port,
                health_check_host: args.health_check_host,
                health_check_method: args.health_check_method,
                health_check_return_code: args.health_check_return_code,
                health_check_scheme: args.health_check_scheme,
                health_check_response_text: args.health_check_response_text,
                health_check_interval: args.health_check_interval,
                health_check_timeout: args.health_check_timeout,
                health_check_retries: args.health_check_retries,
                health_check_start_period: args.health_check_start_period,
                custom_docker_run_options: args.custom_docker_run_options,
                custom_labels: args.custom_labels,
                instant_deploy: args.instant_deploy,
              }),
            );
          case 'update': {
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { action: _, uuid: __, delete_volumes: ___, ...updateData } = args;
            return wrap(() => this.client.updateApplication(uuid, updateData));
          }
          case 'deploy':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrapWithActions(
              () => this.client.deployByTagOrUuid(uuid, Boolean(args.force)),
              (): ResponseAction[] => [
                {
                  tool: 'deployment',
                  args: { action: 'list_for_app', uuid },
                  hint: 'Check deployments',
                },
                {
                  tool: 'wait_for_application',
                  args: { uuid },
                  hint: 'Wait for ready status',
                },
              ],
            );
          case 'delete':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() =>
              this.client.deleteApplication(uuid, { deleteVolumes: delete_volumes }),
            );
          case 'delete_preview':
            if (!uuid || !args.pull_request_id)
              return {
                content: [{ type: 'text' as const, text: 'Error: uuid, pull_request_id required' }],
              };
            return wrap(() => this.client.deleteApplicationPreview(uuid, args.pull_request_id!));
        }
      },
    );

    this.tool(
      'application_logs',
      'Get bounded app logs with automatic secret redaction, search/regex filtering, timestamp range, context lines, exception/warning modes, and ANSI removal.',
      {
        uuid: z.string(),
        lines: z.number().optional(),
        search: z.string().optional(),
        search_regex: z.boolean().optional(),
        case_sensitive: z.boolean().optional(),
        context_before: z.number().optional(),
        context_after: z.number().optional(),
        exception_only: z.boolean().optional(),
        warning_only: z.boolean().optional(),
        remove_ansi: z.boolean().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        max_chars: z.number().optional(),
      },
      async ({ uuid, lines, ...options }) =>
        wrap(async () => ({
          uuid,
          lines_requested: lines ?? 100,
          redacted: true,
          ...filterLogText(await this.client.getApplicationLogs(uuid, lines), options),
          identifiers: { coolify_application_uuid: uuid },
        })),
    );

    this.tool(
      'wait_for_application',
      'Poll app status until it is ready and deployments finish',
      {
        uuid: z.string(),
        desired_statuses: z.array(z.string()).optional(),
        timeout_ms: z.number().optional(),
        poll_interval_ms: z.number().optional(),
        require_no_running_deployments: z.boolean().optional(),
      },
      async ({
        uuid,
        desired_statuses,
        timeout_ms,
        poll_interval_ms,
        require_no_running_deployments,
      }) =>
        wrap(() =>
          this.client.waitForApplication(uuid, {
            desiredStatuses: desired_statuses,
            timeoutMs: timeout_ms,
            pollIntervalMs: poll_interval_ms,
            requireNoRunningDeployments: require_no_running_deployments,
          }),
        ),
    );

    // =========================================================================
    // Databases (3 tools)
    // =========================================================================
    this.tool(
      'list_databases',
      'List databases (summary)',
      { page: z.number().optional(), per_page: z.number().optional() },
      async ({ page, per_page }) =>
        wrap(() => this.client.listDatabases({ page, per_page, summary: true })),
    );

    this.tool('get_database', 'Database details', { uuid: z.string() }, async ({ uuid }) =>
      wrap(() => this.client.getDatabase(uuid)),
    );

    this.tool(
      'database',
      'Manage database: create/delete',
      {
        action: z.enum(['create', 'delete']),
        type: z
          .enum([
            'postgresql',
            'mysql',
            'mariadb',
            'mongodb',
            'redis',
            'keydb',
            'clickhouse',
            'dragonfly',
          ])
          .optional(),
        uuid: z.string().optional(),
        server_uuid: z.string().optional(),
        project_uuid: z.string().optional(),
        environment_name: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        is_public: z.boolean().optional(),
        public_port: z.number().optional(),
        instant_deploy: z.boolean().optional(),
        delete_volumes: z.boolean().optional(),
        // DB-specific optional fields
        postgres_user: z.string().optional(),
        postgres_password: z.string().optional(),
        postgres_db: z.string().optional(),
        mysql_root_password: z.string().optional(),
        mysql_user: z.string().optional(),
        mysql_password: z.string().optional(),
        mysql_database: z.string().optional(),
        mariadb_root_password: z.string().optional(),
        mariadb_user: z.string().optional(),
        mariadb_password: z.string().optional(),
        mariadb_database: z.string().optional(),
        mongo_initdb_root_username: z.string().optional(),
        mongo_initdb_root_password: z.string().optional(),
        mongo_initdb_database: z.string().optional(),
        redis_password: z.string().optional(),
        keydb_password: z.string().optional(),
        clickhouse_admin_user: z.string().optional(),
        clickhouse_admin_password: z.string().optional(),
        dragonfly_password: z.string().optional(),
      },
      async (args) => {
        const { action, type, uuid, delete_volumes, ...dbData } = args;
        if (action === 'delete') {
          if (!uuid) return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
          return wrap(() => this.client.deleteDatabase(uuid, { deleteVolumes: delete_volumes }));
        }
        // create
        if (!type || !args.server_uuid || !args.project_uuid) {
          return {
            content: [
              { type: 'text' as const, text: 'Error: type, server_uuid, project_uuid required' },
            ],
          };
        }
        const dbMethods: Record<string, (data: any) => Promise<any>> = {
          postgresql: (d) => this.client.createPostgresql(d),
          mysql: (d) => this.client.createMysql(d),
          mariadb: (d) => this.client.createMariadb(d),
          mongodb: (d) => this.client.createMongodb(d),
          redis: (d) => this.client.createRedis(d),
          keydb: (d) => this.client.createKeydb(d),
          clickhouse: (d) => this.client.createClickhouse(d),
          dragonfly: (d) => this.client.createDragonfly(d),
        };
        return wrap(() => dbMethods[type](dbData));
      },
    );

    // =========================================================================
    // Services (3 tools)
    // =========================================================================
    this.tool(
      'list_services',
      'List services (summary)',
      { page: z.number().optional(), per_page: z.number().optional() },
      async ({ page, per_page }) =>
        wrap(() => this.client.listServices({ page, per_page, summary: true })),
    );

    this.tool('get_service', 'Service details', { uuid: z.string() }, async ({ uuid }) =>
      wrap(() => this.client.getService(uuid)),
    );

    this.tool(
      'get_service_compose',
      'Read an existing service Docker Compose file with secrets and environment values redacted',
      { uuid: z.string() },
      async ({ uuid }) =>
        wrap(async () => {
          const result = await this.client.getServiceCompose(uuid);
          const compose = decodeCompose(result.docker_compose_raw);
          return {
            uuid,
            docker_compose_raw: redactCompose(compose),
            expected_hash: composeHash(compose),
            secrets_redacted: true,
          };
        }),
    );

    this.tool(
      'update_service_compose',
      'Validate and preview a service Docker Compose update; writing requires apply=true and the current expected_hash',
      {
        uuid: z.string(),
        docker_compose_raw: z.string(),
        expected_hash: z.string().regex(/^[a-f0-9]{64}$/i),
        dry_run: z.boolean().default(true),
        apply: z.boolean().default(false),
      },
      async ({ uuid, docker_compose_raw, expected_hash, dry_run, apply }) =>
        wrap(async () => {
          validateCompose(docker_compose_raw);
          const current = await this.client.getServiceCompose(uuid);
          const currentCompose = decodeCompose(current.docker_compose_raw);
          const currentHash = composeHash(currentCompose);
          if (currentHash !== expected_hash) {
            throw new Error(
              `Concurrent change detected: expected_hash does not match current service compose hash (${currentHash})`,
            );
          }
          const diff = redactedComposeDiff(currentCompose, docker_compose_raw);
          if (dry_run || !apply) {
            return {
              uuid,
              dry_run: true,
              applied: false,
              expected_hash,
              diff,
              verification: { yaml_valid: true, hash_match: true, secrets_redacted: true },
            };
          }
          const updated = await this.client.updateServiceCompose(uuid, docker_compose_raw);
          const verified = await this.client.getServiceCompose(uuid);
          const verifiedCompose = decodeCompose(verified.docker_compose_raw);
          return {
            uuid,
            dry_run: false,
            applied: true,
            expected_hash,
            diff,
            verification: {
              yaml_valid: true,
              hash_match: true,
              persisted_hash: composeHash(verifiedCompose),
              persisted: verifiedCompose === docker_compose_raw,
              secrets_redacted: true,
            },
            result: { uuid: updated.uuid },
          };
        }),
    );

    this.tool(
      'service',
      'Manage service: create/update/delete',
      {
        action: z.enum(['create', 'update', 'delete']),
        uuid: z.string().optional(),
        type: z.string().optional(),
        server_uuid: z.string().optional(),
        project_uuid: z.string().optional(),
        environment_name: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        instant_deploy: z.boolean().optional(),
        docker_compose_raw: z
          .string()
          .optional()
          .describe('Raw docker-compose YAML for custom services (auto base64-encoded)'),
        delete_volumes: z.boolean().optional(),
      },
      async (args) => {
        const { action, uuid, delete_volumes } = args;
        switch (action) {
          case 'create':
            if (!args.server_uuid || !args.project_uuid) {
              return {
                content: [
                  { type: 'text' as const, text: 'Error: server_uuid, project_uuid required' },
                ],
              };
            }
            return wrap(() =>
              this.client.createService({
                project_uuid: args.project_uuid!,
                server_uuid: args.server_uuid!,
                type: args.type,
                name: args.name,
                description: args.description,
                environment_name: args.environment_name,
                instant_deploy: args.instant_deploy,
                docker_compose_raw: args.docker_compose_raw,
              }),
            );
          case 'update': {
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { action: _, uuid: __, delete_volumes: ___, ...updateData } = args;
            return wrap(() => this.client.updateService(uuid, updateData));
          }
          case 'delete':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.deleteService(uuid, { deleteVolumes: delete_volumes }));
        }
      },
    );

    // =========================================================================
    // Resource Control (1 tool - start/stop/restart for all types)
    // =========================================================================
    this.tool(
      'control',
      'Start/stop/restart app, database, or service with dry-run support and duplicate-operation guardrails',
      {
        resource: z.enum(['application', 'database', 'service']),
        action: z.enum(['start', 'stop', 'restart']),
        uuid: z.string(),
        dry_run: z.boolean().optional(),
      },
      async ({ resource, action, uuid, dry_run }) => {
        const methods: Record<string, Record<string, (u: string) => Promise<unknown>>> = {
          application: {
            start: (u) => this.client.startApplication(u),
            stop: (u) => this.client.stopApplication(u),
            restart: (u) => this.client.restartApplication(u),
          },
          database: {
            start: (u) => this.client.startDatabase(u),
            stop: (u) => this.client.stopDatabase(u),
            restart: (u) => this.client.restartDatabase(u),
          },
          service: {
            start: (u) => this.client.startService(u),
            stop: (u) => this.client.stopService(u),
            restart: (u) => this.client.restartService(u),
          },
        };

        // Generate contextual actions based on resource type and action taken
        const getControlActions = (): ResponseAction[] => {
          const actions: ResponseAction[] = [];
          if (resource === 'application') {
            actions.push({ tool: 'application_logs', args: { uuid }, hint: 'View logs' });
            actions.push({ tool: 'get_application', args: { uuid }, hint: 'Check status' });
            actions.push({
              tool: 'wait_for_application',
              args: { uuid },
              hint: 'Wait for ready status',
            });
          } else if (resource === 'database') {
            actions.push({ tool: 'get_database', args: { uuid }, hint: 'Check status' });
          } else if (resource === 'service') {
            actions.push({ tool: 'get_service', args: { uuid }, hint: 'Check status' });
          }
          return actions;
        };

        if (resource === 'application') {
          return wrapWithActions(async () => {
            const preflight = await preflightApplicationMutation(this.client, uuid, action);
            if (dry_run || preflight.status !== 'ready') {
              return {
                ...preflight,
                dry_run: Boolean(dry_run),
                executed: false,
              };
            }
            const result = await methods.application[preflight.effective_action](uuid);
            return {
              ...preflight,
              dry_run: false,
              executed: true,
              result,
            };
          }, getControlActions);
        }

        return wrapWithActions(async () => {
          if (dry_run) {
            return {
              uuid,
              resource,
              requested_action: action,
              effective_action: action,
              status: 'ready',
              dry_run: true,
              executed: false,
            };
          }
          return methods[resource][action](uuid);
        }, getControlActions);
      },
    );

    // =========================================================================
    // Environment Variables (1 tool - consolidated)
    // =========================================================================
    this.tool(
      'env_vars',
      "Manage env vars for app, service, or database. Values are masked by default (returned as '***') to avoid leaking secrets to MCP clients; pass reveal=true on the list action when the caller explicitly needs the plaintext (e.g. 'what is FOO set to?'). Set is_buildtime=false (and/or is_runtime=true) for runtime-only vars to avoid Dockerfile ARG issues with multiline values like PEM keys.",
      {
        resource: z.enum(['application', 'service', 'database']),
        action: z.enum(['list', 'create', 'update', 'delete', 'bulk_update']),
        uuid: z.string(),
        key: z.string().optional(),
        value: z.string().optional(),
        env_uuid: z.string().optional(),
        is_buildtime: z.boolean().optional(),
        is_runtime: z.boolean().optional(),
        reveal: z.boolean().optional(),
        data: z
          .array(
            z.object({
              key: z.string(),
              value: z.string(),
              is_preview: z.boolean().optional(),
              is_buildtime: z.boolean().optional(),
              is_runtime: z.boolean().optional(),
              is_literal: z.boolean().optional(),
              is_multiline: z.boolean().optional(),
              is_shown_once: z.boolean().optional(),
            }),
          )
          .optional(),
      },
      async ({
        resource,
        action,
        uuid,
        key,
        value,
        env_uuid,
        is_buildtime,
        is_runtime,
        reveal,
        data,
      }) => {
        if (resource === 'application') {
          switch (action) {
            case 'list':
              return wrap(() =>
                this.client.listApplicationEnvVars(uuid, { summary: true, reveal }),
              );
            case 'create':
              if (!key || !value)
                return { content: [{ type: 'text' as const, text: 'Error: key, value required' }] };
              return wrap(() =>
                this.client.createApplicationEnvVar(uuid, {
                  key,
                  value,
                  is_buildtime,
                  is_runtime,
                }),
              );
            case 'update':
              if (!key || !value)
                return { content: [{ type: 'text' as const, text: 'Error: key, value required' }] };
              return wrap(() =>
                this.client.updateApplicationEnvVar(uuid, {
                  key,
                  value,
                  is_buildtime,
                  is_runtime,
                }),
              );
            case 'delete':
              if (!env_uuid)
                return { content: [{ type: 'text' as const, text: 'Error: env_uuid required' }] };
              return wrap(() => this.client.deleteApplicationEnvVar(uuid, env_uuid));
            case 'bulk_update':
              if (!data)
                return { content: [{ type: 'text' as const, text: 'Error: data array required' }] };
              return wrap(() => this.client.bulkUpdateApplicationEnvVars(uuid, { data }));
          }
        } else if (resource === 'service') {
          switch (action) {
            case 'list':
              return wrap(() => this.client.listServiceEnvVars(uuid, { reveal }));
            case 'create':
              if (!key || !value)
                return { content: [{ type: 'text' as const, text: 'Error: key, value required' }] };
              return wrap(() =>
                this.client.createServiceEnvVar(uuid, { key, value, is_buildtime, is_runtime }),
              );
            case 'update':
              if (!key || !value)
                return { content: [{ type: 'text' as const, text: 'Error: key, value required' }] };
              return wrap(() =>
                this.client.updateServiceEnvVar(uuid, { key, value, is_buildtime, is_runtime }),
              );
            case 'delete':
              if (!env_uuid)
                return { content: [{ type: 'text' as const, text: 'Error: env_uuid required' }] };
              return wrap(() => this.client.deleteServiceEnvVar(uuid, env_uuid));
            case 'bulk_update':
              if (!data)
                return { content: [{ type: 'text' as const, text: 'Error: data array required' }] };
              return wrap(() => this.client.bulkUpdateServiceEnvVars(uuid, { data }));
          }
        } else {
          switch (action) {
            case 'list':
              return wrap(() => this.client.listDatabaseEnvVars(uuid));
            case 'create':
              if (!key || !value)
                return { content: [{ type: 'text' as const, text: 'Error: key, value required' }] };
              return wrap(() =>
                this.client.createDatabaseEnvVar(uuid, { key, value, is_buildtime, is_runtime }),
              );
            case 'update':
              if (!key || !value)
                return { content: [{ type: 'text' as const, text: 'Error: key, value required' }] };
              return wrap(() =>
                this.client.updateDatabaseEnvVar(uuid, { key, value, is_buildtime, is_runtime }),
              );
            case 'delete':
              if (!env_uuid)
                return { content: [{ type: 'text' as const, text: 'Error: env_uuid required' }] };
              return wrap(() => this.client.deleteDatabaseEnvVar(uuid, env_uuid));
            case 'bulk_update':
              if (!data)
                return { content: [{ type: 'text' as const, text: 'Error: data array required' }] };
              return wrap(() => this.client.bulkUpdateDatabaseEnvVars(uuid, { data }));
          }
        }
      },
    );

    // =========================================================================
    // Deployments (3 tools)
    // =========================================================================
    this.tool(
      'list_deployments',
      'List deployments. Default scope is recent deployments aggregated per app; use scope=active for Coolify queue-only view.',
      {
        page: z.number().optional(),
        per_page: z.number().optional(),
        scope: z.enum(['recent', 'active']).optional(),
      },
      async ({ page, per_page, scope }) =>
        wrapWithActions(
          () =>
            scope === 'active'
              ? this.client.listDeployments({ page, per_page, summary: true })
              : this.client.listRecentDeployments({ page, per_page }),
          undefined,
          (result) =>
            getPagination('list_deployments', page, per_page, (result as unknown[]).length),
        ),
    );

    this.tool(
      'deploy',
      'Deploy by tag/UUID with dry-run support and duplicate-deployment guardrails',
      { tag_or_uuid: z.string(), force: z.boolean().optional(), dry_run: z.boolean().optional() },
      async ({ tag_or_uuid, force, dry_run }) =>
        wrapWithActions(
          async () => {
            const isUuid =
              /^[a-z0-9]{20,}$/i.test(tag_or_uuid) || /^[0-9a-f-]{36}$/i.test(tag_or_uuid);
            if (!isUuid) {
              if (dry_run) {
                return {
                  tag_or_uuid,
                  requested_action: 'deploy',
                  status: 'ready',
                  dry_run: true,
                  executed: false,
                };
              }
              return this.client.deployByTagOrUuid(tag_or_uuid, force);
            }

            const preflight = await preflightApplicationMutation(
              this.client,
              tag_or_uuid,
              'deploy',
            );
            if (dry_run || preflight.status !== 'ready') {
              return {
                ...preflight,
                dry_run: Boolean(dry_run),
                executed: false,
              };
            }

            const result = await this.client.deployByTagOrUuid(tag_or_uuid, force);
            return {
              ...preflight,
              dry_run: false,
              executed: true,
              result,
            };
          },
          () => [{ tool: 'list_deployments', args: {}, hint: 'Check deployment status' }],
        ),
    );

    this.tool(
      'deployment',
      'Manage deployment: get/cancel/list_for_app. Logs excluded by default on all actions — for get use `lines` (paginated tail), for list_for_app use `include_logs: true` to include raw build-log blobs.',
      {
        action: z.enum(['get', 'cancel', 'list_for_app']),
        uuid: z.string(),
        lines: z.number().optional(), // Include logs truncated to last N entries (omit for no logs)
        page: z.number().optional(), // Log page (1=most recent, 2=older, etc.)
        max_chars: z.number().optional(), // Limit log output to last N chars (default: 50000)
        include_logs: z.boolean().optional(), // list_for_app only: include raw build logs (default false; upstream returns ~30KB per deployment)
        search: z.string().optional(),
        search_regex: z.boolean().optional(),
        case_sensitive: z.boolean().optional(),
        context_before: z.number().optional(),
        context_after: z.number().optional(),
        exception_only: z.boolean().optional(),
        warning_only: z.boolean().optional(),
        remove_ansi: z.boolean().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      },
      async ({
        action,
        uuid,
        lines,
        page,
        max_chars,
        include_logs,
        search,
        search_regex,
        case_sensitive,
        context_before,
        context_after,
        exception_only,
        warning_only,
        remove_ansi,
        from,
        to,
      }) => {
        const logOptions = {
          search,
          search_regex,
          case_sensitive,
          context_before,
          context_after,
          exception_only,
          warning_only,
          remove_ansi,
          from,
          to,
          max_chars,
        };
        switch (action) {
          case 'get':
            // If lines param specified, include logs and truncate
            if (lines !== undefined) {
              const p = page ?? 1;
              const ll = lines;
              return wrapWithActions(
                async () => {
                  const deployment = (await this.client.getDeployment(uuid, {
                    includeLogs: true,
                  })) as Record<string, any>;
                  if (deployment.logs) {
                    const result = truncateLogs(
                      filterLogText(String(deployment.logs), logOptions).logs,
                      ll,
                      max_chars ?? 50000,
                      p,
                    );
                    return {
                      ...summarizeDeploymentForRead(deployment, {
                        logs: result.logs,
                        logs_meta: {
                          total_entries: result.total,
                          showing: `${result.showing_start}-${result.showing_end} of ${result.total}`,
                          chars: result.logs.length,
                        },
                      }),
                      identifiers: deploymentIdentifiers(deployment),
                    };
                  }
                  return summarizeDeploymentForRead(deployment);
                },
                (dep) =>
                  getDeploymentActions(
                    String((dep as SafeDeploymentRead).deployment_uuid || ''),
                    String((dep as SafeDeploymentRead).status || ''),
                    String((dep as SafeDeploymentRead).application_uuid || ''),
                  ),
                (dep) => {
                  const total = (dep as SafeDeploymentRead).logs_meta?.total_entries ?? 0;
                  const hasOlder = p * ll < total;
                  const pagination: ResponsePagination = {};
                  if (hasOlder)
                    pagination.next = {
                      tool: 'deployment',
                      args: { action: 'get', uuid, lines: ll, page: p + 1 },
                    };
                  if (p > 1)
                    pagination.prev = {
                      tool: 'deployment',
                      args: { action: 'get', uuid, lines: ll, page: p - 1 },
                    };
                  return Object.keys(pagination).length > 0 ? pagination : undefined;
                },
              );
            }
            // Otherwise return essential info without logs
            return wrapWithActions(
              async () => ({
                ...summarizeDeploymentForRead(
                  (await this.client.getDeployment(uuid, {
                    includeLogs: true,
                  })) as Record<string, any>,
                ),
                identifiers: { coolify_deployment_uuid: uuid },
              }),
              (dep) =>
                getDeploymentActions(
                  String((dep as SafeDeploymentRead).deployment_uuid || ''),
                  String((dep as SafeDeploymentRead).status || ''),
                  String((dep as SafeDeploymentRead).application_uuid || ''),
                ),
            );
          case 'cancel':
            return wrap(() => this.client.cancelDeployment(uuid));
          case 'list_for_app':
            return wrap(async () => {
              const envelope = await this.client.listApplicationDeployments(uuid, {
                includeLogs: include_logs,
              });
              const deployments = Array.isArray(envelope.deployments) ? envelope.deployments : [];
              return {
                count: envelope.count,
                deployments: deployments.map((deployment) => {
                  const rawDeployment = deployment as Record<string, any>;
                  if (include_logs && rawDeployment.logs) {
                    const excerpt = truncateLogs(
                      filterLogText(String(rawDeployment.logs), logOptions).logs,
                      20,
                      4000,
                      1,
                    );
                    return {
                      ...summarizeDeploymentForRead(rawDeployment, {
                        logs: excerpt.logs,
                        logs_meta: {
                          total_entries: excerpt.total,
                          showing: `${excerpt.showing_start}-${excerpt.showing_end} of ${excerpt.total}`,
                          chars: excerpt.logs.length,
                        },
                      }),
                      identifiers: deploymentIdentifiers(rawDeployment),
                    };
                  }
                  return summarizeDeploymentForRead(rawDeployment);
                }),
              };
            });
        }
      },
    );

    // =========================================================================
    // Private Keys (1 tool - consolidated)
    // =========================================================================
    this.tool(
      'private_keys',
      'Manage SSH keys: list/get/create/update/delete',
      {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        uuid: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        private_key: z.string().optional(),
      },
      async ({ action, uuid, name, description, private_key }) => {
        switch (action) {
          case 'list':
            return wrap(() => this.client.listPrivateKeys());
          case 'get':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.getPrivateKey(uuid));
          case 'create':
            if (!private_key)
              return { content: [{ type: 'text' as const, text: 'Error: private_key required' }] };
            return wrap(() =>
              this.client.createPrivateKey({
                private_key,
                name: name || 'unnamed-key',
                description,
              }),
            );
          case 'update':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() =>
              this.client.updatePrivateKey(uuid, { name, description, private_key }),
            );
          case 'delete':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.deletePrivateKey(uuid));
        }
      },
    );

    // =========================================================================
    // GitHub Apps (1 tool - consolidated)
    // =========================================================================
    this.tool(
      'github_apps',
      'Manage GitHub Apps: list/get/create/update/delete/list_repos/list_branches',
      {
        action: z.enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'list_repos',
          'list_branches',
        ]),
        // GitHub apps use integer id, not uuid
        id: z.number().optional(),
        // Repo/branch browsing
        owner: z.string().optional(),
        repo: z.string().optional(),
        // Create/Update fields
        name: z.string().optional(),
        organization: z.string().optional(),
        api_url: z.string().optional(),
        html_url: z.string().optional(),
        custom_user: z.string().optional(),
        custom_port: z.number().optional(),
        app_id: z.number().optional(),
        installation_id: z.number().optional(),
        client_id: z.string().optional(),
        client_secret: z.string().optional(),
        webhook_secret: z.string().optional(),
        private_key_uuid: z.string().optional(),
        is_system_wide: z.boolean().optional(),
      },
      async (args) => {
        const { action, id, ...apiData } = args;
        switch (action) {
          case 'list':
            return wrap(async () => {
              const apps = (await this.client.listGitHubApps({
                summary: true,
              })) as GitHubAppSummary[];
              return apps;
            });
          case 'get':
            if (!id) return { content: [{ type: 'text' as const, text: 'Error: id required' }] };
            return wrap(async () => {
              const apps = (await this.client.listGitHubApps()) as GitHubApp[];
              const app = apps.find((a) => a.id === id);
              if (!app) throw new Error(`GitHub App with id ${id} not found`);
              return app;
            });
          case 'create':
            if (
              !apiData.name ||
              !apiData.api_url ||
              !apiData.html_url ||
              !apiData.app_id ||
              !apiData.installation_id ||
              !apiData.client_id ||
              !apiData.client_secret ||
              !apiData.private_key_uuid
            ) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: 'Error: name, api_url, html_url, app_id, installation_id, client_id, client_secret, private_key_uuid required',
                  },
                ],
              };
            }
            return wrap(() =>
              this.client.createGitHubApp({
                name: apiData.name!,
                api_url: apiData.api_url!,
                html_url: apiData.html_url!,
                app_id: apiData.app_id!,
                installation_id: apiData.installation_id!,
                client_id: apiData.client_id!,
                client_secret: apiData.client_secret!,
                private_key_uuid: apiData.private_key_uuid!,
                organization: apiData.organization,
                custom_user: apiData.custom_user,
                custom_port: apiData.custom_port,
                webhook_secret: apiData.webhook_secret,
                is_system_wide: apiData.is_system_wide,
              }),
            );
          case 'update':
            if (!id) return { content: [{ type: 'text' as const, text: 'Error: id required' }] };
            return wrap(() => this.client.updateGitHubApp(id, apiData));
          case 'delete':
            if (!id) return { content: [{ type: 'text' as const, text: 'Error: id required' }] };
            return wrap(() => this.client.deleteGitHubApp(id));
          case 'list_repos':
            if (!id) return { content: [{ type: 'text' as const, text: 'Error: id required' }] };
            return wrap(() => this.client.listGitHubAppRepositories(id));
          case 'list_branches':
            if (!id || !args.owner || !args.repo)
              return {
                content: [{ type: 'text' as const, text: 'Error: id, owner, repo required' }],
              };
            return wrap(() => this.client.listGitHubAppBranches(id, args.owner!, args.repo!));
        }
      },
    );

    // =========================================================================
    // Database Backups (1 tool - consolidated)
    // =========================================================================
    this.tool(
      'database_backups',
      'Manage backups: list_schedules/get_schedule/list_executions/get_execution/create/update/delete/delete_execution',
      {
        action: z.enum([
          'list_schedules',
          'get_schedule',
          'list_executions',
          'get_execution',
          'create',
          'update',
          'delete',
          'delete_execution',
        ]),
        database_uuid: z.string(),
        backup_uuid: z.string().optional(),
        execution_uuid: z.string().optional(),
        // Backup configuration parameters
        frequency: z.string().optional(),
        enabled: z.boolean().optional(),
        save_s3: z.boolean().optional(),
        s3_storage_uuid: z.string().optional(),
        databases_to_backup: z.string().optional(),
        dump_all: z.boolean().optional(),
        database_backup_retention_days_locally: z.number().optional(),
        database_backup_retention_days_s3: z.number().optional(),
        database_backup_retention_amount_locally: z.number().optional(),
        database_backup_retention_amount_s3: z.number().optional(),
      },
      async (args) => {
        const { action, database_uuid, backup_uuid, execution_uuid, ...backupData } = args;
        switch (action) {
          case 'list_schedules':
            return wrap(() => this.client.listDatabaseBackups(database_uuid));
          case 'get_schedule':
            if (!backup_uuid)
              return { content: [{ type: 'text' as const, text: 'Error: backup_uuid required' }] };
            return wrap(() => this.client.getDatabaseBackup(database_uuid, backup_uuid));
          case 'list_executions':
            if (!backup_uuid)
              return { content: [{ type: 'text' as const, text: 'Error: backup_uuid required' }] };
            return wrap(() => this.client.listBackupExecutions(database_uuid, backup_uuid));
          case 'get_execution':
            if (!backup_uuid || !execution_uuid)
              return {
                content: [
                  { type: 'text' as const, text: 'Error: backup_uuid, execution_uuid required' },
                ],
              };
            return wrap(() =>
              this.client.getBackupExecution(database_uuid, backup_uuid, execution_uuid),
            );
          case 'create':
            if (!args.frequency)
              return { content: [{ type: 'text' as const, text: 'Error: frequency required' }] };
            return wrap(() =>
              this.client.createDatabaseBackup(database_uuid, {
                ...backupData,
                frequency: args.frequency!,
              }),
            );
          case 'update':
            if (!backup_uuid)
              return { content: [{ type: 'text' as const, text: 'Error: backup_uuid required' }] };
            return wrap(() =>
              this.client.updateDatabaseBackup(database_uuid, backup_uuid, backupData),
            );
          case 'delete':
            if (!backup_uuid)
              return { content: [{ type: 'text' as const, text: 'Error: backup_uuid required' }] };
            return wrap(() => this.client.deleteDatabaseBackup(database_uuid, backup_uuid));
          case 'delete_execution':
            if (!backup_uuid || !execution_uuid)
              return {
                content: [
                  { type: 'text' as const, text: 'Error: backup_uuid, execution_uuid required' },
                ],
              };
            return wrap(() =>
              this.client.deleteBackupExecution(database_uuid, backup_uuid, execution_uuid),
            );
        }
      },
    );

    // =========================================================================
    // Teams (1 tool - consolidated)
    // =========================================================================
    this.tool(
      'teams',
      'Manage teams: list/get/get_members/get_current/get_current_members',
      {
        action: z.enum(['list', 'get', 'get_members', 'get_current', 'get_current_members']),
        id: z.number().optional(),
      },
      async ({ action, id }) => {
        switch (action) {
          case 'list':
            return wrap(() => this.client.listTeams());
          case 'get':
            if (!id) return { content: [{ type: 'text' as const, text: 'Error: id required' }] };
            return wrap(() => this.client.getTeam(id));
          case 'get_members':
            if (!id) return { content: [{ type: 'text' as const, text: 'Error: id required' }] };
            return wrap(() => this.client.getTeamMembers(id));
          case 'get_current':
            return wrap(() => this.client.getCurrentTeam());
          case 'get_current_members':
            return wrap(() => this.client.getCurrentTeamMembers());
        }
      },
    );

    // =========================================================================
    // Cloud Tokens (1 tool - consolidated)
    // =========================================================================
    this.tool(
      'cloud_tokens',
      'Manage cloud provider tokens (Hetzner/DigitalOcean): list/get/create/update/delete/validate',
      {
        action: z.enum(['list', 'get', 'create', 'update', 'delete', 'validate']),
        uuid: z.string().optional(),
        provider: z.enum(['hetzner', 'digitalocean']).optional(),
        token: z.string().optional(),
        name: z.string().optional(),
      },
      async ({ action, uuid, provider, token, name }) => {
        switch (action) {
          case 'list':
            return wrap(() => this.client.listCloudTokens());
          case 'get':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.getCloudToken(uuid));
          case 'create':
            if (!provider || !token || !name)
              return {
                content: [{ type: 'text' as const, text: 'Error: provider, token, name required' }],
              };
            return wrap(() => this.client.createCloudToken({ provider, token, name }));
          case 'update':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.updateCloudToken(uuid, { name }));
          case 'delete':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.deleteCloudToken(uuid));
          case 'validate':
            if (!uuid)
              return { content: [{ type: 'text' as const, text: 'Error: uuid required' }] };
            return wrap(() => this.client.validateCloudToken(uuid));
        }
      },
    );

    // =========================================================================
    // Storages (1 tool - consolidated for app/db/service)
    // =========================================================================
    this.tool(
      'storages',
      'Manage persistent/file storages for app, database, or service: list/create/update/delete',
      {
        resource: z.enum(['application', 'database', 'service']),
        action: z.enum(['list', 'create', 'update', 'delete']),
        uuid: z.string(),
        storage_uuid: z.string().optional(),
        type: z.enum(['persistent', 'file']).optional(),
        mount_path: z.string().optional(),
        name: z.string().optional(),
        host_path: z.string().optional(),
        content: z.string().optional(),
        is_directory: z.boolean().optional(),
        fs_path: z.string().optional(),
        is_preview_suffix_enabled: z.boolean().optional(),
      },
      async (args) => {
        const { resource, action, uuid, storage_uuid } = args;
        if (action === 'create' && (!args.type || !args.mount_path))
          return { content: [{ type: 'text' as const, text: 'Error: type, mount_path required' }] };
        if (action === 'update' && (!args.type || !storage_uuid))
          return {
            content: [{ type: 'text' as const, text: 'Error: type, storage_uuid required' }],
          };
        if (action === 'delete' && !storage_uuid)
          return { content: [{ type: 'text' as const, text: 'Error: storage_uuid required' }] };
        const methods: Record<string, Record<string, () => Promise<unknown>>> = {
          application: {
            list: () => this.client.listApplicationStorages(uuid),
            create: () =>
              this.client.createApplicationStorage(uuid, {
                type: args.type!,
                mount_path: args.mount_path!,
                name: args.name,
                host_path: args.host_path,
                content: args.content,
                is_directory: args.is_directory,
                fs_path: args.fs_path,
                is_preview_suffix_enabled: args.is_preview_suffix_enabled,
              }),
            update: () =>
              this.client.updateApplicationStorage(uuid, {
                uuid: storage_uuid!,
                type: args.type!,
                mount_path: args.mount_path,
                name: args.name,
                host_path: args.host_path,
                content: args.content,
                is_directory: args.is_directory,
                is_preview_suffix_enabled: args.is_preview_suffix_enabled,
              }),
            delete: () => this.client.deleteApplicationStorage(uuid, storage_uuid!),
          },
          database: {
            list: () => this.client.listDatabaseStorages(uuid),
            create: () =>
              this.client.createDatabaseStorage(uuid, {
                type: args.type!,
                mount_path: args.mount_path!,
                name: args.name,
                host_path: args.host_path,
                content: args.content,
                is_directory: args.is_directory,
                fs_path: args.fs_path,
                is_preview_suffix_enabled: args.is_preview_suffix_enabled,
              }),
            update: () =>
              this.client.updateDatabaseStorage(uuid, {
                uuid: storage_uuid!,
                type: args.type!,
                mount_path: args.mount_path,
                name: args.name,
                host_path: args.host_path,
                content: args.content,
                is_directory: args.is_directory,
                is_preview_suffix_enabled: args.is_preview_suffix_enabled,
              }),
            delete: () => this.client.deleteDatabaseStorage(uuid, storage_uuid!),
          },
          service: {
            list: () => this.client.listServiceStorages(uuid),
            create: () =>
              this.client.createServiceStorage(uuid, {
                type: args.type!,
                mount_path: args.mount_path!,
                name: args.name,
                host_path: args.host_path,
                content: args.content,
                is_directory: args.is_directory,
                fs_path: args.fs_path,
                is_preview_suffix_enabled: args.is_preview_suffix_enabled,
              }),
            update: () =>
              this.client.updateServiceStorage(uuid, {
                uuid: storage_uuid!,
                type: args.type!,
                mount_path: args.mount_path,
                name: args.name,
                host_path: args.host_path,
                content: args.content,
                is_directory: args.is_directory,
                is_preview_suffix_enabled: args.is_preview_suffix_enabled,
              }),
            delete: () => this.client.deleteServiceStorage(uuid, storage_uuid!),
          },
        };
        return wrap(() => methods[resource][action]());
      },
    );

    // =========================================================================
    // Scheduled Tasks (1 tool - consolidated for app/service)
    // =========================================================================
    this.tool(
      'scheduled_tasks',
      'Manage scheduled tasks for app or service: list/create/update/delete/list_executions',
      {
        resource: z.enum(['application', 'service']),
        action: z.enum(['list', 'create', 'update', 'delete', 'list_executions']),
        uuid: z.string(),
        task_uuid: z.string().optional(),
        name: z.string().optional(),
        command: z.string().optional(),
        frequency: z.string().optional(),
        container: z.string().optional(),
        timeout: z.number().optional(),
        enabled: z.boolean().optional(),
      },
      async (args) => {
        const { resource, action, uuid, task_uuid } = args;
        const isApp = resource === 'application';
        switch (action) {
          case 'list':
            return wrap(() =>
              isApp
                ? this.client.listApplicationScheduledTasks(uuid)
                : this.client.listServiceScheduledTasks(uuid),
            );
          case 'create':
            if (!args.name || !args.command || !args.frequency)
              return {
                content: [
                  { type: 'text' as const, text: 'Error: name, command, frequency required' },
                ],
              };
            return wrap(() => {
              const data = {
                name: args.name!,
                command: args.command!,
                frequency: args.frequency!,
                container: args.container,
                timeout: args.timeout,
                enabled: args.enabled,
              };
              return isApp
                ? this.client.createApplicationScheduledTask(uuid, data)
                : this.client.createServiceScheduledTask(uuid, data);
            });
          case 'update':
            if (!task_uuid)
              return { content: [{ type: 'text' as const, text: 'Error: task_uuid required' }] };
            return wrap(() => {
              const data = {
                name: args.name,
                command: args.command,
                frequency: args.frequency,
                container: args.container,
                timeout: args.timeout,
                enabled: args.enabled,
              };
              return isApp
                ? this.client.updateApplicationScheduledTask(uuid, task_uuid, data)
                : this.client.updateServiceScheduledTask(uuid, task_uuid, data);
            });
          case 'delete':
            if (!task_uuid)
              return { content: [{ type: 'text' as const, text: 'Error: task_uuid required' }] };
            return wrap(() =>
              isApp
                ? this.client.deleteApplicationScheduledTask(uuid, task_uuid)
                : this.client.deleteServiceScheduledTask(uuid, task_uuid),
            );
          case 'list_executions':
            if (!task_uuid)
              return { content: [{ type: 'text' as const, text: 'Error: task_uuid required' }] };
            return wrap(() =>
              isApp
                ? this.client.listApplicationScheduledTaskExecutions(uuid, task_uuid)
                : this.client.listServiceScheduledTaskExecutions(uuid, task_uuid),
            );
        }
      },
    );

    // =========================================================================
    // Hetzner Cloud (1 tool - consolidated)
    // =========================================================================
    this.tool(
      'hetzner',
      'Hetzner cloud: list_locations/list_server_types/list_images/list_ssh_keys/create_server',
      {
        action: z.enum([
          'list_locations',
          'list_server_types',
          'list_images',
          'list_ssh_keys',
          'create_server',
        ]),
        cloud_provider_token_uuid: z.string().optional(),
        location: z.string().optional(),
        server_type: z.string().optional(),
        image: z.number().optional(),
        name: z.string().optional(),
        private_key_uuid: z.string().optional(),
        enable_ipv4: z.boolean().optional(),
        enable_ipv6: z.boolean().optional(),
        hetzner_ssh_key_ids: z.array(z.number()).optional(),
        cloud_init_script: z.string().optional(),
        instant_validate: z.boolean().optional(),
      },
      async (args) => {
        const { action, cloud_provider_token_uuid: tokenUuid } = args;
        switch (action) {
          case 'list_locations':
            if (!tokenUuid)
              return {
                content: [
                  { type: 'text' as const, text: 'Error: cloud_provider_token_uuid required' },
                ],
              };
            return wrap(() => this.client.listHetznerLocations(tokenUuid));
          case 'list_server_types':
            if (!tokenUuid)
              return {
                content: [
                  { type: 'text' as const, text: 'Error: cloud_provider_token_uuid required' },
                ],
              };
            return wrap(() => this.client.listHetznerServerTypes(tokenUuid));
          case 'list_images':
            if (!tokenUuid)
              return {
                content: [
                  { type: 'text' as const, text: 'Error: cloud_provider_token_uuid required' },
                ],
              };
            return wrap(() => this.client.listHetznerImages(tokenUuid));
          case 'list_ssh_keys':
            if (!tokenUuid)
              return {
                content: [
                  { type: 'text' as const, text: 'Error: cloud_provider_token_uuid required' },
                ],
              };
            return wrap(() => this.client.listHetznerSSHKeys(tokenUuid));
          case 'create_server':
            if (!args.location || !args.server_type || !args.image || !args.private_key_uuid)
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: 'Error: location, server_type, image, private_key_uuid required',
                  },
                ],
              };
            return wrap(() =>
              this.client.createHetznerServer({
                cloud_provider_token_uuid: tokenUuid,
                location: args.location!,
                server_type: args.server_type!,
                image: args.image!,
                name: args.name,
                private_key_uuid: args.private_key_uuid!,
                enable_ipv4: args.enable_ipv4,
                enable_ipv6: args.enable_ipv6,
                hetzner_ssh_key_ids: args.hetzner_ssh_key_ids,
                cloud_init_script: args.cloud_init_script,
                instant_validate: args.instant_validate,
              }),
            );
        }
      },
    );

    // =========================================================================
    // System (1 tool - health/list_resources/api_control consolidated)
    // =========================================================================
    this.tool(
      'system',
      'System operations: health/list_resources/enable_api/disable_api. `list_resources` defaults to an essential projection (uuid/name/type/status) to keep token budgets sane on instances with many resources; pass `include_full: true` for the raw Coolify payload. When `include_full: true`, webhook HMAC secrets and basic-auth password are masked unless `reveal: true` is also set (matches the `env_vars` `reveal` ergonomics).',
      {
        action: z.enum(['health', 'list_resources', 'enable_api', 'disable_api']),
        include_full: z.boolean().optional(),
        reveal: z.boolean().optional(),
      },
      async ({ action, include_full, reveal }) => {
        switch (action) {
          case 'health':
            return wrap(() => this.client.getHealth());
          case 'list_resources':
            return wrap(() => this.client.listResources({ include_full, reveal }));
          case 'enable_api':
            return wrap(() => this.client.enableApi());
          case 'disable_api':
            return wrap(() => this.client.disableApi());
        }
      },
    );

    // =========================================================================
    // Documentation Search (1 tool)
    // =========================================================================
    this.tool(
      'search_docs',
      'Search Coolify documentation for how-to guides, configuration, troubleshooting',
      {
        query: z.string().describe('Search query'),
        limit: z.number().optional().describe('Max results (default 5)'),
      },
      async ({ query, limit }) =>
        wrap(async () => {
          const results = await this.docsSearch.search(query, limit ?? 5);
          if (results.length === 0) {
            return { results: [], hint: 'No matches. Try broader or different keywords.' };
          }
          return { results };
        }),
    );

    // =========================================================================
    // Batch Operations (4 tools)
    // =========================================================================
    this.tool(
      'restart_project_apps',
      'Restart all apps in project',
      { project_uuid: z.string() },
      async ({ project_uuid }) => wrap(() => this.client.restartProjectApps(project_uuid)),
    );

    this.tool(
      'bulk_env_update',
      'Update env var across multiple apps',
      {
        app_uuids: z.array(z.string()),
        key: z.string(),
        value: z.string(),
        is_buildtime: z.boolean().optional(),
        is_runtime: z.boolean().optional(),
      },
      async ({ app_uuids, key, value, is_buildtime, is_runtime }) =>
        wrap(() => this.client.bulkEnvUpdate(app_uuids, key, value, is_buildtime, is_runtime)),
    );

    this.tool(
      'stop_all_apps',
      'EMERGENCY: Stop all running apps',
      { confirm: z.literal(true) },
      async ({ confirm }) => {
        if (!confirm)
          return { content: [{ type: 'text' as const, text: 'Error: confirm=true required' }] };
        return wrap(() => this.client.stopAllApps());
      },
    );

    this.tool(
      'redeploy_project',
      'Redeploy all apps in project',
      { project_uuid: z.string(), force: z.boolean().optional() },
      async ({ project_uuid, force }) =>
        wrap(() => this.client.redeployProjectApps(project_uuid, force ?? true)),
    );
  }
}
