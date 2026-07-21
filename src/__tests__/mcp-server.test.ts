/**
 * MCP Server Tests v2.0.0
 *
 * Tests for the consolidated MCP tool layer.
 * CoolifyClient methods are fully tested in coolify-client.test.ts (174 tests).
 * These tests verify MCP server instantiation and structure.
 */
import { createRequire } from 'module';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  CoolifyMcpServer,
  VERSION,
  truncateLogs,
  getApplicationActions,
  getDeploymentActions,
  getPagination,
  summarizeDeploymentForRead,
  filterLogText,
} from '../lib/mcp-server.js';

describe('CoolifyMcpServer v2', () => {
  let server: CoolifyMcpServer;

  beforeEach(() => {
    server = new CoolifyMcpServer({
      baseUrl: 'http://localhost:3000',
      accessToken: 'test-token',
    });
  });

  describe('constructor', () => {
    it('should create server instance', () => {
      expect(server).toBeInstanceOf(CoolifyMcpServer);
    });

    it('should be an MCP server with connect method', () => {
      expect(typeof server.connect).toBe('function');
    });

    it('should report version matching package.json', () => {
      const _require = createRequire(import.meta.url);
      const { version } = _require('../../package.json');
      expect(VERSION).toBe(version);
    });
  });

  describe('client', () => {
    it('should have client instance', () => {
      const client = server['client'];
      expect(client).toBeDefined();
    });

    it('should have all required client methods', () => {
      const client = server['client'];

      // Core methods
      expect(typeof client.getVersion).toBe('function');

      // Server operations
      expect(typeof client.listServers).toBe('function');
      expect(typeof client.getServer).toBe('function');
      expect(typeof client.getServerResources).toBe('function');
      expect(typeof client.getServerDomains).toBe('function');
      expect(typeof client.validateServer).toBe('function');

      // Project operations
      expect(typeof client.listProjects).toBe('function');
      expect(typeof client.getProject).toBe('function');
      expect(typeof client.createProject).toBe('function');
      expect(typeof client.updateProject).toBe('function');
      expect(typeof client.deleteProject).toBe('function');

      // Environment operations
      expect(typeof client.listProjectEnvironments).toBe('function');
      expect(typeof client.getProjectEnvironment).toBe('function');
      expect(typeof client.getProjectEnvironmentWithDatabases).toBe('function');
      expect(typeof client.createProjectEnvironment).toBe('function');
      expect(typeof client.deleteProjectEnvironment).toBe('function');

      // Application operations
      expect(typeof client.listApplications).toBe('function');
      expect(typeof client.getApplication).toBe('function');
      expect(typeof client.createApplicationPublic).toBe('function');
      expect(typeof client.createApplicationPrivateGH).toBe('function');
      expect(typeof client.createApplicationPrivateKey).toBe('function');
      expect(typeof client.createApplicationDockerImage).toBe('function');
      expect(typeof client.createApplicationDockerfile).toBe('function');
      expect(typeof client.updateApplication).toBe('function');
      expect(typeof client.deleteApplication).toBe('function');
      expect(typeof client.getApplicationLogs).toBe('function');

      // Control operations
      expect(typeof client.startApplication).toBe('function');
      expect(typeof client.stopApplication).toBe('function');
      expect(typeof client.restartApplication).toBe('function');
      expect(typeof client.startDatabase).toBe('function');
      expect(typeof client.stopDatabase).toBe('function');
      expect(typeof client.restartDatabase).toBe('function');
      expect(typeof client.startService).toBe('function');
      expect(typeof client.stopService).toBe('function');
      expect(typeof client.restartService).toBe('function');

      // Database operations
      expect(typeof client.listDatabases).toBe('function');
      expect(typeof client.getDatabase).toBe('function');
      expect(typeof client.deleteDatabase).toBe('function');
      expect(typeof client.createPostgresql).toBe('function');
      expect(typeof client.createMysql).toBe('function');
      expect(typeof client.createMariadb).toBe('function');
      expect(typeof client.createMongodb).toBe('function');
      expect(typeof client.createRedis).toBe('function');
      expect(typeof client.createKeydb).toBe('function');
      expect(typeof client.createClickhouse).toBe('function');
      expect(typeof client.createDragonfly).toBe('function');

      // Service operations
      expect(typeof client.listServices).toBe('function');
      expect(typeof client.getService).toBe('function');
      expect(typeof client.createService).toBe('function');
      expect(typeof client.updateService).toBe('function');
      expect(typeof client.deleteService).toBe('function');

      // Environment variable operations
      expect(typeof client.listApplicationEnvVars).toBe('function');
      expect(typeof client.createApplicationEnvVar).toBe('function');
      expect(typeof client.updateApplicationEnvVar).toBe('function');
      expect(typeof client.deleteApplicationEnvVar).toBe('function');
      expect(typeof client.listServiceEnvVars).toBe('function');
      expect(typeof client.createServiceEnvVar).toBe('function');
      expect(typeof client.deleteServiceEnvVar).toBe('function');

      // Deployment operations
      expect(typeof client.listDeployments).toBe('function');
      expect(typeof client.getDeployment).toBe('function');
      expect(typeof client.deployByTagOrUuid).toBe('function');
      expect(typeof client.listApplicationDeployments).toBe('function');
      expect(typeof client.cancelDeployment).toBe('function');

      // Private key operations
      expect(typeof client.listPrivateKeys).toBe('function');
      expect(typeof client.getPrivateKey).toBe('function');
      expect(typeof client.createPrivateKey).toBe('function');
      expect(typeof client.updatePrivateKey).toBe('function');
      expect(typeof client.deletePrivateKey).toBe('function');

      // GitHub App operations
      expect(typeof client.listGitHubApps).toBe('function');
      expect(typeof client.createGitHubApp).toBe('function');
      expect(typeof client.updateGitHubApp).toBe('function');
      expect(typeof client.deleteGitHubApp).toBe('function');

      // Backup operations
      expect(typeof client.listDatabaseBackups).toBe('function');
      expect(typeof client.getDatabaseBackup).toBe('function');
      expect(typeof client.createDatabaseBackup).toBe('function');
      expect(typeof client.updateDatabaseBackup).toBe('function');
      expect(typeof client.deleteDatabaseBackup).toBe('function');
      expect(typeof client.listBackupExecutions).toBe('function');
      expect(typeof client.getBackupExecution).toBe('function');

      // Diagnostic operations
      expect(typeof client.diagnoseApplication).toBe('function');
      expect(typeof client.diagnoseServer).toBe('function');
      expect(typeof client.findInfrastructureIssues).toBe('function');

      // Batch operations
      expect(typeof client.restartProjectApps).toBe('function');
      expect(typeof client.bulkEnvUpdate).toBe('function');
      expect(typeof client.stopAllApps).toBe('function');
      expect(typeof client.redeployProjectApps).toBe('function');

      // Team operations
      expect(typeof client.listTeams).toBe('function');
      expect(typeof client.getTeam).toBe('function');
      expect(typeof client.getTeamMembers).toBe('function');
      expect(typeof client.getCurrentTeam).toBe('function');
      expect(typeof client.getCurrentTeamMembers).toBe('function');

      // Cloud token operations
      expect(typeof client.listCloudTokens).toBe('function');
      expect(typeof client.getCloudToken).toBe('function');
      expect(typeof client.createCloudToken).toBe('function');
      expect(typeof client.updateCloudToken).toBe('function');
      expect(typeof client.deleteCloudToken).toBe('function');
      expect(typeof client.validateCloudToken).toBe('function');

      // Application storage operations
      expect(typeof client.listApplicationStorages).toBe('function');
      expect(typeof client.createApplicationStorage).toBe('function');
      expect(typeof client.updateApplicationStorage).toBe('function');
      expect(typeof client.deleteApplicationStorage).toBe('function');

      // Application scheduled task operations
      expect(typeof client.listApplicationScheduledTasks).toBe('function');
      expect(typeof client.createApplicationScheduledTask).toBe('function');
      expect(typeof client.updateApplicationScheduledTask).toBe('function');
      expect(typeof client.deleteApplicationScheduledTask).toBe('function');
      expect(typeof client.listApplicationScheduledTaskExecutions).toBe('function');

      // Application preview operations
      expect(typeof client.deleteApplicationPreview).toBe('function');

      // Database environment variable operations
      expect(typeof client.listDatabaseEnvVars).toBe('function');
      expect(typeof client.createDatabaseEnvVar).toBe('function');
      expect(typeof client.updateDatabaseEnvVar).toBe('function');
      expect(typeof client.bulkUpdateDatabaseEnvVars).toBe('function');
      expect(typeof client.deleteDatabaseEnvVar).toBe('function');

      // Database storage operations
      expect(typeof client.listDatabaseStorages).toBe('function');
      expect(typeof client.createDatabaseStorage).toBe('function');
      expect(typeof client.updateDatabaseStorage).toBe('function');
      expect(typeof client.deleteDatabaseStorage).toBe('function');

      // Delete backup execution
      expect(typeof client.deleteBackupExecution).toBe('function');

      // Service env var bulk operations
      expect(typeof client.bulkUpdateServiceEnvVars).toBe('function');

      // Service storage operations
      expect(typeof client.listServiceStorages).toBe('function');
      expect(typeof client.createServiceStorage).toBe('function');
      expect(typeof client.updateServiceStorage).toBe('function');
      expect(typeof client.deleteServiceStorage).toBe('function');

      // Service scheduled task operations
      expect(typeof client.listServiceScheduledTasks).toBe('function');
      expect(typeof client.createServiceScheduledTask).toBe('function');
      expect(typeof client.updateServiceScheduledTask).toBe('function');
      expect(typeof client.deleteServiceScheduledTask).toBe('function');
      expect(typeof client.listServiceScheduledTaskExecutions).toBe('function');

      // Hetzner cloud operations
      expect(typeof client.listHetznerLocations).toBe('function');
      expect(typeof client.listHetznerServerTypes).toBe('function');
      expect(typeof client.listHetznerImages).toBe('function');
      expect(typeof client.listHetznerSSHKeys).toBe('function');
      expect(typeof client.createHetznerServer).toBe('function');

      // GitHub App repository operations
      expect(typeof client.listGitHubAppRepositories).toBe('function');
      expect(typeof client.listGitHubAppBranches).toBe('function');

      // Resources operations
      expect(typeof client.listResources).toBe('function');

      // Health operations
      expect(typeof client.getHealth).toBe('function');

      // API enable/disable operations
      expect(typeof client.enableApi).toBe('function');
      expect(typeof client.disableApi).toBe('function');

      // Version caching
      expect(typeof client.getCachedVersion).toBe('function');
    });
  });

  describe('server configuration', () => {
    it('should store baseUrl and accessToken in client', () => {
      const client = server['client'];
      // CoolifyClient stores base URL without /api/v1 suffix
      expect(client['baseUrl']).toBe('http://localhost:3000');
      expect(client['accessToken']).toBe('test-token');
    });
  });

  describe('env_vars tool handler', () => {
    // Reach the SDK-registered handler so the is_buildtime / is_runtime
    // passthrough lines are actually executed (not just type-checked).
    const callEnvVars = async (
      srv: CoolifyMcpServer,
      args: Record<string, unknown>,
    ): Promise<unknown> => {
      const tool = (
        srv as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['env_vars'];
      return tool.handler(args, {});
    };

    it('forwards is_buildtime/is_runtime to createApplicationEnvVar', async () => {
      const spy = jest
        .spyOn(server['client'], 'createApplicationEnvVar')
        .mockResolvedValue({ uuid: 'env-1' });

      await callEnvVars(server, {
        resource: 'application',
        action: 'create',
        uuid: 'app-uuid',
        key: 'PEM_KEY',
        value: '-----BEGIN-----',
        is_buildtime: false,
        is_runtime: true,
      });

      expect(spy).toHaveBeenCalledWith('app-uuid', {
        key: 'PEM_KEY',
        value: '-----BEGIN-----',
        is_buildtime: false,
        is_runtime: true,
      });
    });

    it('forwards is_buildtime/is_runtime to updateApplicationEnvVar', async () => {
      const spy = jest
        .spyOn(server['client'], 'updateApplicationEnvVar')
        .mockResolvedValue({ message: 'Updated' });

      await callEnvVars(server, {
        resource: 'application',
        action: 'update',
        uuid: 'app-uuid',
        key: 'NODE_ENV',
        value: 'production',
        is_buildtime: false,
        is_runtime: true,
      });

      expect(spy).toHaveBeenCalledWith('app-uuid', {
        key: 'NODE_ENV',
        value: 'production',
        is_buildtime: false,
        is_runtime: true,
      });
    });

    it('forwards is_buildtime/is_runtime to createServiceEnvVar', async () => {
      const spy = jest
        .spyOn(server['client'], 'createServiceEnvVar')
        .mockResolvedValue({ uuid: 'env-1' });

      await callEnvVars(server, {
        resource: 'service',
        action: 'create',
        uuid: 'svc-uuid',
        key: 'API_KEY',
        value: 'secret',
        is_buildtime: true,
        is_runtime: undefined,
      });

      expect(spy).toHaveBeenCalledWith('svc-uuid', {
        key: 'API_KEY',
        value: 'secret',
        is_buildtime: true,
        is_runtime: undefined,
      });
    });

    it('returns key/value error when create is missing required fields', async () => {
      const result = (await callEnvVars(server, {
        resource: 'application',
        action: 'create',
        uuid: 'app-uuid',
      })) as { content: Array<{ text: string }> };
      expect(result.content[0].text).toContain('key, value required');
    });

    it('returns key/value error when service create is missing required fields', async () => {
      const result = (await callEnvVars(server, {
        resource: 'service',
        action: 'create',
        uuid: 'svc-uuid',
      })) as { content: Array<{ text: string }> };
      expect(result.content[0].text).toContain('key, value required');
    });
  });

  describe('guarded environment tools', () => {
    const call = async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<{ content: Array<{ text: string }> }> => {
      const tool = (
        server as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools[name];
      return (await tool.handler(args, {})) as { content: Array<{ text: string }> };
    };

    it('inspect_env returns only requested keys and redacts values', async () => {
      jest.spyOn(server['client'], 'listApplicationEnvVars').mockResolvedValue([
        {
          uuid: 'env-1',
          key: 'REQUESTED',
          value: 'secret-value',
          is_buildtime: false,
          is_runtime: true,
        },
        {
          uuid: 'env-2',
          key: 'UNREQUESTED',
          value: 'unrelated',
          is_buildtime: false,
          is_runtime: true,
        },
      ] as never);
      const result = await call('inspect_env', {
        resource: 'application',
        uuid: 'abcdefghijklmnopqrstuvwx',
        keys: ['REQUESTED'],
      });
      const body = JSON.parse(result.content[0].text);
      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].entries[0].key).toBe('REQUESTED');
      expect(JSON.stringify(body)).not.toContain('secret-value');
      expect(JSON.stringify(body)).not.toContain('UNREQUESTED');
    });

    it('reconcile_env previews without invoking a mutation', async () => {
      const list = jest
        .spyOn(server['client'], 'listApplicationEnvVars')
        .mockResolvedValue([
          { uuid: 'env-1', key: 'REQUESTED', value: 'old', is_buildtime: false, is_runtime: true },
        ] as never);
      const update = jest.spyOn(server['client'], 'updateApplicationEnvVar');
      const result = await call('reconcile_env', {
        resource: 'application',
        uuid: 'abcdefghijklmnopqrstuvwx',
        keys: ['REQUESTED'],
        desired_values: { REQUESTED: 'new' },
      });
      const body = JSON.parse(result.content[0].text);
      expect(body.preview_only).toBe(true);
      expect(body.updated).toEqual(['REQUESTED']);
      expect(update).not.toHaveBeenCalled();
      expect(list).toHaveBeenCalledWith('abcdefghijklmnopqrstuvwx', {
        summary: false,
        reveal: true,
      });
    });
  });

  describe('system tool handler', () => {
    const callSystem = async (
      srv: CoolifyMcpServer,
      args: Record<string, unknown>,
    ): Promise<unknown> => {
      const tool = (
        srv as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['system'];
      return tool.handler(args, {});
    };

    it('forwards include_full and reveal to listResources', async () => {
      const spy = jest.spyOn(server['client'], 'listResources').mockResolvedValue([]);
      await callSystem(server, { action: 'list_resources', include_full: true, reveal: true });
      expect(spy).toHaveBeenCalledWith({ include_full: true, reveal: true });
    });

    it('calls listResources with undefined flags when neither is passed', async () => {
      const spy = jest.spyOn(server['client'], 'listResources').mockResolvedValue([]);
      await callSystem(server, { action: 'list_resources' });
      expect(spy).toHaveBeenCalledWith({ include_full: undefined, reveal: undefined });
    });
  });

  describe('bulk_env_update tool handler', () => {
    it('forwards is_buildtime/is_runtime to bulkEnvUpdate', async () => {
      const spy = jest.spyOn(server['client'], 'bulkEnvUpdate').mockResolvedValue({
        summary: { total: 2, succeeded: 2, failed: 0 },
        succeeded: [],
        failed: [],
      });

      const tool = (
        server as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['bulk_env_update'];
      await tool.handler(
        {
          app_uuids: ['app-1', 'app-2'],
          key: 'PEM_KEY',
          value: 'multiline',
          is_buildtime: false,
          is_runtime: true,
        },
        {},
      );

      expect(spy).toHaveBeenCalledWith(['app-1', 'app-2'], 'PEM_KEY', 'multiline', false, true);
    });
  });

  describe('application tool handler', () => {
    // Regression for #178 — verify the application tool's create_* hand-picks
    // forward build-config and health_check_* fields to the client. Previously
    // these fields were accepted by zod but silently dropped by the hand-pick.

    const callApplication = async (
      srv: CoolifyMcpServer,
      args: Record<string, unknown>,
    ): Promise<unknown> => {
      const tool = (
        srv as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['application'];
      return tool.handler(args, {});
    };

    const baseCreatePublic = {
      action: 'create_public' as const,
      project_uuid: 'proj-uuid',
      server_uuid: 'server-uuid',
      git_repository: 'https://github.com/org/monorepo',
      git_branch: 'main',
      build_pack: 'dockerfile',
      ports_exposes: '3000',
    };

    it('forwards build-config and health_check fields in create_public', async () => {
      const spy = jest
        .spyOn(server['client'], 'createApplicationPublic')
        .mockResolvedValue({ uuid: 'app-1' });

      await callApplication(server, {
        ...baseCreatePublic,
        base_directory: '/apps/api',
        publish_directory: '/dist',
        install_command: 'pnpm install',
        build_command: 'pnpm build',
        start_command: 'node dist/main.js',
        dockerfile_location: '/apps/api/Dockerfile',
        watch_paths: 'apps/api/**',
        health_check_enabled: true,
        health_check_path: '/health',
        health_check_port: 3000,
        health_check_start_period: 60,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          base_directory: '/apps/api',
          publish_directory: '/dist',
          install_command: 'pnpm install',
          build_command: 'pnpm build',
          start_command: 'node dist/main.js',
          dockerfile_location: '/apps/api/Dockerfile',
          watch_paths: 'apps/api/**',
          health_check_enabled: true,
          health_check_path: '/health',
          health_check_port: 3000,
          health_check_start_period: 60,
        }),
      );
    });

    it('forwards build-config and health_check fields in create_github', async () => {
      const spy = jest
        .spyOn(server['client'], 'createApplicationPrivateGH')
        .mockResolvedValue({ uuid: 'app-2' });

      await callApplication(server, {
        action: 'create_github',
        project_uuid: 'proj-uuid',
        server_uuid: 'server-uuid',
        github_app_uuid: 'gh-app-uuid',
        git_repository: 'org/monorepo',
        git_branch: 'main',
        base_directory: '/apps/api',
        dockerfile_location: '/apps/api/Dockerfile',
        watch_paths: 'apps/api/**',
        health_check_enabled: true,
        health_check_path: '/health',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          base_directory: '/apps/api',
          dockerfile_location: '/apps/api/Dockerfile',
          watch_paths: 'apps/api/**',
          health_check_enabled: true,
          health_check_path: '/health',
        }),
      );
    });

    it('forwards build-config and health_check fields in create_key', async () => {
      const spy = jest
        .spyOn(server['client'], 'createApplicationPrivateKey')
        .mockResolvedValue({ uuid: 'app-3' });

      await callApplication(server, {
        action: 'create_key',
        project_uuid: 'proj-uuid',
        server_uuid: 'server-uuid',
        private_key_uuid: 'key-uuid',
        git_repository: 'git@github.com:org/monorepo.git',
        git_branch: 'main',
        base_directory: '/apps/api',
        publish_directory: '/dist',
        install_command: 'pnpm install',
        build_command: 'pnpm build',
        start_command: 'node dist/main.js',
        dockerfile_location: '/apps/api/Dockerfile',
        watch_paths: 'apps/api/**',
        health_check_enabled: true,
        health_check_path: '/health',
        health_check_port: 3000,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          base_directory: '/apps/api',
          publish_directory: '/dist',
          install_command: 'pnpm install',
          build_command: 'pnpm build',
          start_command: 'node dist/main.js',
          dockerfile_location: '/apps/api/Dockerfile',
          watch_paths: 'apps/api/**',
          health_check_enabled: true,
          health_check_path: '/health',
          health_check_port: 3000,
        }),
      );
    });

    it('forwards health_check fields in create_dockerimage (build-config intentionally dropped)', async () => {
      const spy = jest
        .spyOn(server['client'], 'createApplicationDockerImage')
        .mockResolvedValue({ uuid: 'app-4' });

      // Caller passes both healthcheck AND build-config. Coolify's /applications/dockerimage
      // endpoint doesn't accept build-config (pre-built image), so handler must drop those.
      await callApplication(server, {
        action: 'create_dockerimage',
        project_uuid: 'proj-uuid',
        server_uuid: 'server-uuid',
        docker_registry_image_name: 'traefik/whoami',
        ports_exposes: '80',
        // Should be forwarded:
        health_check_enabled: true,
        health_check_path: '/health',
        health_check_port: 80,
        // Should NOT be forwarded (build-config not applicable to prebuilt image):
        base_directory: '/should-be-dropped',
        install_command: 'should-be-dropped',
        dockerfile_location: '/should-be-dropped',
      });

      const forwarded = spy.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
      expect(forwarded).toEqual(
        expect.objectContaining({
          health_check_enabled: true,
          health_check_path: '/health',
          health_check_port: 80,
        }),
      );
      expect(forwarded).not.toHaveProperty('base_directory');
      expect(forwarded).not.toHaveProperty('install_command');
      expect(forwarded).not.toHaveProperty('dockerfile_location');
    });

    it('forwards fields in create_dockerfile', async () => {
      const spy = jest
        .spyOn(server['client'], 'createApplicationDockerfile')
        .mockResolvedValue({ uuid: 'app-5' });

      await callApplication(server, {
        action: 'create_dockerfile',
        project_uuid: 'proj-uuid',
        server_uuid: 'server-uuid',
        dockerfile: 'FROM node:20\nCMD ["node", "index.js"]',
        dockerfile_location: '/Dockerfile',
        ports_exposes: '3000',
        base_directory: '/apps/api',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          project_uuid: 'proj-uuid',
          server_uuid: 'server-uuid',
          dockerfile: 'FROM node:20\nCMD ["node", "index.js"]',
          dockerfile_location: '/Dockerfile',
          ports_exposes: '3000',
          base_directory: '/apps/api',
        }),
      );
    });

    it('returns required-param error when create_dockerfile is missing dockerfile', async () => {
      const result = (await callApplication(server, {
        action: 'create_dockerfile',
        project_uuid: 'proj-uuid',
        server_uuid: 'server-uuid',
      })) as { content: Array<{ text: string }> };
      expect(result.content[0].text).toContain('project_uuid, server_uuid, dockerfile required');
    });

    it('forwards dockerfile_target_build through update (PATCH-only)', async () => {
      const spy = jest.spyOn(server['client'], 'updateApplication').mockResolvedValue({} as never);

      await callApplication(server, {
        action: 'update',
        uuid: 'app-uuid',
        dockerfile_location: '/apps/api/Dockerfile',
        dockerfile_target_build: 'production',
        base_directory: '/apps/api',
      });

      expect(spy).toHaveBeenCalledWith(
        'app-uuid',
        expect.objectContaining({
          dockerfile_location: '/apps/api/Dockerfile',
          dockerfile_target_build: 'production',
          base_directory: '/apps/api',
        }),
      );
      // Confirm the update spread strips routing fields.
      const updateData = spy.mock.calls[0]?.[1] as unknown as Record<string, unknown>;
      expect(updateData).not.toHaveProperty('action');
      expect(updateData).not.toHaveProperty('uuid');
    });

    it('forwards custom_network_aliases through update (#254)', async () => {
      const spy = jest.spyOn(server['client'], 'updateApplication').mockResolvedValue({} as never);

      await callApplication(server, {
        action: 'update',
        uuid: 'app-uuid',
        custom_network_aliases: 'edator-asr',
      });

      expect(spy).toHaveBeenCalledWith(
        'app-uuid',
        expect.objectContaining({ custom_network_aliases: 'edator-asr' }),
      );
    });
  });

  describe('create_application tool handler', () => {
    const ids = {
      server_uuid: 'abcdefghijklmnopqrstuvwx',
      project_uuid: 'bcdefghijklmnopqrstuvwxy',
      environment_uuid: 'cdefghijklmnopqrstuvwxyz',
      application_uuid: 'defghijklmnopqrstuvwxyza',
    };
    const baseArgs = {
      name: 'new-safe-app',
      git_repository: 'https://github.com/example/repo.git',
      git_branch: 'main',
      server_uuid: ids.server_uuid,
      project_uuid: ids.project_uuid,
      environment_uuid: ids.environment_uuid,
      build_pack: 'dockerfile',
      dockerfile_location: 'apps/api/Dockerfile',
      base_directory: '/apps/api',
      ports_exposes: '3000',
      domain: 'https://new-safe.example.com',
      auto_deploy: false,
    };

    const callCreateApplication = async (
      args: Record<string, unknown>,
    ): Promise<{ content: Array<{ text: string }> }> => {
      const tool = (
        server as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['create_application'];
      return (await tool.handler(args, {})) as { content: Array<{ text: string }> };
    };

    it('previews without making any creation request', async () => {
      const createSpy = jest.spyOn(server['client'], 'createApplicationPublic');

      const result = await callCreateApplication(baseArgs);
      const body = JSON.parse(result.content[0]!.text);

      expect(createSpy).not.toHaveBeenCalled();
      expect(body).toEqual({
        mode: 'preview',
        execute: false,
        created: false,
        deployed: false,
        message: 'Preview only: no Coolify application was created.',
        endpoint: '/api/v1/applications/public',
        payload: {
          project_uuid: ids.project_uuid,
          server_uuid: ids.server_uuid,
          environment_uuid: ids.environment_uuid,
          name: 'new-safe-app',
          git_repository: 'https://github.com/example/repo.git',
          git_branch: 'main',
          build_pack: 'dockerfile',
          dockerfile_location: 'apps/api/Dockerfile',
          base_directory: '/apps/api',
          ports_exposes: '3000',
          domains: 'https://new-safe.example.com',
          is_auto_deploy_enabled: false,
        },
      });
    });

    it('previews an environment name and sends only that environment field', async () => {
      const createSpy = jest.spyOn(server['client'], 'createApplicationPublic');

      const result = await callCreateApplication({
        ...baseArgs,
        environment_uuid: undefined,
        environment_name: ' production ',
      });
      const body = JSON.parse(result.content[0]!.text);

      expect(createSpy).not.toHaveBeenCalled();
      expect(body.payload).toEqual({
        project_uuid: ids.project_uuid,
        server_uuid: ids.server_uuid,
        environment_name: 'production',
        name: 'new-safe-app',
        git_repository: 'https://github.com/example/repo.git',
        git_branch: 'main',
        build_pack: 'dockerfile',
        dockerfile_location: 'apps/api/Dockerfile',
        base_directory: '/apps/api',
        ports_exposes: '3000',
        domains: 'https://new-safe.example.com',
        is_auto_deploy_enabled: false,
      });
      expect(body.payload).not.toHaveProperty('environment_uuid');
    });

    it('previews a trimmed destination UUID without making a POST', async () => {
      const createSpy = jest.spyOn(server['client'], 'createApplicationPublic');

      const result = await callCreateApplication({
        ...baseArgs,
        destination_uuid: ' gkw804owwskcksw0s8oww4sg ',
      });
      const body = JSON.parse(result.content[0]!.text);

      expect(createSpy).not.toHaveBeenCalled();
      expect(body.payload.destination_uuid).toBe('gkw804owwskcksw0s8oww4sg');
      expect(body.created).toBe(false);
      expect(body.deployed).toBe(false);
    });

    it('supports omitting destination_uuid without inferring one', async () => {
      const result = await callCreateApplication(baseArgs);
      const body = JSON.parse(result.content[0]!.text);

      expect(body.payload).not.toHaveProperty('destination_uuid');
    });

    it('rejects requests with neither environment selector', async () => {
      const result = await callCreateApplication({
        ...baseArgs,
        environment_uuid: undefined,
        environment_name: undefined,
      });

      expect(result.content[0]!.text).toContain(
        'exactly one of environment_uuid or environment_name is required',
      );
    });

    it('rejects requests with both environment selectors', async () => {
      const result = await callCreateApplication({ ...baseArgs, environment_name: 'production' });

      expect(result.content[0]!.text).toContain(
        'environment_uuid and environment_name are mutually exclusive',
      );
    });

    it('rejects a blank environment name', async () => {
      const result = await callCreateApplication({
        ...baseArgs,
        environment_uuid: undefined,
        environment_name: '   ',
      });

      expect(result.content[0]!.text).toContain('environment_name must not be blank');
    });

    it('rejects a blank destination UUID', async () => {
      const result = await callCreateApplication({ ...baseArgs, destination_uuid: '   ' });

      expect(result.content[0]!.text).toContain('destination_uuid must not be blank');
    });

    it('rejects a malformed destination UUID', async () => {
      const result = await callCreateApplication({
        ...baseArgs,
        destination_uuid: 'not-a-coolify-id',
      });

      expect(result.content[0]!.text).toContain(
        'destination_uuid is not a valid Coolify resource identifier',
      );
    });

    it('validates infrastructure, then sends the expected payload in execution mode', async () => {
      jest.spyOn(server['client'], 'getServer').mockResolvedValue({
        uuid: ids.server_uuid,
        is_usable: true,
      } as never);
      jest.spyOn(server['client'], 'getProject').mockResolvedValue({
        uuid: ids.project_uuid,
      } as never);
      jest
        .spyOn(server['client'], 'listProjectEnvironments')
        .mockResolvedValue([
          { uuid: ids.environment_uuid, project_uuid: ids.project_uuid },
        ] as never);
      jest.spyOn(server['client'], 'listApplications').mockResolvedValue([]);
      const createSpy = jest
        .spyOn(server['client'], 'createApplicationPublic')
        .mockResolvedValue({ uuid: ids.application_uuid });
      jest.spyOn(server['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        name: baseArgs.name,
        git_repository: baseArgs.git_repository,
        git_branch: baseArgs.git_branch,
        build_pack: baseArgs.build_pack,
      } as never);

      const result = await callCreateApplication({
        ...baseArgs,
        destination_uuid: ' gkw804owwskcksw0s8oww4sg ',
        execute: true,
      });
      const body = JSON.parse(result.content[0]!.text);

      expect(createSpy).toHaveBeenCalledWith({
        project_uuid: ids.project_uuid,
        server_uuid: ids.server_uuid,
        environment_uuid: ids.environment_uuid,
        destination_uuid: 'gkw804owwskcksw0s8oww4sg',
        name: 'new-safe-app',
        git_repository: 'https://github.com/example/repo.git',
        git_branch: 'main',
        build_pack: 'dockerfile',
        dockerfile_location: 'apps/api/Dockerfile',
        base_directory: '/apps/api',
        ports_exposes: '3000',
        domains: 'https://new-safe.example.com',
        is_auto_deploy_enabled: false,
      });
      expect(body.created).toBe(true);
      expect(body.deployed).toBe(false);
      expect(body.application.uuid).toBe(ids.application_uuid);
    });

    it('validates infrastructure, then sends an environment name in execution mode', async () => {
      jest.spyOn(server['client'], 'getServer').mockResolvedValue({
        uuid: ids.server_uuid,
        is_usable: true,
      } as never);
      jest.spyOn(server['client'], 'getProject').mockResolvedValue({
        uuid: ids.project_uuid,
      } as never);
      jest
        .spyOn(server['client'], 'listProjectEnvironments')
        .mockResolvedValue([
          { uuid: ids.environment_uuid, name: 'production', project_uuid: ids.project_uuid },
        ] as never);
      jest.spyOn(server['client'], 'listApplications').mockResolvedValue([]);
      const createSpy = jest
        .spyOn(server['client'], 'createApplicationPublic')
        .mockResolvedValue({ uuid: ids.application_uuid });
      jest.spyOn(server['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        name: baseArgs.name,
      } as never);

      const result = await callCreateApplication({
        ...baseArgs,
        environment_uuid: undefined,
        environment_name: ' production ',
        execute: true,
      });
      const body = JSON.parse(result.content[0]!.text);

      expect(createSpy).toHaveBeenCalledWith({
        project_uuid: ids.project_uuid,
        server_uuid: ids.server_uuid,
        environment_name: 'production',
        name: 'new-safe-app',
        git_repository: 'https://github.com/example/repo.git',
        git_branch: 'main',
        build_pack: 'dockerfile',
        dockerfile_location: 'apps/api/Dockerfile',
        base_directory: '/apps/api',
        ports_exposes: '3000',
        domains: 'https://new-safe.example.com',
        is_auto_deploy_enabled: false,
      });
      expect(body.created).toBe(true);
      expect(body.deployed).toBe(false);
    });

    it('fails closed on duplicate names before creation', async () => {
      jest.spyOn(server['client'], 'getServer').mockResolvedValue({
        uuid: ids.server_uuid,
        is_usable: true,
      } as never);
      jest
        .spyOn(server['client'], 'getProject')
        .mockResolvedValue({ uuid: ids.project_uuid } as never);
      jest
        .spyOn(server['client'], 'listProjectEnvironments')
        .mockResolvedValue([
          { uuid: ids.environment_uuid, project_uuid: ids.project_uuid },
        ] as never);
      jest
        .spyOn(server['client'], 'listApplications')
        .mockResolvedValue([{ uuid: ids.application_uuid, name: 'NEW-SAFE-APP' }] as never);
      const createSpy = jest.spyOn(server['client'], 'createApplicationPublic');

      const result = await callCreateApplication({ ...baseArgs, execute: true });

      expect(result.content[0]!.text).toContain('same name already exists');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects missing or invalid infrastructure identifiers without network calls', async () => {
      const getServerSpy = jest.spyOn(server['client'], 'getServer');
      const result = await callCreateApplication({
        ...baseArgs,
        server_uuid: 'not-a-coolify-id',
        project_uuid: '',
        execute: true,
      });

      expect(result.content[0]!.text).toContain(
        'server_uuid is not a valid Coolify resource identifier',
      );
      expect(result.content[0]!.text).toContain('project_uuid is required');
      expect(getServerSpy).not.toHaveBeenCalled();
    });

    it('rejects Dockerfile traversal before preview or execution', async () => {
      const result = await callCreateApplication({
        ...baseArgs,
        dockerfile_location: '../secrets/Dockerfile',
        execute: false,
      });

      expect(result.content[0]!.text).toContain(
        'dockerfile_location must be a repository-relative path',
      );
      expect(result.content[0]!.text).not.toContain('secrets/Dockerfile');
    });

    it('rejects malformed Coolify creation responses safely', async () => {
      jest
        .spyOn(server['client'], 'getServer')
        .mockResolvedValue({ uuid: ids.server_uuid } as never);
      jest
        .spyOn(server['client'], 'getProject')
        .mockResolvedValue({ uuid: ids.project_uuid } as never);
      jest
        .spyOn(server['client'], 'listProjectEnvironments')
        .mockResolvedValue([
          { uuid: ids.environment_uuid, project_uuid: ids.project_uuid },
        ] as never);
      jest.spyOn(server['client'], 'listApplications').mockResolvedValue([]);
      jest.spyOn(server['client'], 'createApplicationPublic').mockResolvedValue({} as never);

      const result = await callCreateApplication({ ...baseArgs, execute: true });

      expect(result.content[0]!.text).toContain('malformed creation metadata');
      expect(result.content[0]!.text).not.toContain('test-token');
    });

    it('redacts secrets from execution errors', async () => {
      jest
        .spyOn(server['client'], 'getServer')
        .mockRejectedValue(new Error('Coolify rejected request with token=test-token'));

      const result = await callCreateApplication({ ...baseArgs, execute: true });

      expect(result.content[0]!.text).not.toContain('test-token');
      expect(result.content[0]!.text).toContain('***REDACTED***');
    });

    it('keeps the existing application tool registered', () => {
      const tools = (server as unknown as { _registeredTools: Record<string, unknown> })
        ._registeredTools;
      expect(tools['application']).toBeDefined();
      expect(tools['create_application']).toBeDefined();
    });
  });

  describe('private key and application lifecycle tools', () => {
    const ids = {
      application_uuid: 'abcdefghijklmnopqrstuvwx',
      project_uuid: 'bcdefghijklmnopqrstuvwxy',
      environment_uuid: 'cdefghijklmnopqrstuvwxyz',
      server_uuid: 'defghijklmnopqrstuvwxyza',
      private_key_uuid: 'efghijklmnopqrstuvwxyzaa',
    };

    const toolHandler = (name: string) =>
      (
        server as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools[name]!.handler;

    const createArgs = {
      name: 'private-repo-app',
      git_repository: 'git@github.com:example/private.git',
      git_branch: 'main',
      server_uuid: ids.server_uuid,
      project_uuid: ids.project_uuid,
      environment_uuid: ids.environment_uuid,
      destination_uuid: 'fghijklmnopqrstuvwxyzaab',
      private_key_uuid: ` ${ids.private_key_uuid} `,
      build_pack: 'dockerfile',
      ports_exposes: '8080',
      execute: false,
    };

    const mockCreatePreflight = (): void => {
      jest.spyOn(server['client'], 'getServer').mockResolvedValue({
        uuid: ids.server_uuid,
        is_usable: true,
      } as never);
      jest
        .spyOn(server['client'], 'getProject')
        .mockResolvedValue({ uuid: ids.project_uuid } as never);
      jest
        .spyOn(server['client'], 'listProjectEnvironments')
        .mockResolvedValue([{ uuid: ids.environment_uuid }] as never);
      jest.spyOn(server['client'], 'listApplications').mockResolvedValue([]);
      jest
        .spyOn(server['client'], 'getPrivateKey')
        .mockResolvedValue({ uuid: ids.private_key_uuid } as never);
      jest.spyOn(server['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        name: createArgs.name,
      } as never);
    };

    it('lists private keys as metadata and omits all key material', async () => {
      jest.spyOn(server['client'], 'listPrivateKeys').mockResolvedValue([
        {
          id: 7,
          uuid: ids.private_key_uuid,
          name: 'repo key',
          description: 'safe description',
          private_key: '-----BEGIN PRIVATE KEY-----SECRET',
          public_key: 'ssh-ed25519 PUBLIC',
          fingerprint: 'SHA256:sensitive',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
      ] as never);
      jest
        .spyOn(server['client'], 'listApplications')
        .mockResolvedValue([{ uuid: ids.application_uuid, private_key_id: 7 }] as never);

      const result = (await toolHandler('list_private_keys')({}, {})) as {
        content: Array<{ text: string }>;
      };
      const text = result.content[0]!.text;
      const body = JSON.parse(text);

      expect(body.keys).toEqual([
        expect.objectContaining({
          uuid: ids.private_key_uuid,
          name: 'repo key',
          used_by_applications: true,
          used_by_application_count: 1,
          secrets_redacted: true,
        }),
      ]);
      expect(text).not.toContain('BEGIN PRIVATE KEY');
      expect(text).not.toContain('ssh-ed25519 PUBLIC');
      expect(text).not.toContain('SHA256:sensitive');
    });

    it('fails safely when private-key listing fails', async () => {
      jest
        .spyOn(server['client'], 'listPrivateKeys')
        .mockRejectedValue(new Error('upstream private_key=super-secret'));

      const result = (await toolHandler('list_private_keys')({}, {})) as {
        content: Array<{ text: string }>;
      };

      expect(result.content[0]!.text).toContain('failed safely');
      expect(result.content[0]!.text).not.toContain('super-secret');
    });

    it('returns an empty safe list when Coolify has no private keys', async () => {
      jest.spyOn(server['client'], 'listPrivateKeys').mockResolvedValue([]);
      jest.spyOn(server['client'], 'listApplications').mockResolvedValue([]);

      const result = (await toolHandler('list_private_keys')({}, {})) as {
        content: Array<{ text: string }>;
      };

      expect(JSON.parse(result.content[0]!.text)).toMatchObject({
        keys: [],
        secrets_redacted: true,
      });
    });

    it('previews private-key application creation with the exact supplied key and no POST', async () => {
      const createPublic = jest.spyOn(server['client'], 'createApplicationPublic');
      const createPrivate = jest.spyOn(server['client'], 'createApplicationPrivateKey');

      const result = (await toolHandler('create_application')(createArgs, {})) as {
        content: Array<{ text: string }>;
      };
      const body = JSON.parse(result.content[0]!.text);

      expect(body.endpoint).toBe('/api/v1/applications/private-deploy-key');
      expect(body.payload.private_key_uuid).toBe(ids.private_key_uuid);
      expect(createPublic).not.toHaveBeenCalled();
      expect(createPrivate).not.toHaveBeenCalled();
    });

    it('executes private-key creation with the exact key and never deploys', async () => {
      mockCreatePreflight();
      const createPrivate = jest
        .spyOn(server['client'], 'createApplicationPrivateKey')
        .mockResolvedValue({ uuid: ids.application_uuid });
      const deploy = jest.spyOn(server['client'], 'deployByTagOrUuid');

      const result = (await toolHandler('create_application')(
        { ...createArgs, execute: true },
        {},
      )) as {
        content: Array<{ text: string }>;
      };
      const body = JSON.parse(result.content[0]!.text);

      expect(createPrivate).toHaveBeenCalledWith(
        expect.objectContaining({ private_key_uuid: ids.private_key_uuid }),
      );
      expect(deploy).not.toHaveBeenCalled();
      expect(body.deployed).toBe(false);
    });

    it('rejects blank and malformed private-key UUIDs', async () => {
      const blank = (await toolHandler('create_application')(
        { ...createArgs, private_key_uuid: '  ' },
        {},
      )) as {
        content: Array<{ text: string }>;
      };
      const malformed = (await toolHandler('create_application')(
        { ...createArgs, private_key_uuid: 'bad' },
        {},
      )) as {
        content: Array<{ text: string }>;
      };

      expect(blank.content[0]!.text).toContain('private_key_uuid must not be blank');
      expect(malformed.content[0]!.text).toContain(
        'private_key_uuid is not a valid Coolify resource identifier',
      );
    });

    it('previews deployment without mutation and defaults execute to false', async () => {
      jest.spyOn(server['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        name: 'private-repo-app',
        git_repository: createArgs.git_repository,
        git_branch: 'main',
        status: 'exited:unhealthy',
        fqdn: 'https://private.example.com',
      } as never);
      jest.spyOn(server['client'], 'listApplicationDeployments').mockResolvedValue({
        count: 0,
        deployments: [],
      });
      const trigger = jest.spyOn(server['client'], 'deployByTagOrUuid');

      const result = (await toolHandler('deploy_application')(
        {
          application_uuid: ` ${ids.application_uuid} `,
          force_rebuild: false,
        },
        {},
      )) as { content: Array<{ text: string }> };
      const body = JSON.parse(result.content[0]!.text);

      expect(body.execute).toBe(false);
      expect(body.deployment_request.endpoint).toBe(
        `/api/v1/deploy?uuid=${ids.application_uuid}&force=false`,
      );
      expect(body.deployment_started).toBe(false);
      expect(trigger).not.toHaveBeenCalled();
    });

    it('rejects active deployment and sends exactly one deployment request otherwise', async () => {
      jest.spyOn(server['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        name: 'private-repo-app',
      } as never);
      const deployments = jest
        .spyOn(server['client'], 'listApplicationDeployments')
        .mockResolvedValue({
          count: 1,
          deployments: [{ deployment_uuid: 'active-deployment', status: 'queued' }],
        } as never);
      const trigger = jest
        .spyOn(server['client'], 'deployByTagOrUuid')
        .mockResolvedValue({ deployments: [{ deployment_uuid: 'new-deployment' }] });

      const blocked = (await toolHandler('deploy_application')(
        {
          application_uuid: ids.application_uuid,
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };
      expect(blocked.content[0]!.text).toContain('active deployment exists');
      expect(trigger).not.toHaveBeenCalled();

      deployments.mockResolvedValueOnce({ count: 0, deployments: [] });
      deployments.mockResolvedValueOnce({
        count: 1,
        deployments: [{ deployment_uuid: 'new-deployment', status: 'queued' }],
      } as never);
      const executed = (await toolHandler('deploy_application')(
        {
          application_uuid: ids.application_uuid,
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };
      const body = JSON.parse(executed.content[0]!.text);
      expect(trigger).toHaveBeenCalledTimes(1);
      expect(body.deployment_uuid).toBe('new-deployment');
    });

    it('surfaces a deployment failure without retrying', async () => {
      jest.spyOn(server['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        name: 'private-repo-app',
      } as never);
      jest.spyOn(server['client'], 'listApplicationDeployments').mockResolvedValue({
        count: 0,
        deployments: [],
      });
      const trigger = jest
        .spyOn(server['client'], 'deployByTagOrUuid')
        .mockRejectedValue(new Error('upstream deployment failed'));

      const result = (await toolHandler('deploy_application')(
        { application_uuid: ids.application_uuid, execute: true },
        {},
      )) as { content: Array<{ text: string }> };

      expect(result.content[0]!.text).toContain('upstream deployment failed');
      expect(trigger).toHaveBeenCalledTimes(1);
    });

    it('previews deletion, enforces exact name, and blocks active deployments', async () => {
      let applicationExists = true;
      jest.spyOn(server['client'], 'getApplication').mockImplementation(async () => {
        if (!applicationExists) throw new Error('HTTP 404: not found');
        return {
          uuid: ids.application_uuid,
          name: 'private-repo-app',
          git_repository: createArgs.git_repository,
          git_branch: 'main',
          status: 'exited:unhealthy',
          fqdn: 'https://private.example.com',
        } as never;
      });
      const deployments = jest
        .spyOn(server['client'], 'listApplicationDeployments')
        .mockResolvedValue({ count: 0, deployments: [] });
      const deleteSpy = jest
        .spyOn(server['client'], 'deleteApplication')
        .mockImplementation(async () => {
          applicationExists = false;
          return { message: 'deleted' };
        });

      const preview = (await toolHandler('delete_application')(
        {
          application_uuid: ids.application_uuid,
          expected_name: 'private-repo-app',
        },
        {},
      )) as { content: Array<{ text: string }> };
      const body = JSON.parse(preview.content[0]!.text);
      expect(body.execute).toBe(false);
      expect(body.deletion_started).toBe(false);
      expect(deleteSpy).not.toHaveBeenCalled();

      const deleted = (await toolHandler('delete_application')(
        {
          application_uuid: ids.application_uuid,
          expected_name: 'private-repo-app',
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };
      const deletedBody = JSON.parse(deleted.content[0]!.text);
      expect(deletedBody.deleted).toBe(true);
      expect(deletedBody.verification).toMatchObject({
        ok: true,
        status: 'not_found',
        exists: false,
      });
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy).toHaveBeenCalledWith(ids.application_uuid);

      applicationExists = true;
      const mismatch = (await toolHandler('delete_application')(
        {
          application_uuid: ids.application_uuid,
          expected_name: 'wrong-name',
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };
      expect(mismatch.content[0]!.text).toContain('does not exactly match');
      expect(deleteSpy).toHaveBeenCalledTimes(1);

      deployments.mockResolvedValue({
        count: 1,
        deployments: [{ deployment_uuid: 'active-deployment', status: 'in_progress' } as never],
      } as never);
      const blocked = (await toolHandler('delete_application')(
        {
          application_uuid: ids.application_uuid,
          expected_name: 'private-repo-app',
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };
      expect(blocked.content[0]!.text).toContain('active deployment exists');
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });

    it('does not claim deletion when the exact application still exists', async () => {
      jest.spyOn(server['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        name: 'private-repo-app',
      } as never);
      jest
        .spyOn(server['client'], 'listApplicationDeployments')
        .mockResolvedValue({ count: 0, deployments: [] });
      const deleteSpy = jest
        .spyOn(server['client'], 'deleteApplication')
        .mockResolvedValue({ message: 'deleted' });

      const result = (await toolHandler('delete_application')(
        {
          application_uuid: ids.application_uuid,
          expected_name: 'private-repo-app',
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };
      const body = JSON.parse(result.content[0]!.text);
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(body.deleted).toBe(false);
      expect(body.operation_status).toBe('verification_failed');
      expect(body.verification).toMatchObject({ ok: false, status: 'still_exists', exists: true });
    });

    it('does not claim deletion when the read-back fails unexpectedly', async () => {
      jest
        .spyOn(server['client'], 'getApplication')
        .mockResolvedValueOnce({ uuid: ids.application_uuid, name: 'private-repo-app' } as never)
        .mockRejectedValueOnce(new Error('HTTP 500: Coolify read-back unavailable'));
      jest
        .spyOn(server['client'], 'listApplicationDeployments')
        .mockResolvedValue({ count: 0, deployments: [] });
      const deleteSpy = jest
        .spyOn(server['client'], 'deleteApplication')
        .mockResolvedValue({ message: 'deleted' });

      const result = (await toolHandler('delete_application')(
        {
          application_uuid: ids.application_uuid,
          expected_name: 'private-repo-app',
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };
      const body = JSON.parse(result.content[0]!.text);
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(body.deleted).toBe(false);
      expect(body.verification).toMatchObject({
        ok: false,
        status: 'readback_error',
        exists: null,
      });
    });

    it('rejects malformed lifecycle UUIDs before lookup', async () => {
      const getApplication = jest.spyOn(server['client'], 'getApplication');
      const deployResult = (await toolHandler('deploy_application')(
        {
          application_uuid: 'bad',
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };
      const deleteResult = (await toolHandler('delete_application')(
        {
          application_uuid: 'bad',
          expected_name: 'anything',
          execute: true,
        },
        {},
      )) as { content: Array<{ text: string }> };

      expect(deployResult.content[0]!.text).toContain('not a valid Coolify resource identifier');
      expect(deleteResult.content[0]!.text).toContain('not a valid Coolify resource identifier');
      expect(getApplication).not.toHaveBeenCalled();
    });
  });

  describe('list_applications pagination', () => {
    const toolHandler = () =>
      (
        server as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools.list_applications!.handler;

    const callList = async (args: Record<string, unknown>) => {
      const result = (await toolHandler()(args, {})) as { content: Array<{ text: string }> };
      return JSON.parse(result.content[0]!.text) as {
        data: Array<{ uuid: string }>;
        pagination: { page: number; per_page: number; total: number; has_next: boolean };
        _pagination?: { next?: unknown; prev?: unknown };
      };
    };

    it('returns first, second, and last pages with accurate next metadata', async () => {
      jest
        .spyOn(server['client'], 'listApplications')
        .mockResolvedValue(['a', 'b', 'c'].map((uuid) => ({ uuid, name: uuid })) as never);
      const first = await callList({ page: 1, per_page: 1 });
      const second = await callList({ page: 2, per_page: 1 });
      const last = await callList({ page: 3, per_page: 1 });
      expect(first.data).toHaveLength(1);
      expect(first.data[0]!.uuid).toBe('a');
      expect(first.pagination.has_next).toBe(true);
      expect(first._pagination?.next).toBeDefined();
      expect(second.data[0]!.uuid).toBe('b');
      expect(second._pagination?.prev).toBeDefined();
      expect(second._pagination?.next).toBeDefined();
      expect(last.data[0]!.uuid).toBe('c');
      expect(last.pagination.has_next).toBe(false);
      expect(last._pagination?.next).toBeUndefined();
    });

    it('bounds excessive page sizes and returns an empty page without a next link', async () => {
      jest
        .spyOn(server['client'], 'listApplications')
        .mockResolvedValue([{ uuid: 'a', name: 'a' }] as never);
      const bounded = await callList({ page: 1, per_page: 100000 });
      expect(bounded.pagination.per_page).toBe(100);
      expect(bounded.data).toHaveLength(1);
      const empty = await callList({ page: 1, per_page: 1 });
      jest.spyOn(server['client'], 'listApplications').mockResolvedValue([] as never);
      const noResults = await callList({ page: 1, per_page: 1 });
      expect(empty.pagination.has_next).toBe(false);
      expect(noResults.data).toEqual([]);
      expect(noResults.pagination).toMatchObject({ total: 0, has_next: false });
      expect(noResults._pagination).toBeUndefined();
    });
  });

  describe('database tool handler', () => {
    // Regression for #217 — the database tool's create action didn't expose
    // destination_uuid, so Coolify rejected creates on servers with more than
    // one destination ("Server has multiple destinations. Please provide a
    // destination_uuid.").

    const callDatabase = async (
      srv: CoolifyMcpServer,
      args: Record<string, unknown>,
    ): Promise<unknown> => {
      const tool = (
        srv as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['database'];
      return tool.handler(args, {});
    };

    it('forwards destination_uuid to createPostgresql when provided', async () => {
      const spy = jest
        .spyOn(server['client'], 'createPostgresql')
        .mockResolvedValue({ uuid: 'db-1' });

      await callDatabase(server, {
        action: 'create',
        type: 'postgresql',
        project_uuid: 'proj-uuid',
        server_uuid: 'server-uuid',
        destination_uuid: 'dest-uuid',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          destination_uuid: 'dest-uuid',
        }),
      );
    });

    it('omits destination_uuid from createPostgresql when not provided', async () => {
      const spy = jest
        .spyOn(server['client'], 'createPostgresql')
        .mockResolvedValue({ uuid: 'db-2' });

      await callDatabase(server, {
        action: 'create',
        type: 'postgresql',
        project_uuid: 'proj-uuid',
        server_uuid: 'server-uuid',
      });

      const forwarded = spy.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
      expect(forwarded.destination_uuid).toBeUndefined();
    });
  });

  describe('provision_application_postgres tool handler', () => {
    const ids = {
      application_uuid: 'abcdefghijklmnopqrstuvwx',
      project_uuid: 'bcdefghijklmnopqrstuvwxy',
      environment_uuid: 'cdefghijklmnopqrstuvwxyz',
      server_uuid: 'defghijklmnopqrstuvwxyza',
      destination_uuid: 'efghijklmnopqrstuvwxyzaa',
      database_uuid: 'fghijklmnopqrstuvwxyzaab',
    };
    const baseArgs = {
      application_uuid: ids.application_uuid,
      project_uuid: ids.project_uuid,
      environment_name: ' production ',
      server_uuid: ids.server_uuid,
      destination_uuid: ` ${ids.destination_uuid} `,
      database_name: 'managed_data',
      environment_variable_key: 'MANAGED_DATABASE_URL',
      postgres_version: '16',
      storage_size: '10Gi',
      dry_run: true,
      apply: false,
    };

    const callProvision = async (
      srv: CoolifyMcpServer,
      args: Record<string, unknown>,
    ): Promise<{ content: Array<{ text: string }> }> => {
      const tool = (
        srv as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['provision_application_postgres'];
      return (await tool.handler(args, {})) as { content: Array<{ text: string }> };
    };

    const mockPreflight = (srv: CoolifyMcpServer, databases: unknown[] = []): void => {
      jest.spyOn(srv['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        name: 'generic-app',
        environment_id: 1,
        destination: {
          uuid: ids.destination_uuid,
          server: { uuid: ids.server_uuid },
        },
      } as never);
      jest
        .spyOn(srv['client'], 'getProject')
        .mockResolvedValue({ uuid: ids.project_uuid } as never);
      jest.spyOn(srv['client'], 'getServer').mockResolvedValue({
        uuid: ids.server_uuid,
        is_usable: true,
        is_reachable: true,
      } as never);
      jest.spyOn(srv['client'], 'listProjectEnvironments').mockResolvedValue([
        {
          id: 1,
          uuid: ids.environment_uuid,
          name: 'production',
          project_uuid: ids.project_uuid,
        },
      ] as never);
      jest.spyOn(srv['client'], 'listResources').mockResolvedValue([
        {
          uuid: 'resource-uuid',
          name: 'generic-app',
          type: 'application',
          destination: { uuid: ids.destination_uuid, server: { uuid: ids.server_uuid } },
        },
      ] as never);
      jest.spyOn(srv['client'], 'listDatabases').mockResolvedValue(databases as never);
      jest.spyOn(srv['client'], 'listApplicationEnvVars').mockResolvedValue([] as never);
    };

    const readyDatabase = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
      uuid: ids.database_uuid,
      name: 'managed_data',
      postgres_db: 'managed_data',
      database_type: 'standalone-postgresql',
      status: 'running:healthy',
      environment_id: 1,
      destination: { uuid: ids.destination_uuid, server: { uuid: ids.server_uuid } },
      internal_db_url: 'postgresql://postgres:super-secret@managed_data:5432/managed_data',
      postgres_password: 'super-secret',
      ...overrides,
    });

    it('performs a generic dry-run without POSTs or secret output', async () => {
      mockPreflight(server);
      const createDatabase = jest.spyOn(server['client'], 'createPostgresql');
      const createStorage = jest.spyOn(server['client'], 'createDatabaseStorage');
      const createVariable = jest.spyOn(server['client'], 'createApplicationEnvVar');

      const result = await callProvision(server, baseArgs);
      const text = result.content[0]!.text;
      const body = JSON.parse(text);

      expect(body).toMatchObject({
        operation_status: 'validated',
        dry_run: true,
        apply: false,
        database_name: 'managed_data',
        database_action: 'create',
        application_uuid: ids.application_uuid,
        environment_variable_key: 'MANAGED_DATABASE_URL',
        variable_action: 'create',
        variable_attached: false,
      });
      expect(body.persistent_storage).toMatchObject({
        type: 'persistent',
        mount_path: '/var/lib/postgresql/data',
        requested_size: '10Gi',
        coolify_managed: true,
      });
      expect(createDatabase).not.toHaveBeenCalled();
      expect(createStorage).not.toHaveBeenCalled();
      expect(createVariable).not.toHaveBeenCalled();
      expect(text).not.toContain('super-secret');
      expect(
        (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools[
          'provision_application_postgres'
        ],
      ).toBeDefined();
    });

    it('validates malformed identifiers before any lookup', async () => {
      const getApplication = jest.spyOn(server['client'], 'getApplication');
      const result = await callProvision(server, {
        ...baseArgs,
        application_uuid: 'bad',
        project_uuid: 'bad',
        environment_uuid: 'bad',
        environment_name: undefined,
        server_uuid: 'bad',
        destination_uuid: 'bad',
      });

      expect(result.content[0]!.text).toContain(
        'application_uuid is not a valid Coolify resource identifier',
      );
      expect(result.content[0]!.text).toContain(
        'environment_uuid is not a valid Coolify resource identifier',
      );
      expect(getApplication).not.toHaveBeenCalled();
    });

    it('rejects a destination/server mismatch before mutation', async () => {
      mockPreflight(server);
      jest.spyOn(server['client'], 'getApplication').mockResolvedValue({
        uuid: ids.application_uuid,
        environment_id: 1,
        destination: { uuid: ids.destination_uuid, server: { uuid: 'different-server-uuid' } },
      } as never);
      const createDatabase = jest.spyOn(server['client'], 'createPostgresql');

      const result = await callProvision(server, baseArgs);

      expect(result.content[0]!.text).toContain('not attached to the selected destination/server');
      expect(createDatabase).not.toHaveBeenCalled();
    });

    it('creates PostgreSQL with the selected context, persistent storage, and runtime-only variable', async () => {
      mockPreflight(server);
      const createDatabase = jest
        .spyOn(server['client'], 'createPostgresql')
        .mockResolvedValue({ uuid: ids.database_uuid });
      jest.spyOn(server['client'], 'getDatabase').mockResolvedValue(readyDatabase() as never);
      const listStorage = jest
        .spyOn(server['client'], 'listDatabaseStorages')
        .mockResolvedValue({ persistent_storages: [], file_storages: [] });
      const createStorage = jest
        .spyOn(server['client'], 'createDatabaseStorage')
        .mockResolvedValue({ message: 'created' });
      const createVariable = jest
        .spyOn(server['client'], 'createApplicationEnvVar')
        .mockResolvedValue({ uuid: 'env-uuid' });
      jest
        .spyOn(server['client'], 'listApplicationEnvVars')
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([
          { key: 'MANAGED_DATABASE_URL', is_runtime: true, is_buildtime: false },
        ] as never);

      const result = await callProvision(server, {
        ...baseArgs,
        environment_name: undefined,
        environment_uuid: ids.environment_uuid,
        dry_run: false,
        apply: true,
      });
      const text = result.content[0]!.text;
      const body = JSON.parse(text);

      expect(createDatabase).toHaveBeenCalledWith({
        server_uuid: ids.server_uuid,
        project_uuid: ids.project_uuid,
        environment_uuid: ids.environment_uuid,
        destination_uuid: ids.destination_uuid,
        name: 'managed_data',
        postgres_db: 'managed_data',
        image: 'postgres:16',
        instant_deploy: true,
      });
      expect(listStorage).toHaveBeenCalledWith(ids.database_uuid);
      expect(createStorage).toHaveBeenCalledWith(ids.database_uuid, {
        type: 'persistent',
        name: 'managed_data-data',
        mount_path: '/var/lib/postgresql/data',
      });
      expect(createVariable).toHaveBeenCalledWith(ids.application_uuid, {
        key: 'MANAGED_DATABASE_URL',
        value: 'postgresql://postgres:super-secret@managed_data:5432/managed_data',
        is_buildtime: false,
        is_runtime: true,
      });
      expect(body).toEqual({
        database_uuid: ids.database_uuid,
        database_name: 'managed_data',
        database_status: 'running:healthy',
        application_uuid: ids.application_uuid,
        environment_variable_key: 'MANAGED_DATABASE_URL',
        variable_attached: true,
        created_or_reused: 'created',
        redeploy_required: true,
        operation_status: 'completed',
      });
      expect(text).not.toContain('super-secret');
      expect(text).not.toContain('postgresql://');
    });

    it('reuses an exact compatible database and updates an existing attachment', async () => {
      mockPreflight(server, [
        { uuid: ids.database_uuid, name: 'managed_data', type: 'postgresql' },
      ]);
      const database = readyDatabase();
      jest.spyOn(server['client'], 'getDatabase').mockResolvedValue(database as never);
      jest.spyOn(server['client'], 'listDatabaseStorages').mockResolvedValue({
        persistent_storages: [{ mount_path: '/var/lib/postgresql/data' }],
        file_storages: [],
      } as never);
      const createDatabase = jest.spyOn(server['client'], 'createPostgresql');
      const updateVariable = jest
        .spyOn(server['client'], 'updateApplicationEnvVar')
        .mockResolvedValue({ message: 'updated' });
      jest
        .spyOn(server['client'], 'listApplicationEnvVars')
        .mockResolvedValueOnce([
          { key: 'MANAGED_DATABASE_URL', is_runtime: false, is_buildtime: true },
        ] as never)
        .mockResolvedValueOnce([
          { key: 'MANAGED_DATABASE_URL', is_runtime: true, is_buildtime: false },
        ] as never);

      const result = await callProvision(server, { ...baseArgs, dry_run: false, apply: true });
      const body = JSON.parse(result.content[0]!.text);

      expect(createDatabase).not.toHaveBeenCalled();
      expect(updateVariable).toHaveBeenCalledWith(ids.application_uuid, {
        key: 'MANAGED_DATABASE_URL',
        value: 'postgresql://postgres:super-secret@managed_data:5432/managed_data',
        is_buildtime: false,
        is_runtime: true,
      });
      expect(body.created_or_reused).toBe('reused');
      expect(body.variable_attached).toBe(true);
      expect(result.content[0]!.text).not.toContain('super-secret');
    });

    it('refuses a conflicting database without deleting or overwriting it', async () => {
      mockPreflight(server, [
        { uuid: ids.database_uuid, name: 'managed_data', type: 'postgresql' },
      ]);
      jest
        .spyOn(server['client'], 'getDatabase')
        .mockResolvedValue(readyDatabase({ postgres_db: 'different_database' }) as never);
      const createDatabase = jest.spyOn(server['client'], 'createPostgresql');
      const deleteDatabase = jest.spyOn(server['client'], 'deleteDatabase');

      const result = await callProvision(server, { ...baseArgs, dry_run: false, apply: true });

      expect(result.content[0]!.text).toContain('conflicts with the requested name or placement');
      expect(createDatabase).not.toHaveBeenCalled();
      expect(deleteDatabase).not.toHaveBeenCalled();
    });

    it('redacts generated credentials from attachment failures and preserves retry state', async () => {
      mockPreflight(server);
      jest
        .spyOn(server['client'], 'createPostgresql')
        .mockResolvedValue({ uuid: ids.database_uuid });
      jest.spyOn(server['client'], 'getDatabase').mockResolvedValue(readyDatabase() as never);
      jest.spyOn(server['client'], 'listDatabaseStorages').mockResolvedValue({
        persistent_storages: [{ mount_path: '/var/lib/postgresql/data' }],
        file_storages: [],
      } as never);
      jest
        .spyOn(server['client'], 'createApplicationEnvVar')
        .mockRejectedValue(
          new Error(
            'attachment failed password=super-secret postgresql://postgres:super-secret@managed_data:5432/managed_data',
          ),
        );
      const deleteDatabase = jest.spyOn(server['client'], 'deleteDatabase');

      const result = await callProvision(server, { ...baseArgs, dry_run: false, apply: true });
      const text = result.content[0]!.text;

      expect(text).not.toContain('super-secret');
      expect(text).not.toContain('postgresql://');
      expect(text).toContain('attachment failed');
      expect(deleteDatabase).not.toHaveBeenCalled();
    });

    it('reports a redacted readiness timeout without deleting the managed database', async () => {
      jest.useFakeTimers();
      try {
        mockPreflight(server);
        jest
          .spyOn(server['client'], 'createPostgresql')
          .mockResolvedValue({ uuid: ids.database_uuid });
        jest
          .spyOn(server['client'], 'getDatabase')
          .mockResolvedValue(readyDatabase({ status: 'starting' }) as never);
        jest.spyOn(server['client'], 'listDatabaseStorages').mockResolvedValue({
          persistent_storages: [],
          file_storages: [],
        });
        const deleteDatabase = jest.spyOn(server['client'], 'deleteDatabase');

        const resultPromise = callProvision(server, { ...baseArgs, dry_run: false, apply: true });
        await jest.advanceTimersByTimeAsync(31_000);
        const result = await resultPromise;

        expect(result.content[0]!.text).toContain('readiness timed out');
        expect(deleteDatabase).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('supports explicit application redeployment only after a successful attachment', async () => {
      mockPreflight(server);
      jest
        .spyOn(server['client'], 'createPostgresql')
        .mockResolvedValue({ uuid: ids.database_uuid });
      jest.spyOn(server['client'], 'getDatabase').mockResolvedValue(readyDatabase() as never);
      jest.spyOn(server['client'], 'listDatabaseStorages').mockResolvedValue({
        persistent_storages: [{ mount_path: '/var/lib/postgresql/data' }],
        file_storages: [],
      } as never);
      jest
        .spyOn(server['client'], 'listApplicationEnvVars')
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([
          { key: 'MANAGED_DATABASE_URL', is_runtime: true, is_buildtime: false },
        ] as never);
      jest
        .spyOn(server['client'], 'createApplicationEnvVar')
        .mockResolvedValue({ uuid: 'env-uuid' });
      const restart = jest
        .spyOn(server['client'], 'restartApplication')
        .mockResolvedValue({ message: 'restarted' });

      const result = await callProvision(server, {
        ...baseArgs,
        dry_run: false,
        apply: true,
        redeploy_application: true,
      });

      expect(restart).toHaveBeenCalledWith(ids.application_uuid);
      expect(JSON.parse(result.content[0]!.text).redeploy_required).toBe(false);
    });
  });

  describe('deployment tool handler (#232 essential projection)', () => {
    // Regression for #232: `deployment {action: get, lines: N}` used to call
    // getDeployment(uuid, { includeLogs: true }) and spread the RAW upstream
    // payload into the response — leaking the destination server's
    // logdrain_custom_config bearer token, sentinel_token, webhook secrets,
    // and the full docker_compose/application graph. It must now always go
    // through toDeploymentEssential(), with only the (string) logs attached.

    const callDeployment = async (
      srv: CoolifyMcpServer,
      args: Record<string, unknown>,
    ): Promise<{ content: Array<{ text: string }> }> => {
      const tool = (
        srv as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['deployment'];
      return tool.handler(args, {}) as Promise<{ content: Array<{ text: string }> }>;
    };

    // Mock the raw HTTP layer (not the client) so the test exercises the real
    // CoolifyClient projection logic, not just the mcp-server spread.
    const mockFetch = jest.fn<typeof fetch>();
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = mockFetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
      mockFetch.mockReset();
    });

    function mockJsonResponse(data: unknown): Response {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: async () => JSON.stringify(data),
      } as Response;
    }

    // A raw upstream deployment payload shaped like real Coolify responses:
    // the full application graph plus the destination server object,
    // including the secrets called out in #232.
    function rawDeploymentWithSecrets(logsEntryCount: number): Record<string, unknown> {
      const logs = JSON.stringify(
        Array.from({ length: logsEntryCount }, (_, i) => ({
          output: `log line ${i}`,
          timestamp: `2026-07-02T00:00:0${i}Z`,
          hidden: false,
        })),
      );
      return {
        id: 1,
        uuid: 'dep-uuid',
        deployment_uuid: 'dep-123',
        application_uuid: 'app-uuid',
        application_name: 'test-app',
        server_name: 'test-server',
        status: 'finished',
        commit: 'abc123',
        force_rebuild: false,
        is_webhook: false,
        is_api: true,
        restart_only: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        logs,
        // Raw upstream fields that must never leak through the projection:
        application: {
          uuid: 'app-uuid',
          docker_compose: 'x'.repeat(5000),
          docker_compose_raw: 'x'.repeat(5000),
          custom_labels: 'a'.repeat(2000),
          manual_webhook_secret_github: 'ghsecret',
          manual_webhook_secret_gitlab: 'glsecret',
        },
        destination: {
          server: {
            uuid: 'server-uuid',
            ip: '1.2.3.4',
            settings: {
              logdrain_custom_config: 'Bearer live-logdrain-token-abc123',
              sentinel_token: 'live-sentinel-token-xyz789',
            },
            proxy: { config: 'y'.repeat(3000) },
          },
        },
      };
    }

    it('returns essential fields + logs only, no leaked secrets or nested graphs', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse(rawDeploymentWithSecrets(5)));

      const result = await callDeployment(server, { action: 'get', uuid: 'dep-uuid', lines: 5 });
      const text = result.content[0].text;

      expect(text).not.toContain('logdrain');
      expect(text).not.toContain('sentinel_token');
      expect(text).not.toContain('manual_webhook_secret');
      expect(text).not.toContain('docker_compose');
      expect(text).not.toMatch(/"application":\s*{/);
      expect(text).not.toMatch(/"server":\s*{/);
      expect(text).not.toMatch(/"destination":\s*{/);

      const parsed = JSON.parse(text) as { data: Record<string, unknown> };
      expect(parsed.data).toMatchObject({
        uuid: 'dep-uuid',
        application_uuid: 'app-uuid',
        application_name: 'test-app',
        server_name: 'test-server',
        status: 'finished',
      });
      expect(typeof parsed.data.logs).toBe('string');
      expect(parsed.data).not.toHaveProperty('application');
      expect(parsed.data).not.toHaveProperty('destination');
      expect(parsed.data).not.toHaveProperty('id');
    });

    it('keeps the response under 20KB even with a bloated upstream payload', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse(rawDeploymentWithSecrets(5)));

      const result = await callDeployment(server, { action: 'get', uuid: 'dep-uuid', lines: 5 });
      const text = result.content[0].text;

      expect(text.length).toBeLessThan(20_000);
    });
  });

  describe('scheduled_tasks tool handler', () => {
    // Regression for #234 — Coolify's `command` column is a 255-char varchar and
    // rejects longer commands with a bodyless HTTP 500. The zod schema must reject
    // an over-long command locally, before any HTTP call is attempted.

    const getScheduledTasksTool = (
      srv: CoolifyMcpServer,
    ): {
      inputSchema: { safeParse: (args: unknown) => { success: boolean; error?: unknown } };
      handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown>;
    } =>
      (
        srv as unknown as {
          _registeredTools: Record<
            string,
            {
              inputSchema: { safeParse: (args: unknown) => { success: boolean; error?: unknown } };
              handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown>;
            }
          >;
        }
      )._registeredTools['scheduled_tasks'];

    const baseArgs = {
      resource: 'application' as const,
      action: 'create' as const,
      uuid: 'app-uuid',
      name: 'my-task',
      frequency: '* * * * *',
    };

    it('rejects a command over 255 chars locally, with an actionable message', () => {
      const createSpy = jest.spyOn(server['client'], 'createApplicationScheduledTask');
      const updateSpy = jest.spyOn(server['client'], 'updateApplicationScheduledTask');

      const tool = getScheduledTasksTool(server);
      const result = tool.inputSchema.safeParse({ ...baseArgs, command: 'a'.repeat(256) });

      expect(result.success).toBe(false);
      const error = result.error as { issues: { message: string }[] };
      expect(error.issues[0]?.message).toContain(
        'Coolify rejects scheduled-task commands longer than 255 chars',
      );

      // No HTTP call should have been attempted.
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('accepts a command at exactly 255 chars', () => {
      const tool = getScheduledTasksTool(server);
      const result = tool.inputSchema.safeParse({ ...baseArgs, command: 'a'.repeat(255) });

      expect(result.success).toBe(true);
    });
  });

  describe('scheduled_tasks tool handler - run_once', () => {
    type ServerWithSleep = { sleep: (ms: number) => Promise<void> };

    const callScheduledTasks = async (
      srv: CoolifyMcpServer,
      args: Record<string, unknown>,
    ): Promise<{ content: Array<{ type: string; text: string }> }> => {
      const tool = (
        srv as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['scheduled_tasks'];
      return tool.handler(args, {}) as Promise<{ content: Array<{ type: string; text: string }> }>;
    };

    const baseArgs = {
      resource: 'application' as const,
      action: 'run_once' as const,
      uuid: 'app-uuid',
      command: 'php artisan migrate',
      container: 'app',
      wait_seconds: 10, // small budget -> few poll attempts in tests
    };

    const mockTask = {
      id: 1,
      uuid: 'task-uuid',
      enabled: true,
      name: 'oneoff-abc123',
      command: 'php artisan migrate',
      frequency: '* * * * *',
      timeout: 0,
      created_at: '',
      updated_at: '',
    };

    beforeEach(() => {
      // Poll loop uses a real setTimeout by default; override the instance method
      // directly so tests are instant (jest.spyOn's generic inference struggles
      // with private methods here, so a plain shadowing assignment is simpler).
      (server as unknown as ServerWithSleep).sleep = (): Promise<void> => Promise.resolve();
    });

    it('validates command and container are required', async () => {
      const result = await callScheduledTasks(server, {
        resource: 'application',
        action: 'run_once',
        uuid: 'app-uuid',
      });
      expect(result.content[0]!.text).toBe('Error: command, container required');
    });

    it('creates a task, polls until a terminal execution, returns its output, and deletes the task', async () => {
      const createSpy = jest
        .spyOn(server['client'], 'createApplicationScheduledTask')
        .mockResolvedValue(mockTask);
      const listSpy = jest
        .spyOn(server['client'], 'listApplicationScheduledTaskExecutions')
        .mockResolvedValueOnce([]) // first poll: nothing yet
        .mockResolvedValueOnce([
          {
            uuid: 'exec-uuid',
            status: 'success',
            message: 'Migrated: 2026_01_01_000000_add_col',
            retry_count: 0,
            created_at: '',
            updated_at: '',
          },
        ]);
      const deleteSpy = jest
        .spyOn(server['client'], 'deleteApplicationScheduledTask')
        .mockResolvedValue({ message: 'deleted' });

      const result = await callScheduledTasks(server, baseArgs);

      expect(createSpy).toHaveBeenCalledWith(
        'app-uuid',
        expect.objectContaining({
          command: 'php artisan migrate',
          frequency: '* * * * *',
          container: 'app',
          enabled: true,
        }),
      );
      expect(listSpy).toHaveBeenCalledTimes(2);
      expect(listSpy).toHaveBeenCalledWith('app-uuid', 'task-uuid');
      expect(deleteSpy).toHaveBeenCalledWith('app-uuid', 'task-uuid');

      const parsed = JSON.parse(result.content[0]!.text) as {
        status: string;
        message: string;
        task_uuid: string;
        cleanup: string;
      };
      expect(parsed.status).toBe('success');
      expect(parsed.message).toBe('Migrated: 2026_01_01_000000_add_col');
      expect(parsed.task_uuid).toBe('task-uuid');
      expect(parsed.cleanup).toContain('deleted');
    });

    it('times out when no execution ever appears, and still deletes the task', async () => {
      jest.spyOn(server['client'], 'createApplicationScheduledTask').mockResolvedValue(mockTask);
      jest.spyOn(server['client'], 'listApplicationScheduledTaskExecutions').mockResolvedValue([]);
      const deleteSpy = jest
        .spyOn(server['client'], 'deleteApplicationScheduledTask')
        .mockResolvedValue({ message: 'deleted' });

      const result = await callScheduledTasks(server, baseArgs);

      expect(deleteSpy).toHaveBeenCalledWith('app-uuid', 'task-uuid');
      expect(result.content[0]!.text).toContain('Timed out');
      expect(result.content[0]!.text).toContain('task-uuid');
      expect(result.content[0]!.text).toContain('deleted');
    });

    it('still deletes the task when polling throws, and surfaces the poll error', async () => {
      jest.spyOn(server['client'], 'createApplicationScheduledTask').mockResolvedValue(mockTask);
      jest
        .spyOn(server['client'], 'listApplicationScheduledTaskExecutions')
        .mockRejectedValue(new Error('network blip'));
      const deleteSpy = jest
        .spyOn(server['client'], 'deleteApplicationScheduledTask')
        .mockResolvedValue({ message: 'deleted' });

      const result = await callScheduledTasks(server, baseArgs);

      expect(deleteSpy).toHaveBeenCalledWith('app-uuid', 'task-uuid');
      expect(result.content[0]!.text).toContain('network blip');
      expect(result.content[0]!.text).toContain('task-uuid');
    });

    it('warns loudly with the task UUID when the cleanup delete itself fails', async () => {
      jest.spyOn(server['client'], 'createApplicationScheduledTask').mockResolvedValue(mockTask);
      jest.spyOn(server['client'], 'listApplicationScheduledTaskExecutions').mockResolvedValue([
        {
          uuid: 'exec-uuid',
          status: 'success',
          message: 'ok',
          retry_count: 0,
          created_at: '',
          updated_at: '',
        },
      ]);
      jest
        .spyOn(server['client'], 'deleteApplicationScheduledTask')
        .mockRejectedValue(new Error('403 forbidden'));

      const result = await callScheduledTasks(server, baseArgs);

      const parsed = JSON.parse(result.content[0]!.text) as { cleanup: string };
      expect(parsed.cleanup).toContain('WARNING');
      expect(parsed.cleanup).toContain('task-uuid');
      expect(parsed.cleanup).toContain('403 forbidden');
    });

    it('supports the service resource', async () => {
      const createSpy = jest
        .spyOn(server['client'], 'createServiceScheduledTask')
        .mockResolvedValue(mockTask);
      jest.spyOn(server['client'], 'listServiceScheduledTaskExecutions').mockResolvedValue([
        {
          uuid: 'e',
          status: 'success',
          message: 'ok',
          retry_count: 0,
          created_at: '',
          updated_at: '',
        },
      ]);
      const deleteSpy = jest
        .spyOn(server['client'], 'deleteServiceScheduledTask')
        .mockResolvedValue({ message: 'deleted' });

      await callScheduledTasks(server, { ...baseArgs, resource: 'service', uuid: 'svc-uuid' });

      expect(createSpy).toHaveBeenCalledWith('svc-uuid', expect.any(Object));
      expect(deleteSpy).toHaveBeenCalledWith('svc-uuid', 'task-uuid');
    });
  });

  describe('deploy tool handler', () => {
    // #238 — opt-in `wait` polls the deployment to a terminal status instead
    // of firing-and-forgetting. The no-wait path must stay byte-for-byte
    // identical to the pre-#238 behaviour.

    const callDeploy = async (
      srv: CoolifyMcpServer,
      args: Record<string, unknown>,
    ): Promise<unknown> => {
      const tool = (
        srv as unknown as {
          _registeredTools: Record<
            string,
            { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }
          >;
        }
      )._registeredTools['deploy'];
      return tool.handler(args, {});
    };

    const essentialDeployment = (
      overrides: Partial<Record<string, unknown>> = {},
    ): Record<string, unknown> => ({
      uuid: 'dep-uuid',
      deployment_uuid: 'dep-uuid',
      application_uuid: 'app-uuid',
      application_name: 'my-app',
      status: 'in_progress',
      commit: 'abc123',
      force_rebuild: false,
      is_webhook: false,
      is_api: true,
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
      ...overrides,
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('no-wait path is unchanged: triggers deploy and returns immediately', async () => {
      const spy = jest
        .spyOn(server['client'], 'deployByTagOrUuid')
        .mockResolvedValue({ deployments: [{ deployment_uuid: 'dep-uuid' }] });
      const pollSpy = jest.spyOn(server['client'], 'getDeployment');

      const result = (await callDeploy(server, { tag_or_uuid: 'my-tag', force: true })) as {
        content: Array<{ text: string }>;
      };

      expect(spy).toHaveBeenCalledWith('my-tag', true);
      expect(pollSpy).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toEqual({ deployments: [{ deployment_uuid: 'dep-uuid' }] });
      expect(parsed._actions).toEqual([
        { tool: 'list_deployments', args: {}, hint: 'Check deployment status' },
      ]);
    });

    it('wait: true polls until finished', async () => {
      jest.useFakeTimers();
      jest
        .spyOn(server['client'], 'deployByTagOrUuid')
        .mockResolvedValue({ deployments: [{ deployment_uuid: 'dep-uuid' }] });
      const getDeploymentSpy = jest
        .spyOn(server['client'], 'getDeployment')
        .mockResolvedValueOnce(essentialDeployment({ status: 'in_progress' }) as never)
        .mockResolvedValueOnce(essentialDeployment({ status: 'finished' }) as never);

      const resultPromise = callDeploy(server, { tag_or_uuid: 'my-tag', wait: true }) as Promise<{
        content: Array<{ text: string }>;
      }>;

      await jest.advanceTimersByTimeAsync(5000);
      const result = await resultPromise;

      expect(getDeploymentSpy).toHaveBeenCalledTimes(2);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data.status).toBe('finished');
      expect(parsed.data.deployment_uuid).toBe('dep-uuid');
      expect(parsed.data.logs_tail).toBeUndefined();
    });

    it('wait: true returns a bounded log tail on failure, never the raw payload', async () => {
      jest.useFakeTimers();
      jest
        .spyOn(server['client'], 'deployByTagOrUuid')
        .mockResolvedValue({ deployments: [{ deployment_uuid: 'dep-uuid' }] });
      jest
        .spyOn(server['client'], 'getDeployment')
        .mockImplementation(async (uuid: string, options?: { includeLogs?: boolean }) => {
          if (options?.includeLogs) {
            return {
              ...essentialDeployment({ status: 'failed' }),
              logs: JSON.stringify([{ output: 'build failed: OOM', timestamp: 't1' }]),
              // Fields that would only appear on the raw upstream object —
              // must never leak into the tool response.
              server: { ip: '10.0.0.1', private_key: 'super-secret' },
              application: { env_secret: 'shh' },
            } as never;
          }
          return essentialDeployment({ status: 'failed' }) as never;
        });

      const resultPromise = callDeploy(server, { tag_or_uuid: 'my-tag', wait: true }) as Promise<{
        content: Array<{ text: string }>;
      }>;

      const result = await resultPromise;
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.data.status).toBe('failed');
      expect(parsed.data.deployment_uuid).toBe('dep-uuid');
      expect(parsed.data.logs_tail).toContain('build failed: OOM');
      expect(result.content[0].text).not.toContain('private_key');
      expect(result.content[0].text).not.toContain('env_secret');
      expect(parsed.data).not.toHaveProperty('server');
      expect(parsed.data).not.toHaveProperty('application');
    });

    it('wait: true returns an explicit timeout with a next-action hint', async () => {
      jest.useFakeTimers();
      jest
        .spyOn(server['client'], 'deployByTagOrUuid')
        .mockResolvedValue({ deployments: [{ deployment_uuid: 'dep-uuid' }] });
      jest
        .spyOn(server['client'], 'getDeployment')
        .mockResolvedValue(essentialDeployment({ status: 'in_progress' }) as never);

      const resultPromise = callDeploy(server, {
        tag_or_uuid: 'my-tag',
        wait: true,
        timeout_seconds: 10,
      }) as Promise<{ content: Array<{ text: string }> }>;

      // Let the poll loop exceed the 10s timeout.
      await jest.advanceTimersByTimeAsync(15_000);
      const result = await resultPromise;
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.data.status).toBe('in_progress');
      expect(parsed.data.timed_out).toBe(true);
      expect(parsed.data.deployment_uuid).toBe('dep-uuid');
      expect(parsed.data.next_action).toEqual(expect.stringContaining('deployment'));
    });

    it('wait: true watches only the first deployment when a tag triggers several', async () => {
      jest.useFakeTimers();
      jest.spyOn(server['client'], 'deployByTagOrUuid').mockResolvedValue({
        deployments: [{ deployment_uuid: 'dep-1' }, { deployment_uuid: 'dep-2' }],
      });
      const getDeploymentSpy = jest.spyOn(server['client'], 'getDeployment').mockResolvedValue(
        essentialDeployment({
          status: 'finished',
          deployment_uuid: 'dep-1',
          uuid: 'dep-1',
        }) as never,
      );

      const resultPromise = callDeploy(server, { tag_or_uuid: 'my-tag', wait: true }) as Promise<{
        content: Array<{ text: string }>;
      }>;
      const result = await resultPromise;
      const parsed = JSON.parse(result.content[0].text);

      expect(getDeploymentSpy).toHaveBeenCalledWith('dep-1');
      expect(getDeploymentSpy).not.toHaveBeenCalledWith('dep-2');
      expect(parsed.data.deployment_uuid).toBe('dep-1');
      expect(parsed.data.additional_deployment_uuids).toEqual(['dep-2']);
    });
  });
});

describe('truncateLogs', () => {
  // Plain text log tests
  it('should return logs unchanged when within limits', () => {
    const logs = 'line1\nline2\nline3';
    const result = truncateLogs(logs, 200, 50000);
    expect(result.logs).toBe(logs);
    expect(result.total).toBe(3);
  });

  it('should truncate to last N lines', () => {
    const logs = 'line1\nline2\nline3\nline4\nline5';
    const result = truncateLogs(logs, 3, 50000);
    expect(result.logs).toBe('line3\nline4\nline5');
    expect(result.total).toBe(5);
    expect(result.showing_start).toBe(3);
    expect(result.showing_end).toBe(5);
  });

  it('should truncate by character limit when lines are huge', () => {
    const hugeLine = 'x'.repeat(100);
    const logs = `${hugeLine}\n${hugeLine}\n${hugeLine}`;
    const result = truncateLogs(logs, 200, 50);
    expect(result.logs.length).toBeLessThanOrEqual(50);
    expect(result.logs.startsWith('...[truncated]...')).toBe(true);
  });

  it('should not add truncation prefix when under char limit', () => {
    const logs = 'line1\nline2\nline3';
    const result = truncateLogs(logs, 200, 50000);
    expect(result.logs.startsWith('...[truncated]...')).toBe(false);
  });

  it('should handle empty logs', () => {
    const result = truncateLogs('', 200, 50000);
    expect(result.logs).toBe('');
  });

  it('should use default limits when not specified', () => {
    const logs = 'line1\nline2';
    const result = truncateLogs(logs);
    expect(result.logs).toBe(logs);
  });

  it('should respect custom line limit', () => {
    const lines = Array.from({ length: 300 }, (_, i) => `line${i + 1}`).join('\n');
    const result = truncateLogs(lines, 50, 50000);
    const resultLines = result.logs.split('\n');
    expect(resultLines.length).toBe(50);
    expect(resultLines[0]).toBe('line251');
    expect(resultLines[49]).toBe('line300');
  });

  it('should respect custom char limit', () => {
    const logs = 'x'.repeat(1000);
    const result = truncateLogs(logs, 200, 100);
    expect(result.logs.length).toBe(100);
  });

  // Pagination tests (plain text)
  it('should paginate plain text logs (page 2 = older entries)', () => {
    const logs = Array.from({ length: 30 }, (_, i) => `line${i + 1}`).join('\n');
    const page1 = truncateLogs(logs, 10, 50000, 1);
    const page2 = truncateLogs(logs, 10, 50000, 2);
    const page3 = truncateLogs(logs, 10, 50000, 3);
    expect(page1.logs).toContain('line30');
    expect(page1.logs).toContain('line21');
    expect(page1.logs).not.toContain('line20');
    expect(page2.logs).toContain('line20');
    expect(page2.logs).toContain('line11');
    expect(page2.logs).not.toContain('line10');
    expect(page3.logs).toContain('line10');
    expect(page3.logs).toContain('line1');
    expect(page1.showing_start).toBe(21);
    expect(page1.showing_end).toBe(30);
  });

  // JSON array format tests (Coolify deployment logs)
  it('should parse JSON array logs and return last N visible entries', () => {
    const entries = [
      { output: 'Building...', timestamp: '2026-01-01T00:00:01Z', hidden: false },
      { output: 'docker pull', timestamp: '2026-01-01T00:00:02Z', hidden: true },
      { output: 'Compiling...', timestamp: '2026-01-01T00:00:03Z', hidden: false },
      { output: 'Done.', timestamp: '2026-01-01T00:00:04Z', hidden: false },
    ];
    const result = truncateLogs(JSON.stringify(entries), 2, 50000);
    expect(result.logs).toContain('Compiling...');
    expect(result.logs).toContain('Done.');
    expect(result.logs).not.toContain('Building...');
    expect(result.logs).not.toContain('docker pull');
    expect(result.total).toBe(3); // 3 visible entries
  });

  it('should filter hidden entries from JSON logs', () => {
    const entries = [
      { output: 'visible1', timestamp: '2026-01-01T00:00:01Z', hidden: false },
      { output: 'hidden1', timestamp: '2026-01-01T00:00:02Z', hidden: true },
      { output: 'hidden2', timestamp: '2026-01-01T00:00:03Z', hidden: true },
      { output: 'visible2', timestamp: '2026-01-01T00:00:04Z', hidden: false },
    ];
    const result = truncateLogs(JSON.stringify(entries), 200, 50000);
    expect(result.logs).toContain('visible1');
    expect(result.logs).toContain('visible2');
    expect(result.logs).not.toContain('hidden1');
    expect(result.logs).not.toContain('hidden2');
  });

  it('should format JSON log entries with timestamp and output', () => {
    const entries = [
      { output: 'Starting deploy', timestamp: '2026-01-01T10:00:00Z', hidden: false },
    ];
    const result = truncateLogs(JSON.stringify(entries), 200, 50000);
    expect(result.logs).toBe('[2026-01-01T10:00:00Z] Starting deploy');
  });

  it('should paginate JSON logs (page 2 = older entries)', () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({
      output: `step ${i + 1}`,
      timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`,
      hidden: false,
    }));
    const page1 = truncateLogs(JSON.stringify(entries), 10, 50000, 1);
    const page2 = truncateLogs(JSON.stringify(entries), 10, 50000, 2);
    expect(page1.logs).toContain('step 30');
    expect(page1.logs).toContain('step 21');
    expect(page1.logs).not.toContain('step 20');
    expect(page2.logs).toContain('step 20');
    expect(page2.logs).toContain('step 11');
    expect(page2.logs).not.toContain('step 10');
    expect(page1.total).toBe(30);
    expect(page1.showing_start).toBe(21);
    expect(page1.showing_end).toBe(30);
    expect(page2.showing_start).toBe(11);
    expect(page2.showing_end).toBe(20);
  });

  it('should return metadata with total and showing range', () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      output: `step ${i}`,
      timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`,
      hidden: false,
    }));
    const result = truncateLogs(JSON.stringify(entries), 10, 50000);
    expect(result.total).toBe(50);
    expect(result.showing_start).toBe(41);
    expect(result.showing_end).toBe(50);
  });
});

// =============================================================================
// Action Generators Tests
// =============================================================================

describe('getApplicationActions', () => {
  it('should return view logs action for all apps', () => {
    const actions = getApplicationActions('app-uuid', 'stopped');
    expect(actions).toContainEqual({
      tool: 'application_logs',
      args: { uuid: 'app-uuid' },
      hint: 'View logs',
    });
  });

  it('should return restart/stop actions for running apps', () => {
    const actions = getApplicationActions('app-uuid', 'running');
    expect(actions).toContainEqual({
      tool: 'control',
      args: { resource: 'application', action: 'restart', uuid: 'app-uuid' },
      hint: 'Restart',
    });
    expect(actions).toContainEqual({
      tool: 'control',
      args: { resource: 'application', action: 'stop', uuid: 'app-uuid' },
      hint: 'Stop',
    });
  });

  it('should return start action for stopped apps', () => {
    const actions = getApplicationActions('app-uuid', 'stopped');
    expect(actions).toContainEqual({
      tool: 'control',
      args: { resource: 'application', action: 'start', uuid: 'app-uuid' },
      hint: 'Start',
    });
  });

  it('should handle running:healthy status', () => {
    const actions = getApplicationActions('app-uuid', 'running:healthy');
    expect(actions.some((a) => a.hint === 'Restart')).toBe(true);
    expect(actions.some((a) => a.hint === 'Stop')).toBe(true);
  });

  it('should handle undefined status', () => {
    const actions = getApplicationActions('app-uuid', undefined);
    expect(actions).toContainEqual({
      tool: 'control',
      args: { resource: 'application', action: 'start', uuid: 'app-uuid' },
      hint: 'Start',
    });
  });
});

describe('getDeploymentActions', () => {
  it('should return cancel action for in_progress deployments', () => {
    const actions = getDeploymentActions('dep-uuid', 'in_progress', 'app-uuid');
    expect(actions).toContainEqual({
      tool: 'deployment',
      args: { action: 'cancel', uuid: 'dep-uuid' },
      hint: 'Cancel',
    });
  });

  it('should return cancel action for queued deployments', () => {
    const actions = getDeploymentActions('dep-uuid', 'queued', 'app-uuid');
    expect(actions).toContainEqual({
      tool: 'deployment',
      args: { action: 'cancel', uuid: 'dep-uuid' },
      hint: 'Cancel',
    });
  });

  it('should return app actions when appUuid provided', () => {
    const actions = getDeploymentActions('dep-uuid', 'finished', 'app-uuid');
    expect(actions).toContainEqual({
      tool: 'get_application',
      args: { uuid: 'app-uuid' },
      hint: 'View app',
    });
    expect(actions).toContainEqual({
      tool: 'application_logs',
      args: { uuid: 'app-uuid' },
      hint: 'App logs',
    });
  });

  it('should not return cancel for finished deployments', () => {
    const actions = getDeploymentActions('dep-uuid', 'finished', 'app-uuid');
    expect(actions.some((a) => a.hint === 'Cancel')).toBe(false);
  });

  it('should return empty actions when no appUuid and not in_progress', () => {
    const actions = getDeploymentActions('dep-uuid', 'finished', undefined);
    expect(actions).toEqual([]);
  });
});

describe('summarizeDeploymentForRead', () => {
  it('should keep safe deployment essentials and omit nested sensitive metadata', () => {
    const raw = {
      id: 606,
      uuid: 'internal-row-606',
      deployment_uuid: 'deploy-uuid-123',
      application_uuid: 'app-uuid-123',
      application_name: 'osm-country-scraper',
      status: 'finished',
      commit: 'abc123',
      server_name: 'localhost',
      force_rebuild: false,
      is_webhook: false,
      is_api: true,
      created_at: '2026-06-18T06:23:45.000000Z',
      updated_at: '2026-06-18T06:24:54.000000Z',
      application: {
        uuid: 'app-uuid-123',
        name: 'osm-country-scraper',
        status: 'running:healthy',
        custom_labels: 'ZXZpbA==',
      },
      server: {
        name: 'localhost',
        settings: {
          sentinel_token: 'secret-sentinel-token',
        },
      },
    };

    const result = summarizeDeploymentForRead(raw);

    expect(result).toEqual({
      deployment_uuid: 'deploy-uuid-123',
      deployment_id: 606,
      application_uuid: 'app-uuid-123',
      application_name: 'osm-country-scraper',
      application_status: 'running:healthy',
      health_result: 'running:healthy',
      server_name: 'localhost',
      status: 'finished',
      commit_sha: 'abc123',
      force_rebuild: false,
      restart_only: undefined,
      is_webhook: false,
      is_api: true,
      created_at: '2026-06-18T06:23:45.000000Z',
      updated_at: '2026-06-18T06:24:54.000000Z',
      finished_at: null,
      logs: undefined,
      logs_meta: undefined,
      logs_redacted: undefined,
      secrets_redacted: true,
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('custom_labels');
    expect(serialized).not.toContain('sentinel_token');
    expect(serialized).not.toContain('secret-sentinel-token');
  });

  it('should preserve redacted logs metadata without leaking secret-bearing fields', () => {
    const raw = {
      deployment_uuid: 'deploy-uuid-123',
      application_name: 'osm-country-scraper',
      status: 'finished',
      commit: 'abc123',
      application: {
        uuid: 'app-uuid-123',
        status: 'running:healthy',
      },
      custom_labels: 'ZXZpbA==',
    };

    const result = summarizeDeploymentForRead(raw, {
      logs: 'Bearer ***REDACTED***',
      logs_meta: { total_entries: 20, showing: '1-20 of 20', chars: 21 },
    });

    expect(result.logs).toBe('Bearer ***REDACTED***');
    expect(result.logs_meta).toEqual({
      total_entries: 20,
      showing: '1-20 of 20',
      chars: 21,
    });
    expect(result.logs_redacted).toBe(true);
    expect(JSON.stringify(result)).not.toContain('custom_labels');
  });
});

describe('filterLogText', () => {
  it('filters logs, removes ANSI, applies context, and redacts secrets', () => {
    const result = filterLogText(
      '\u001b[31mINFO start\u001b[0m\nWARNING Authorization: Bearer secret-value-long\nERROR failed\nINFO done',
      {
        search: 'error',
        context_before: 1,
        max_chars: 200,
      },
    );
    expect(result.matched_lines).toBe(1);
    expect(result.logs).toContain('WARNING');
    expect(result.logs).toContain('ERROR failed');
    expect(result.logs).not.toContain('\u001b');
    expect(result.logs).not.toContain('secret-value');
  });
});

describe('getPagination', () => {
  it('should return undefined when count is less than perPage and page is 1', () => {
    const result = getPagination('list_apps', 1, 50, 30);
    expect(result).toBeUndefined();
  });

  it('should return next when count equals or exceeds perPage', () => {
    const result = getPagination('list_apps', 1, 50, 50);
    expect(result).toEqual({
      next: { tool: 'list_apps', args: { page: 2, per_page: 50 } },
    });
  });

  it('should return both prev and next for middle pages', () => {
    const result = getPagination('list_apps', 2, 50, 50);
    expect(result).toEqual({
      prev: { tool: 'list_apps', args: { page: 1, per_page: 50 } },
      next: { tool: 'list_apps', args: { page: 3, per_page: 50 } },
    });
  });

  it('should return prev when page > 1 and count < perPage', () => {
    const result = getPagination('list_apps', 3, 50, 20);
    expect(result).toEqual({
      prev: { tool: 'list_apps', args: { page: 2, per_page: 50 } },
    });
  });

  it('should use default page and perPage when undefined', () => {
    const result = getPagination('list_apps', undefined, undefined, 100);
    expect(result).toEqual({
      next: { tool: 'list_apps', args: { page: 2, per_page: 50 } },
    });
  });

  it('should return undefined when count is undefined', () => {
    const result = getPagination('list_apps', 1, 50, undefined);
    expect(result).toBeUndefined();
  });
});
