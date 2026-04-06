import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";
import { XRPCError } from "../../../../xrpc/types.js";
import { runAccountFilters } from "../../../../account/filter.js";

export function createAccountHandler(ctx: AppContext): XRPCHandler {
  return async (c) => {
    const body = await c.req.json();
    const { handle, email, password, inviteCode, ...metadata } = body;

    const filterResult = await runAccountFilters(ctx.accountFilters, {
      action: "create",
      handle,
      email,
      inviteCode,
      metadata,
      ip: c.req.header("x-forwarded-for") ?? undefined,
    });

    if (filterResult.decision === "reject") {
      throw new XRPCError(400, "InvalidRequest", filterResult.reason);
    }

    if (!ctx.authProvider) {
      throw new XRPCError(
        501,
        "MethodNotImplemented",
        "No auth provider configured",
      );
    }

    try {
      const result = await ctx.authProvider.createAccount({
        handle,
        email,
        password,
        inviteCode,
      });
      return c.json({
        handle,
        did: result.did,
        accessJwt: result.accessJwt,
        refreshJwt: result.refreshJwt,
      });
    } catch (err) {
      if (err instanceof XRPCError) throw err;
      const message =
        err instanceof Error ? err.message : "Account creation failed";
      throw new XRPCError(400, "InvalidRequest", message);
    }
  };
}
