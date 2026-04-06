import type { ServerHandle } from "../src/index.js";

let handle: ServerHandle;

export async function setup() {
  const { startServer } = await import("../src/index.js");
  handle = await startServer({ port: 13583 });
}

export async function teardown() {
  await handle?.close();
}
