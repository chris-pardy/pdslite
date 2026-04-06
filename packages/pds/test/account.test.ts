import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestHelpers } from "./setup.js";
import type { ServerHandle } from "../src/index.js";

const PORT = 13584;
const { post, get } = createTestHelpers(PORT);

let server: ServerHandle;

beforeAll(async () => {
  const { startServer } = await import("../src/index.js");
  const { pluginAuthPassword } = await import(
    "@pdslite/plugin-auth-password"
  );

  server = await startServer({
    port: PORT,
    plugins: [pluginAuthPassword({ scryptCost: 1024 })],
    accountFilters: [async () => ({ decision: "allow" as const })],
  });
});

afterAll(async () => {
  await server?.close();
});

describe("account creation with password auth", () => {
  it("createAccount succeeds with valid handle and password", async () => {
    const res = await post("com.atproto.server.createAccount", {
      handle: "alice.test",
      password: "secretpassword123",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("did");
    expect(body.did).toMatch(/^did:plc:/);
    expect(body).toHaveProperty("handle", "alice.test");
    expect(body).toHaveProperty("accessJwt");
    expect(body).toHaveProperty("refreshJwt");
  });

  it("createAccount rejects duplicate handle", async () => {
    const res = await post("com.atproto.server.createAccount", {
      handle: "alice.test",
      password: "anotherpassword",
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("createAccount rejects missing password", async () => {
    const res = await post("com.atproto.server.createAccount", {
      handle: "bob.test",
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

describe("session management", () => {
  it("createSession succeeds with correct password", async () => {
    const res = await post("com.atproto.server.createSession", {
      identifier: "alice.test",
      password: "secretpassword123",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("did");
    expect(body).toHaveProperty("handle", "alice.test");
    expect(body).toHaveProperty("accessJwt");
    expect(body).toHaveProperty("refreshJwt");
  });

  it("createSession fails with wrong password", async () => {
    const res = await post("com.atproto.server.createSession", {
      identifier: "alice.test",
      password: "wrongpassword",
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("createSession fails with unknown handle", async () => {
    const res = await post("com.atproto.server.createSession", {
      identifier: "nobody.test",
      password: "anything",
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

describe("token verification", () => {
  it("access token from createAccount works for authenticated requests", async () => {
    // Create a new account to get fresh tokens
    const createRes = await post("com.atproto.server.createAccount", {
      handle: "charlie.test",
      password: "testpassword",
    });
    const { accessJwt, did } = await createRes.json();

    // Use the token to attempt a write (should be denied by filter, not by auth)
    const writeRes = await post(
      "com.atproto.repo.createRecord",
      {
        repo: did,
        collection: "app.bsky.feed.post",
        record: { $type: "app.bsky.feed.post", text: "hello" },
      },
      { auth: accessJwt },
    );
    // Should be rejected by write filter (no write filters configured),
    // NOT by auth
    expect(writeRes.status).toBe(400);
    const body = await writeRes.json();
    expect(body.error).toBe("InvalidRequest");
    expect(body.message).toContain("No filter allowed");
  });
});

describe("describeServer", () => {
  it("returns server info", async () => {
    const res = await get("com.atproto.server.describeServer");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("availableUserDomains");
    expect(Array.isArray(body.availableUserDomains)).toBe(true);
  });
});

describe("account filters", () => {
  it("writes are still denied with no write filters", async () => {
    const res = await post("com.atproto.repo.createRecord", {
      repo: "did:plc:test",
      collection: "app.bsky.feed.post",
      record: { $type: "app.bsky.feed.post", text: "test" },
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
