import type { Context } from "hono";

export class XRPCError extends Error {
  constructor(
    public status: number,
    public error: string,
    message: string,
  ) {
    super(message);
  }

  toJSON() {
    return { error: this.error, message: this.message };
  }
}

export type XRPCHandler = (c: Context) => Promise<Response> | Response;
