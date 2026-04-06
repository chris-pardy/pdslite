import type { ErrorHandler } from "hono";
import { XRPCError } from "./types.js";

export const xrpcErrorHandler: ErrorHandler = (err, c) => {
  if (err instanceof XRPCError) {
    return c.json(err.toJSON(), err.status as any);
  }
  return c.json(
    { error: "InternalServerError", message: "Internal server error" },
    500,
  );
};
