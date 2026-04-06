import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";
import { runWriteFilters } from "../../../../write-filter/index.js";

export function deleteRecord(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const body = await c.req.json();
    const result = await runWriteFilters(ctx.writeFilters, {
      action: "delete",
      collection: body.collection,
      rkey: body.rkey,
    });
    if (result.decision === "reject") {
      throw new XRPCError(400, "InvalidRequest", result.reason);
    }
    return c.json({});
  };
}
