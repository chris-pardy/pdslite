import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { createContext } from "./context.js";
import type { AppContext } from "./context.js";
import { createServer } from "./server.js";

export { createServer } from "./server.js";
export { createContext } from "./context.js";
export type { AppContext } from "./context.js";
export type {
  WriteFilter,
  BlobFilter,
  WriteOperation,
  BlobUploadOperation,
  FilterResult,
} from "./write-filter/types.js";
export { XRPCError } from "./xrpc/types.js";

export interface ServerHandle {
  server: ServerType;
  close: () => Promise<void>;
}

export async function startServer(
  opts?: Partial<AppContext>,
): Promise<ServerHandle> {
  const ctx = createContext(opts);
  const app = createServer(ctx);

  return new Promise((resolve) => {
    const server = serve({ fetch: app.fetch, port: ctx.port }, () => {
      resolve({
        server,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}
