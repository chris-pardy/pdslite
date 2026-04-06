import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";
import { runWriteFilters } from "../../../../write-filter/index.js";
import type { WriteOperation } from "../../../../write-filter/types.js";

const ACTION_MAP: Record<string, WriteOperation["action"]> = {
  "com.atproto.repo.applyWrites#create": "create",
  "com.atproto.repo.applyWrites#update": "update",
  "com.atproto.repo.applyWrites#delete": "delete",
};

export function applyWrites(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const body = await c.req.json();
    for (const write of body.writes) {
      const action = ACTION_MAP[write.$type];
      if (!action) {
        throw new XRPCError(400, "InvalidRequest", `Unknown write type: ${write.$type}`);
      }
      const result = await runWriteFilters(ctx.writeFilters, {
        action,
        collection: write.collection,
        rkey: write.rkey,
        record: write.value,
      });
      if (result.decision === "reject") {
        throw new XRPCError(400, "InvalidRequest", result.reason);
      }
    }
    return c.json({});
  };
}
