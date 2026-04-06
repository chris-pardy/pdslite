import { randomInt } from "node:crypto";

/** Generate a TID-like rkey (timestamp-based, sortable). */
export function generateRkey(): string {
  const now = BigInt(Date.now()) * 1000n + BigInt(randomInt(1000));
  return now.toString(36);
}
