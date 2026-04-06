import type { Hono } from "hono";
import type {
  Plugin,
  PluginContext,
  AuthProvider,
  AccountFilter,
} from "./types.js";
import type { WriteFilter, BlobFilter } from "../write-filter/types.js";

export interface LoadedPlugins {
  writeFilters: WriteFilter[];
  blobFilters: BlobFilter[];
  accountFilters: AccountFilter[];
  authProvider: AuthProvider | null;
  destroyAll(): Promise<void>;
}

export async function loadPlugins(
  plugins: Plugin[],
  ctx: PluginContext,
  app: Hono,
): Promise<LoadedPlugins> {
  const writeFilters: WriteFilter[] = [];
  const blobFilters: BlobFilter[] = [];
  const accountFilters: AccountFilter[] = [];
  let authProvider: AuthProvider | null = null;

  for (const plugin of plugins) {
    if (plugin.initialize) {
      await plugin.initialize(undefined, ctx);
    }
    if (plugin.filter) {
      writeFilters.push(plugin.filter.bind(plugin));
    }
    if (plugin.blobFilter) {
      blobFilters.push(plugin.blobFilter.bind(plugin));
    }
    if (plugin.accountFilter) {
      accountFilters.push(plugin.accountFilter.bind(plugin));
    }
    if (plugin.auth) {
      if (authProvider) {
        throw new Error(
          `Multiple auth providers: "${plugin.id}" conflicts with existing provider`,
        );
      }
      authProvider = plugin.auth;
    }
    if (plugin.routes) {
      plugin.routes(app);
    }
  }

  return {
    writeFilters,
    blobFilters,
    accountFilters,
    authProvider,
    async destroyAll() {
      for (const plugin of [...plugins].reverse()) {
        if (plugin.destroy) {
          await plugin.destroy();
        }
      }
    },
  };
}
