import { Hono } from "hono";
import type { AppContext } from "./context.js";
import { xrpcErrorHandler } from "./xrpc/middleware.js";
import { XRPCError } from "./xrpc/types.js";
import { createRecord } from "./api/com/atproto/repo/createRecord.js";
import { putRecord } from "./api/com/atproto/repo/putRecord.js";
import { deleteRecord } from "./api/com/atproto/repo/deleteRecord.js";
import { applyWrites } from "./api/com/atproto/repo/applyWrites.js";
import { uploadBlob } from "./api/com/atproto/repo/uploadBlob.js";

export function createServer(ctx: AppContext): Hono {
  const app = new Hono();

  app.onError(xrpcErrorHandler);

  // Record write endpoints
  app.post("/xrpc/com.atproto.repo.createRecord", createRecord(ctx));
  app.post("/xrpc/com.atproto.repo.putRecord", putRecord(ctx));
  app.post("/xrpc/com.atproto.repo.deleteRecord", deleteRecord(ctx));
  app.post("/xrpc/com.atproto.repo.applyWrites", applyWrites(ctx));
  app.post("/xrpc/com.atproto.repo.uploadBlob", uploadBlob(ctx));

  // Catch-all for unimplemented XRPC methods
  app.all("/xrpc/:nsid", (c) => {
    throw new XRPCError(
      501,
      "MethodNotImplemented",
      `Method not implemented: ${c.req.param("nsid")}`,
    );
  });

  return app;
}
