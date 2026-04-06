import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";

export function createSessionHandler(ctx: AppContext): XRPCHandler {
  return async (c) => {
    if (!ctx.authProvider) {
      throw new XRPCError(
        501,
        "MethodNotImplemented",
        "No auth provider configured",
      );
    }

    const body = await c.req.json();
    const { identifier, password } = body;

    try {
      const result = await ctx.authProvider.createSession({
        identifier,
        password,
      });
      return c.json({
        did: result.did,
        handle: result.handle,
        accessJwt: result.accessJwt,
        refreshJwt: result.refreshJwt,
      });
    } catch (err) {
      if (err instanceof XRPCError) throw err;
      throw new XRPCError(401, "AuthenticationRequired", "Invalid identifier or password");
    }
  };
}
