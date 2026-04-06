import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";
import { runWriteFilters } from "../../../../write-filter/index.js";
import { verifyRepoOwnership } from "./util.js";

export function deleteRecord(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const body = await c.req.json();
    const did = body.repo;
    const collection = body.collection;
    const rkey = body.rkey;

    verifyRepoOwnership(c, did);

    const result = await runWriteFilters(ctx.writeFilters, {
      action: "delete",
      collection,
      rkey,
    });
    if (result.decision === "reject") {
      throw new XRPCError(400, "InvalidRequest", result.reason);
    }

    const uri = `at://${did}/${collection}/${rkey}`;
    await ctx.blobStore.removeReferences(uri);
    await ctx.recordStore.deleteRecord(did, collection, rkey);
    return c.json({});
  };
}
