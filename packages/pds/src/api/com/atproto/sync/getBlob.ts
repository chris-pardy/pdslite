import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";

export function getBlob(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const did = c.req.query("did");
    const cid = c.req.query("cid");

    if (!did || !cid) {
      throw new XRPCError(
        400,
        "InvalidRequest",
        "Missing required parameters: did, cid",
      );
    }

    const blob = await ctx.blobStore.getBlob(cid);
    if (!blob) {
      throw new XRPCError(404, "BlobNotFound", `Blob not found: ${cid}`);
    }

    c.header("Content-Type", blob.mimeType);
    c.header("Content-Length", String(blob.bytes.byteLength));
    return c.body(blob.bytes);
  };
}
