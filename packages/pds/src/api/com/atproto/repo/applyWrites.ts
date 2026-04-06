import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";
import { runWriteFilters } from "../../../../write-filter/index.js";
import type { WriteOperation } from "../../../../write-filter/types.js";
import { generateRkey } from "../../../../rkey.js";
import { verifyRepoOwnership } from "./util.js";

const ACTION_MAP: Record<string, WriteOperation["action"]> = {
  "com.atproto.repo.applyWrites#create": "create",
  "com.atproto.repo.applyWrites#update": "update",
  "com.atproto.repo.applyWrites#delete": "delete",
};

export function applyWrites(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const body = await c.req.json();
    const did = body.repo;
    verifyRepoOwnership(c, did);
    const results: unknown[] = [];

    for (const write of body.writes) {
      const action = ACTION_MAP[write.$type];
      if (!action) {
        throw new XRPCError(
          400,
          "InvalidRequest",
          `Unknown write type: ${write.$type}`,
        );
      }

      const rkey =
        write.rkey ?? (action === "create" ? generateRkey() : undefined);

      const filterResult = await runWriteFilters(ctx.writeFilters, {
        action,
        collection: write.collection,
        rkey,
        record: write.value,
      });
      if (filterResult.decision === "reject") {
        throw new XRPCError(400, "InvalidRequest", filterResult.reason);
      }

      const uri = `at://${did}/${write.collection}/${rkey}`;

      if (action === "create" || action === "update") {
        const finalRecord =
          "record" in filterResult && filterResult.record !== undefined
            ? filterResult.record
            : write.value;

        if (action === "update") {
          await ctx.blobStore.removeReferences(uri);
        }
        const stored = await ctx.recordStore.putRecord(
          did,
          write.collection,
          rkey!,
          finalRecord,
        );
        results.push({ uri: stored.uri, cid: stored.cid });
      } else {
        await ctx.blobStore.removeReferences(uri);
        await ctx.recordStore.deleteRecord(did, write.collection, rkey!);
        results.push({});
      }
    }
    return c.json({ results });
  };
}
