import type { MiddlewareHandler } from "hono";
import type { AuthProvider } from "../plugin/types.js";
import { XRPCError } from "../xrpc/types.js";

export interface AuthInfo {
  did: string;
}

/**
 * Soft auth: tries to verify the token, sets auth info if valid,
 * sets null if invalid. Does NOT throw on failure.
 * This keeps deny-all tests passing (fake tokens are ignored,
 * rejection comes from the filter pipeline).
 */
export function softAuthVerifier(
  getAuthProvider: () => AuthProvider | null,
): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header("authorization");
    if (header?.startsWith("Bearer ")) {
      const token = header.slice(7);
      const provider = getAuthProvider();
      if (provider) {
        try {
          const auth = await provider.verifyToken(token);
          c.set("auth", auth);
        } catch {
          c.set("auth", null);
        }
      } else {
        c.set("auth", null);
      }
    } else {
      c.set("auth", null);
    }
    await next();
  };
}

/**
 * Hard auth: requires a valid auth context. Use on endpoints
 * that strictly require authentication.
 */
export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.get("auth") as AuthInfo | null;
    if (!auth) {
      throw new XRPCError(
        401,
        "AuthenticationRequired",
        "Authentication required",
      );
    }
    await next();
  };
}
