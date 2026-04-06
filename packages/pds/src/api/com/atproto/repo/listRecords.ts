import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";

export function listRecords(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const repo = c.req.query("repo");
    const collection = c.req.query("collection");

    if (!repo || !collection) {
      throw new XRPCError(
        400,
        "InvalidRequest",
        "Missing required parameters: repo, collection",
      );
    }

    const limitParam = c.req.query("limit");
    const cursor = c.req.query("cursor");
    const reverse = c.req.query("reverse");

    let limit: number | undefined;
    if (limitParam) {
      limit = Number(limitParam);
      if (!Number.isFinite(limit) || limit < 1) {
        throw new XRPCError(
          400,
          "InvalidRequest",
          "limit must be a positive integer",
        );
      }
      limit = Math.min(limit, 100);
    }

    const result = await ctx.recordStore.listRecords(repo, collection, {
      limit,
      cursor: cursor ?? undefined,
      reverse: reverse === "true",
    });

    return c.json({
      records: result.records.map((r) => ({
        uri: r.uri,
        cid: r.cid,
        value: r.record,
      })),
      cursor: result.cursor,
    });
  };
}
