import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";

export function getRecord(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const repo = c.req.query("repo");
    const collection = c.req.query("collection");
    const rkey = c.req.query("rkey");

    if (!repo || !collection || !rkey) {
      throw new XRPCError(
        400,
        "InvalidRequest",
        "Missing required parameters: repo, collection, rkey",
      );
    }

    const record = await ctx.recordStore.getRecord(repo, collection, rkey);
    if (!record) {
      throw new XRPCError(
        400,
        "RecordNotFound",
        `Record not found: ${collection}/${rkey}`,
      );
    }

    return c.json({
      uri: record.uri,
      cid: record.cid,
      value: record.record,
    });
  };
}
