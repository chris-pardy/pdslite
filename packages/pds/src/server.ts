import { Hono } from "hono";
import type { AppContext } from "./context.js";
import { xrpcErrorHandler } from "./xrpc/middleware.js";
import { XRPCError } from "./xrpc/types.js";
import { softAuthVerifier } from "./auth/verifier.js";
import { createRecord } from "./api/com/atproto/repo/createRecord.js";
import { putRecord } from "./api/com/atproto/repo/putRecord.js";
import { deleteRecord } from "./api/com/atproto/repo/deleteRecord.js";
import { applyWrites } from "./api/com/atproto/repo/applyWrites.js";
import { getRecord } from "./api/com/atproto/repo/getRecord.js";
import { listRecords } from "./api/com/atproto/repo/listRecords.js";
import { uploadBlob } from "./api/com/atproto/repo/uploadBlob.js";
import { getBlob } from "./api/com/atproto/sync/getBlob.js";
import { createAccountHandler } from "./api/com/atproto/server/createAccount.js";
import { createSessionHandler } from "./api/com/atproto/server/createSession.js";
import { describeServerHandler } from "./api/com/atproto/server/describeServer.js";

export function createServer(ctx: AppContext): Hono {
  const app = new Hono();

  app.onError(xrpcErrorHandler);

  // Soft auth — populates auth context if token is valid, null otherwise
  app.use(
    "/xrpc/*",
    softAuthVerifier(() => ctx.authProvider),
  );

  // Server endpoints
  app.post("/xrpc/com.atproto.server.createAccount", createAccountHandler(ctx));
  app.post("/xrpc/com.atproto.server.createSession", createSessionHandler(ctx));
  app.get(
    "/xrpc/com.atproto.server.describeServer",
    describeServerHandler(ctx),
  );

  // Record read endpoints
  app.get("/xrpc/com.atproto.repo.getRecord", getRecord(ctx));
  app.get("/xrpc/com.atproto.repo.listRecords", listRecords(ctx));

  // Record write endpoints
  app.post("/xrpc/com.atproto.repo.createRecord", createRecord(ctx));
  app.post("/xrpc/com.atproto.repo.putRecord", putRecord(ctx));
  app.post("/xrpc/com.atproto.repo.deleteRecord", deleteRecord(ctx));
  app.post("/xrpc/com.atproto.repo.applyWrites", applyWrites(ctx));
  app.post("/xrpc/com.atproto.repo.uploadBlob", uploadBlob(ctx));

  // Sync endpoints
  app.get("/xrpc/com.atproto.sync.getBlob", getBlob(ctx));

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
