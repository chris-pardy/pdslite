import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";
import { runBlobFilters } from "../../../../write-filter/index.js";

export function uploadBlob(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const contentType =
      c.req.header("content-type") ?? "application/octet-stream";
    const buf = await c.req.arrayBuffer();
    const bytes = new Uint8Array(buf);

    const result = await runBlobFilters(ctx.blobFilters, {
      mimeType: contentType,
      size: bytes.byteLength,
    });
    if (result.decision === "reject") {
      throw new XRPCError(400, "InvalidRequest", result.reason);
    }

    const auth = c.get("auth") as { did: string } | null;
    const did = auth?.did ?? "unknown";

    const blobRef = await ctx.blobStore.putBlob(did, bytes, contentType);
    return c.json({ blob: blobRef });
  };
}
