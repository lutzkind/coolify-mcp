import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { CoolifyMcpServer } from '../lib/mcp-server.js';

type ToolResult = { content: Array<{ text: string }> };

function createServer(): CoolifyMcpServer {
  return new CoolifyMcpServer({
    baseUrl: 'http://localhost:3000',
    accessToken: 'x',
  });
}

async function callTool(
  server: CoolifyMcpServer,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const tool = (
    server as unknown as {
      _registeredTools: Record<
        string,
        { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
      >;
    }
  )._registeredTools[name];
  return (await tool.handler(args, {})) as ToolResult;
}

function jsonBody(result: ToolResult): Record<string, unknown> {
  return JSON.parse(result.content[0].text);
}

function jsonEntry(result: ToolResult, index = 0): Record<string, unknown> {
  return (jsonBody(result).entries as Array<Record<string, unknown>>)[index];
}

const UUID = 'abcdefghijklmnopqrstuvwx';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('environment scope diagnostics', () => {
  it('treats one production row plus one preview row as a twin, not a duplicate', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'env-prod',
        key: 'REQUESTED',
        value: 'same-value',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'env-preview',
        key: 'REQUESTED',
        value: 'same-value',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
    });
    const entry = jsonEntry(result);

    expect(entry.production_entries).toHaveLength(1);
    expect(entry.preview_entries).toHaveLength(1);
    expect(entry.duplicate_count).toBe(0);
    expect(entry.production_duplicate_count).toBe(0);
    expect(entry.preview_duplicate_count).toBe(0);
    expect(entry.expected_preview_twin).toBe(true);
    expect(entry.effective_entry_uuid).toBe('env-prod');
    expect(entry.effective_production_entry_uuid).toBe('env-prod');
    expect(entry.effective_preview_entry_uuid).toBe('env-preview');
    expect(entry.production_preview_value_mismatch).toBe(false);
    expect(entry.production_conflicting_flags).toBe(false);
    expect(entry.preview_conflicting_flags).toBe(false);
    expect(entry.production_conflicting_values).toBe(false);
    expect(entry.preview_conflicting_values).toBe(false);
    expect(entry.effective_value_redacted).toBe(true);
    expect((entry.production_entries as Array<Record<string, unknown>>)[0]).toEqual(
      expect.objectContaining({ is_preview: false, scope: 'production' }),
    );
    expect((entry.preview_entries as Array<Record<string, unknown>>)[0]).toEqual(
      expect.objectContaining({ is_preview: true, scope: 'preview' }),
    );
    expect(JSON.stringify(entry)).not.toContain('same-value');
  });

  it('still reports genuine duplicates within the production scope', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'prod-old',
        key: 'REQUESTED',
        value: 'old',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'prod-new',
        key: 'REQUESTED',
        value: 'new',
        is_preview: false,
        is_buildtime: true,
        is_runtime: true,
      },
      {
        uuid: 'preview',
        key: 'REQUESTED',
        value: 'preview',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
    });
    const entry = jsonEntry(result);

    expect(entry.duplicate_count).toBe(1);
    expect(entry.production_duplicate_count).toBe(1);
    expect(entry.preview_duplicate_count).toBe(0);
    expect(entry.production_conflicting_flags).toBe(true);
    expect(entry.production_conflicting_values).toBe(true);
    expect(entry.expected_preview_twin).toBe(false);
  });

  it('flags preview build/runtime conflicts without counting them as production duplicates', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'preview-a',
        key: 'REQUESTED',
        value: 'v1',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview-b',
        key: 'REQUESTED',
        value: 'v1',
        is_preview: true,
        is_buildtime: true,
        is_runtime: true,
      },
      {
        uuid: 'prod',
        key: 'REQUESTED',
        value: 'v1',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
    });
    const entry = jsonEntry(result);

    expect(entry.preview_conflicting_flags).toBe(true);
    expect(entry.production_conflicting_flags).toBe(false);
    expect(entry.production_duplicate_count).toBe(0);
    expect(entry.duplicate_count).toBe(0);
    expect(entry.preview_duplicate_count).toBe(1);
    expect(entry.expected_preview_twin).toBe(false);
    expect(entry.effective_production_entry_uuid).toBe('prod');
    expect(entry.effective_preview_entry_uuid).toBe('preview-b');
  });

  it('flags production build/runtime conflicts in isolation', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'prod-a',
        key: 'REQUESTED',
        value: 'v1',
        is_preview: false,
        is_buildtime: false,
        is_runtime: false,
      },
      {
        uuid: 'prod-b',
        key: 'REQUESTED',
        value: 'v1',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
    });
    const entry = jsonEntry(result);

    expect(entry.production_conflicting_flags).toBe(true);
    expect(entry.preview_conflicting_flags).toBe(false);
    expect(entry.production_duplicate_count).toBe(1);
    expect(entry.production_conflicting_values).toBe(false);
  });

  it('flags differing production values while keeping preview rows out of the comparison', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'prod-a',
        key: 'REQUESTED',
        value: 'alpha',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'prod-b',
        key: 'REQUESTED',
        value: 'beta',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview',
        key: 'REQUESTED',
        value: 'beta',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
    });
    const entry = jsonEntry(result);

    expect(entry.production_conflicting_values).toBe(true);
    expect(entry.preview_conflicting_values).toBe(false);
    expect(entry.production_preview_value_mismatch).toBe(false);
  });

  it('flags a production-vs-preview value mismatch without treating it as a duplicate', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'prod',
        key: 'REQUESTED',
        value: 'prod-value',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview',
        key: 'REQUESTED',
        value: 'preview-value',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
    });
    const entry = jsonEntry(result);

    expect(entry.production_preview_value_mismatch).toBe(true);
    expect(entry.production_conflicting_values).toBe(false);
    expect(entry.preview_conflicting_values).toBe(false);
    expect(entry.production_duplicate_count).toBe(0);
    expect(entry.preview_duplicate_count).toBe(0);
    expect(entry.expected_preview_twin).toBe(true);
  });

  it('classifies truthy is_preview markers as preview so they are never treated as production', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'prod',
        key: 'REQUESTED',
        value: 'v1',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview-numeric',
        key: 'REQUESTED',
        value: 'v2',
        is_preview: 1,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
    });
    const entry = jsonEntry(result);

    expect(entry.production_duplicate_count).toBe(0);
    expect(entry.expected_preview_twin).toBe(true);
    expect(entry.effective_production_entry_uuid).toBe('prod');
    expect(entry.effective_preview_entry_uuid).toBe('preview-numeric');
  });

  it('keeps every inspected value redacted across multiple keys', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'prod-a',
        key: 'SECRET_ONE',
        value: 'SUPER-SECRET-ONE',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview-a',
        key: 'SECRET_ONE',
        value: 'SUPER-SECRET-ONE-PREVIEW',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'prod-b',
        key: 'SECRET_TWO',
        value: 'SUPER-SECRET-TWO',
        is_preview: false,
        is_buildtime: true,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['SECRET_ONE', 'SECRET_TWO'],
    });
    const body = jsonBody(result);
    const text = result.content[0].text;

    expect(body.secret_redacted).toBe(true);
    expect(text).not.toContain('SUPER-SECRET-ONE');
    expect(text).not.toContain('SUPER-SECRET-ONE-PREVIEW');
    expect(text).not.toContain('SUPER-SECRET-TWO');
    for (const entry of body.entries as Array<Record<string, unknown>>) {
      expect(entry.effective_value_redacted).toBe(true);
    }
  });

  it('bounds inspect_env output to the requested keys only', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'prod-a',
        key: 'REQUESTED',
        value: 'requested-value',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'prod-b',
        key: 'UNRELATED_KEY',
        value: 'unrelated-value',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);

    const result = await callTool(server, 'inspect_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
    });
    const body = jsonBody(result);
    const text = result.content[0].text;

    expect(body.requested_keys).toEqual(['REQUESTED']);
    expect(body.unrelated_entries_returned).toBe(0);
    expect(body.entries).toHaveLength(1);
    expect(text).not.toContain('UNRELATED_KEY');
    expect(text).not.toContain('unrelated-value');
  });

  it('reconcile_env preview mode performs no mutation at all', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        uuid: 'prod-old',
        key: 'REQUESTED',
        value: 'old',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'prod-current',
        key: 'REQUESTED',
        value: 'current',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview-current',
        key: 'REQUESTED',
        value: 'preview',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);
    const create = jest.spyOn(server['client'], 'createApplicationEnvVar');
    const update = jest.spyOn(server['client'], 'updateApplicationEnvVar');
    const remove = jest.spyOn(server['client'], 'deleteApplicationEnvVar');

    const result = await callTool(server, 'reconcile_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
      desired_values: { REQUESTED: 'new' },
      apply: false,
    });
    const body = jsonBody(result);

    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(body.changed).toBe(false);
    expect(body.applied_target).toBeNull();
    expect(body.preview_only).toBe(true);
    expect(body.deleted).toEqual(['prod-old']);
    expect(body.preserved_preview).toEqual([
      expect.objectContaining({ entry_uuid: 'preview-current', is_preview: true }),
    ]);
  });

  it('reconcile_env deletes production duplicates before updating the canonical row', async () => {
    const server = createServer();
    const before = [
      {
        uuid: 'prod-old',
        key: 'REQUESTED',
        value: 'old',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'prod-current',
        key: 'REQUESTED',
        value: 'current',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview-current',
        key: 'REQUESTED',
        value: 'preview',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ];
    const after = [
      {
        uuid: 'prod-current',
        key: 'REQUESTED',
        value: 'new',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      before[2],
    ];

    jest
      .spyOn(server['client'], 'listApplicationEnvVars')
      .mockResolvedValueOnce(before as never)
      .mockResolvedValueOnce(after as never);
    const update = jest
      .spyOn(server['client'], 'updateApplicationEnvVar')
      .mockResolvedValue({ message: 'Updated' });
    const remove = jest
      .spyOn(server['client'], 'deleteApplicationEnvVar')
      .mockResolvedValue({ message: 'Deleted' });

    const result = await callTool(server, 'reconcile_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
      desired_values: { REQUESTED: 'new' },
      apply: true,
    });
    const body = jsonBody(result);

    expect(update).toHaveBeenCalledWith(
      UUID,
      expect.objectContaining({
        key: 'REQUESTED',
        value: 'new',
        is_preview: false,
      }),
    );
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(UUID, 'prod-old');
    expect(remove).not.toHaveBeenCalledWith(UUID, 'preview-current');
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0]);
    expect(body.deleted).toEqual(['prod-old']);
    expect(body.updated).toEqual(['REQUESTED']);
    expect(body.retained).toEqual([
      expect.objectContaining({ entry_uuid: 'prod-current', scope: 'production' }),
    ]);
    expect(body.preserved_preview).toEqual([
      expect.objectContaining({
        entry_uuid: 'preview-current',
        is_preview: true,
        scope: 'preview',
      }),
    ]);
    expect(result.content[0].text).not.toMatch(/"value"\s*:/);
  });

  it('reconcile_env never promotes a preview-only row to canonical production', async () => {
    const server = createServer();
    const previewOnly = {
      uuid: 'preview-only',
      key: 'REQUESTED',
      value: 'preview-value',
      is_preview: true,
      is_buildtime: false,
      is_runtime: true,
    };
    const after = [
      {
        uuid: 'prod-new',
        key: 'REQUESTED',
        value: 'new',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      previewOnly,
    ];

    jest
      .spyOn(server['client'], 'listApplicationEnvVars')
      .mockResolvedValueOnce([previewOnly] as never)
      .mockResolvedValueOnce(after as never);
    const create = jest
      .spyOn(server['client'], 'createApplicationEnvVar')
      .mockResolvedValue({ uuid: 'prod-new' });
    const update = jest.spyOn(server['client'], 'updateApplicationEnvVar');
    const remove = jest.spyOn(server['client'], 'deleteApplicationEnvVar');

    const result = await callTool(server, 'reconcile_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
      desired_values: { REQUESTED: 'new' },
      apply: true,
    });
    const body = jsonBody(result);

    expect(create).toHaveBeenCalledWith(UUID, {
      key: 'REQUESTED',
      value: 'new',
      is_preview: false,
    });
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(body.created).toEqual(['REQUESTED']);
    expect(body.deleted).toEqual([]);
    expect(body.retained).toEqual([
      expect.objectContaining({ entry_uuid: 'prod-new', scope: 'production' }),
    ]);
    expect(body.preserved_preview).toEqual([
      expect.objectContaining({ entry_uuid: 'preview-only', scope: 'preview' }),
    ]);
  });

  it('reconcile_env fails closed when the final production row count is not one', async () => {
    const server = createServer();
    const before = [
      {
        uuid: 'prod-old',
        key: 'REQUESTED',
        value: 'old',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'prod-current',
        key: 'REQUESTED',
        value: 'current',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview-current',
        key: 'REQUESTED',
        value: 'preview',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ];
    const after = [
      before[1],
      {
        uuid: 'prod-extra',
        key: 'REQUESTED',
        value: 'stale',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      before[2],
    ];

    jest
      .spyOn(server['client'], 'listApplicationEnvVars')
      .mockResolvedValueOnce(before as never)
      .mockResolvedValueOnce(after as never);
    jest
      .spyOn(server['client'], 'updateApplicationEnvVar')
      .mockResolvedValue({ message: 'Updated' });
    const remove = jest
      .spyOn(server['client'], 'deleteApplicationEnvVar')
      .mockResolvedValue({ message: 'Deleted' });

    const result = await callTool(server, 'reconcile_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
      desired_values: { REQUESTED: 'new' },
      apply: true,
    });

    expect(remove).toHaveBeenCalledWith(UUID, 'prod-old');
    expect(result.content[0].text).toContain('POST_WRITE_VERIFICATION_FAILED');
    expect(result.content[0].text).toContain('production_canonical_entry_count');
  });

  it('reconcile_env fails closed when the preview scope changes during the write', async () => {
    const server = createServer();
    const before = [
      {
        uuid: 'prod-current',
        key: 'REQUESTED',
        value: 'current',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview-current',
        key: 'REQUESTED',
        value: 'preview',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ];
    const after = [
      {
        uuid: 'prod-current',
        key: 'REQUESTED',
        value: 'new',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
    ];

    jest
      .spyOn(server['client'], 'listApplicationEnvVars')
      .mockResolvedValueOnce(before as never)
      .mockResolvedValueOnce(after as never);
    jest
      .spyOn(server['client'], 'updateApplicationEnvVar')
      .mockResolvedValue({ message: 'Updated' });
    jest
      .spyOn(server['client'], 'deleteApplicationEnvVar')
      .mockResolvedValue({ message: 'Deleted' });

    const result = await callTool(server, 'reconcile_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
      desired_values: { REQUESTED: 'new' },
      apply: true,
    });

    expect(result.content[0].text).toContain('POST_WRITE_VERIFICATION_FAILED');
    expect(result.content[0].text).toContain('preview_scope_mutated');
  });

  it('reconcile_env refuses to mutate when a production duplicate cannot be identified', async () => {
    const server = createServer();
    jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
      {
        key: 'REQUESTED',
        value: 'old',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'prod-current',
        key: 'REQUESTED',
        value: 'current',
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        uuid: 'preview-current',
        key: 'REQUESTED',
        value: 'preview',
        is_preview: true,
        is_buildtime: false,
        is_runtime: true,
      },
    ] as never);
    const create = jest.spyOn(server['client'], 'createApplicationEnvVar');
    const update = jest.spyOn(server['client'], 'updateApplicationEnvVar');
    const remove = jest.spyOn(server['client'], 'deleteApplicationEnvVar');

    const result = await callTool(server, 'reconcile_env', {
      resource: 'application',
      uuid: UUID,
      keys: ['REQUESTED'],
      desired_values: { REQUESTED: 'new' },
      apply: true,
    });

    expect(result.content[0].text).toContain('PRODUCTION_STATE_AMBIGUOUS');
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
