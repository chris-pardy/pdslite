import type { AppContext } from "../../../../context.js";
import type { XRPCHandler } from "../../../../xrpc/types.js";

export function describeServerHandler(_ctx: AppContext): XRPCHandler {
  return async (c) => {
    return c.json({
      availableUserDomains: [],
      inviteCodeRequired: false,
      links: {},
    });
  };
}
