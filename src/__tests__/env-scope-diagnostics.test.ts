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
      uuid: 'abcdefghijklmnopqrstuvwx',
      keys: ['REQUESTED'],
    });
    const entry = JSON.parse(result.content[0].text).entries[0];

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
    expect(entry.production_entries[0]).toEqual(
      expect.objectContaining({ is_preview: false, scope: 'production' }),
    );
    expect(entry.preview_entries[0]).toEqual(
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
      uuid: 'abcdefghijklmnopqrstuvwx',
      keys: ['REQUESTED'],
    });
    const entry = JSON.parse(result.content[0].text).entries[0];

    expect(entry.duplicate_count).toBe(1);
    expect(entry.production_duplicate_count).toBe(1);
    expect(entry.preview_duplicate_count).toBe(0);
    expect(entry.production_conflicting_flags).toBe(true);
    expect(entry.production_conflicting_values).toBe(true);
    expect(entry.expected_preview_twin).toBe(false);
  });

  it('reconcile_env deletes only production duplicates and preserves preview rows', async () => {
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
      uuid: 'abcdefghijklmnopqrstuvwx',
      keys: ['REQUESTED'],
      desired_values: { REQUESTED: 'new' },
      apply: true,
    });
    const body = JSON.parse(result.content[0].text);

    expect(update).toHaveBeenCalledWith(
      'abcdefghijklmnopqrstuvwx',
      expect.objectContaining({
        key: 'REQUESTED',
        value: 'new',
        is_preview: false,
      }),
    );
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('abcdefghijklmnopqrstuvwx', 'prod-old');
    expect(remove).not.toHaveBeenCalledWith('abcdefghijklmnopqrstuvwx', 'preview-current');
    expect(body.deleted).toEqual(['prod-old']);
    expect(body.preserved_preview).toEqual([
      expect.objectContaining({
        entry_uuid: 'preview-current',
        is_preview: true,
        scope: 'preview',
      }),
    ]);
  });
});
