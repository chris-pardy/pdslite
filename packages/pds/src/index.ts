import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import type { AppContext } from "./context.js";
import { createServer } from "./server.js";
import { loadPlugins } from "./plugin/loader.js";
import { InMemoryAccountManager } from "./account/manager.js";
import type { Plugin, AccountFilter } from "./plugin/types.js";
import type { AccountManager } from "./account/types.js";

export { createServer } from "./server.js";
export type { AppContext } from "./context.js";
export type {
  WriteFilter,
  BlobFilter,
  WriteOperation,
  BlobUploadOperation,
  FilterResult,
} from "./write-filter/types.js";
export type {
  Plugin,
  AuthProvider,
  PluginContext,
  AccountOperation,
  AccountFilterResult,
  AccountFilter,
  CreateAccountOpts,
} from "./plugin/types.js";
export type { Account, AccountManager } from "./account/types.js";
export { XRPCError } from "./xrpc/types.js";

export interface ServerOpts {
  port?: number;
  plugins?: Plugin[];
  accountFilters?: AccountFilter[];
  accountManager?: AccountManager;
}

export interface ServerHandle {
  server: ServerType;
  close: () => Promise<void>;
}

export async function startServer(opts?: ServerOpts): Promise<ServerHandle> {
  const port = opts?.port ?? 13583;
  const accountManager = opts?.accountManager ?? new InMemoryAccountManager();

  // Load plugins first so we have filters and auth before building the app
  const pluginRouter = new Hono();
  const loaded = await loadPlugins(
    opts?.plugins ?? [],
    { accountManager },
    pluginRouter,
  );

  const ctx: AppContext = {
    port,
    writeFilters: loaded.writeFilters,
    blobFilters: loaded.blobFilters,
    accountFilters: [...(opts?.accountFilters ?? []), ...loaded.accountFilters],
    authProvider: loaded.authProvider,
    accountManager,
  };

  const app = createServer(ctx);
  app.route("/", pluginRouter);

  return new Promise((resolve) => {
    const server = serve({ fetch: app.fetch, port }, () => {
      resolve({
        server,
        close: async () => {
          await loaded.destroyAll();
          await new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          });
        },
      });
    });
  });
}
