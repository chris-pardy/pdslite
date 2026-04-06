import type { Context } from "hono";
import type { AuthInfo } from "../../../../auth/verifier.js";
import { XRPCError } from "../../../../xrpc/types.js";

/**
 * Verify that the authenticated user owns the target repo.
 * Only enforced when auth is present (soft auth may set null).
 */
export function verifyRepoOwnership(c: Context, repo: string): void {
  const auth = c.get("auth") as AuthInfo | null;
  if (auth && auth.did !== repo) {
    throw new XRPCError(
      403,
      "Forbidden",
      "You do not have permission to modify this repo",
    );
  }
}
