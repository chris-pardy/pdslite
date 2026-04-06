import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";
import { runWriteFilters } from "../../../../write-filter/index.js";
import { generateRkey } from "../../../../rkey.js";
import { verifyRepoOwnership } from "./util.js";

export function createRecord(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const body = await c.req.json();
    const did = body.repo;
    const collection = body.collection;
    const rkey = body.rkey ?? generateRkey();

    verifyRepoOwnership(c, did);

    const result = await runWriteFilters(ctx.writeFilters, {
      action: "create",
      collection,
      rkey,
      record: body.record,
    });
    if (result.decision === "reject") {
      throw new XRPCError(400, "InvalidRequest", result.reason);
    }

    const finalRecord =
      "record" in result && result.record !== undefined
        ? result.record
        : body.record;

    const existing = await ctx.recordStore.getRecord(did, collection, rkey);
    if (existing) {
      throw new XRPCError(400, "InvalidRequest", "Record already exists");
    }

    const stored = await ctx.recordStore.putRecord(
      did,
      collection,
      rkey,
      finalRecord,
    );
    return c.json({ uri: stored.uri, cid: stored.cid });
  };
}
