import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestHelpers } from "./setup.js";
import type { ServerHandle } from "../src/index.js";

const PORT = 13585;
const { post, get } = createTestHelpers(PORT);

let server: ServerHandle;
let accessJwt: string;
let testDid: string;

beforeAll(async () => {
  const { startServer } = await import("../src/index.js");
  const { pluginAllowAll } = await import("@pdslite/plugin-allow-all");
  const { pluginAuthPassword } = await import(
    "@pdslite/plugin-auth-password"
  );

  server = await startServer({
    port: PORT,
    plugins: [pluginAllowAll(), pluginAuthPassword({ scryptCost: 1024 })],
  });

  // Create a test account
  const res = await post("com.atproto.server.createAccount", {
    handle: "testuser.test",
    password: "testpassword",
  });
  const body = await res.json();
  accessJwt = body.accessJwt;
  testDid = body.did;
});

afterAll(async () => {
  await server?.close();
});

describe("createRecord", () => {
  it("succeeds and returns uri and cid", async () => {
    const res = await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        record: { $type: "app.bsky.feed.post", text: "hello world" },
      },
      { auth: accessJwt },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uri).toMatch(/^at:\/\//);
    expect(body.cid).toBeTruthy();
  });

  it("uri follows at:// format with did, collection, and rkey", async () => {
    const res = await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.like",
        rkey: "mylike",
        record: { $type: "app.bsky.feed.like", subject: { uri: "at://x", cid: "abc" } },
      },
      { auth: accessJwt },
    );
    const body = await res.json();
    expect(body.uri).toBe(`at://${testDid}/app.bsky.feed.like/mylike`);
  });

  it("auto-generates rkey when not provided", async () => {
    const res = await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        record: { $type: "app.bsky.feed.post", text: "auto rkey" },
      },
      { auth: accessJwt },
    );
    const body = await res.json();
    // URI should have a generated rkey segment
    const parts = body.uri.split("/");
    expect(parts.length).toBe(5);
    expect(parts[4]).toBeTruthy();
  });

  it("rejects duplicate rkey", async () => {
    await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.graph.follow",
        rkey: "dup",
        record: { $type: "app.bsky.graph.follow", subject: "did:plc:other" },
      },
      { auth: accessJwt },
    );
    const res = await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.graph.follow",
        rkey: "dup",
        record: { $type: "app.bsky.graph.follow", subject: "did:plc:another" },
      },
      { auth: accessJwt },
    );
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body.error).toBe("InvalidRequest");
  });
});

describe("putRecord", () => {
  it("creates a new record", async () => {
    const res = await post(
      "com.atproto.repo.putRecord",
      {
        repo: testDid,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: { $type: "app.bsky.actor.profile", displayName: "Test" },
      },
      { auth: accessJwt },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uri).toBe(`at://${testDid}/app.bsky.actor.profile/self`);
  });

  it("updates an existing record and changes cid", async () => {
    const r1 = await post(
      "com.atproto.repo.putRecord",
      {
        repo: testDid,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: { $type: "app.bsky.actor.profile", displayName: "Version 1" },
      },
      { auth: accessJwt },
    );
    const r2 = await post(
      "com.atproto.repo.putRecord",
      {
        repo: testDid,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: { $type: "app.bsky.actor.profile", displayName: "Version 2" },
      },
      { auth: accessJwt },
    );
    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.uri).toBe(b2.uri);
    expect(b1.cid).not.toBe(b2.cid);
  });
});

describe("deleteRecord", () => {
  it("succeeds for existing record", async () => {
    await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        rkey: "todelete",
        record: { $type: "app.bsky.feed.post", text: "delete me" },
      },
      { auth: accessJwt },
    );
    const res = await post(
      "com.atproto.repo.deleteRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        rkey: "todelete",
      },
      { auth: accessJwt },
    );
    expect(res.status).toBe(200);
  });

  it("succeeds for nonexistent record", async () => {
    const res = await post(
      "com.atproto.repo.deleteRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        rkey: "doesnotexist",
      },
      { auth: accessJwt },
    );
    expect(res.status).toBe(200);
  });
});

describe("applyWrites", () => {
  it("batch create returns results array", async () => {
    const res = await post(
      "com.atproto.repo.applyWrites",
      {
        repo: testDid,
        writes: [
          {
            $type: "com.atproto.repo.applyWrites#create",
            collection: "app.bsky.feed.post",
            value: { $type: "app.bsky.feed.post", text: "batch 1" },
          },
          {
            $type: "com.atproto.repo.applyWrites#create",
            collection: "app.bsky.feed.post",
            value: { $type: "app.bsky.feed.post", text: "batch 2" },
          },
        ],
      },
      { auth: accessJwt },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(body.results[0]).toHaveProperty("uri");
    expect(body.results[1]).toHaveProperty("uri");
  });

  it("batch with mixed create and delete works", async () => {
    // Create a record to delete
    const createRes = await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        rkey: "batch-del",
        record: { $type: "app.bsky.feed.post", text: "to delete in batch" },
      },
      { auth: accessJwt },
    );
    expect(createRes.status).toBe(200);

    const res = await post(
      "com.atproto.repo.applyWrites",
      {
        repo: testDid,
        writes: [
          {
            $type: "com.atproto.repo.applyWrites#create",
            collection: "app.bsky.feed.post",
            value: { $type: "app.bsky.feed.post", text: "new in batch" },
          },
          {
            $type: "com.atproto.repo.applyWrites#delete",
            collection: "app.bsky.feed.post",
            rkey: "batch-del",
          },
        ],
      },
      { auth: accessJwt },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
  });
});

describe("uploadBlob", () => {
  it("succeeds and returns blob ref", async () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const res = await fetch(
      `http://localhost:${PORT}/xrpc/com.atproto.repo.uploadBlob`,
      {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
          Authorization: `Bearer ${accessJwt}`,
        },
        body: png,
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.blob).toHaveProperty("ref");
    expect(body.blob).toHaveProperty("mimeType", "image/png");
    expect(body.blob).toHaveProperty("size", 8);
  });
});
