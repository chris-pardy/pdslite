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
  const { pluginAuthPassword } = await import("@pdslite/plugin-auth-password");

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
        record: {
          $type: "app.bsky.feed.like",
          subject: { uri: "at://x", cid: "abc" },
        },
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

describe("getRecord", () => {
  it("returns a record that exists", async () => {
    const createRes = await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        rkey: "getme",
        record: { $type: "app.bsky.feed.post", text: "retrievable" },
      },
      { auth: accessJwt },
    );
    expect(createRes.status).toBe(200);

    const res = await get("com.atproto.repo.getRecord", {
      repo: testDid,
      collection: "app.bsky.feed.post",
      rkey: "getme",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uri).toBe(`at://${testDid}/app.bsky.feed.post/getme`);
    expect(body.cid).toBeTruthy();
    expect(body.value).toEqual({
      $type: "app.bsky.feed.post",
      text: "retrievable",
    });
  });

  it("returns error for nonexistent record", async () => {
    const res = await get("com.atproto.repo.getRecord", {
      repo: testDid,
      collection: "app.bsky.feed.post",
      rkey: "doesnotexist",
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body.error).toBe("RecordNotFound");
  });

  it("returns error when missing required params", async () => {
    const res = await get("com.atproto.repo.getRecord", {
      repo: testDid,
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body.error).toBe("InvalidRequest");
  });

  it("reflects updates from putRecord", async () => {
    await post(
      "com.atproto.repo.putRecord",
      {
        repo: testDid,
        collection: "app.bsky.actor.profile",
        rkey: "getcheck",
        record: { $type: "app.bsky.actor.profile", displayName: "Before" },
      },
      { auth: accessJwt },
    );
    await post(
      "com.atproto.repo.putRecord",
      {
        repo: testDid,
        collection: "app.bsky.actor.profile",
        rkey: "getcheck",
        record: { $type: "app.bsky.actor.profile", displayName: "After" },
      },
      { auth: accessJwt },
    );

    const res = await get("com.atproto.repo.getRecord", {
      repo: testDid,
      collection: "app.bsky.actor.profile",
      rkey: "getcheck",
    });
    const body = await res.json();
    expect(body.value.displayName).toBe("After");
  });

  it("returns error after record is deleted", async () => {
    await post(
      "com.atproto.repo.createRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        rkey: "delcheck",
        record: { $type: "app.bsky.feed.post", text: "will be deleted" },
      },
      { auth: accessJwt },
    );
    await post(
      "com.atproto.repo.deleteRecord",
      {
        repo: testDid,
        collection: "app.bsky.feed.post",
        rkey: "delcheck",
      },
      { auth: accessJwt },
    );

    const res = await get("com.atproto.repo.getRecord", {
      repo: testDid,
      collection: "app.bsky.feed.post",
      rkey: "delcheck",
    });
    expect(res.ok).toBe(false);
    expect((await res.json()).error).toBe("RecordNotFound");
  });
});

describe("listRecords", () => {
  it("lists records in a collection", async () => {
    // Create records in a fresh collection
    for (let i = 0; i < 3; i++) {
      await post(
        "com.atproto.repo.createRecord",
        {
          repo: testDid,
          collection: "app.bsky.feed.repost",
          rkey: `list-${i}`,
          record: {
            $type: "app.bsky.feed.repost",
            subject: { uri: `at://x/post/${i}`, cid: `cid${i}` },
          },
        },
        { auth: accessJwt },
      );
    }

    const res = await get("com.atproto.repo.listRecords", {
      repo: testDid,
      collection: "app.bsky.feed.repost",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records.length).toBeGreaterThanOrEqual(3);
    expect(body.records[0]).toHaveProperty("uri");
    expect(body.records[0]).toHaveProperty("cid");
    expect(body.records[0]).toHaveProperty("value");
  });

  it("returns empty array for collection with no records", async () => {
    const res = await get("com.atproto.repo.listRecords", {
      repo: testDid,
      collection: "com.example.empty.collection",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records).toEqual([]);
  });

  it("respects limit parameter", async () => {
    const res = await get("com.atproto.repo.listRecords", {
      repo: testDid,
      collection: "app.bsky.feed.repost",
      limit: "2",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records.length).toBe(2);
    expect(body.cursor).toBeTruthy();
  });

  it("supports cursor-based pagination", async () => {
    const page1 = await get("com.atproto.repo.listRecords", {
      repo: testDid,
      collection: "app.bsky.feed.repost",
      limit: "2",
    });
    const body1 = await page1.json();
    expect(body1.cursor).toBeTruthy();

    const page2 = await get("com.atproto.repo.listRecords", {
      repo: testDid,
      collection: "app.bsky.feed.repost",
      cursor: body1.cursor,
      limit: "2",
    });
    const body2 = await page2.json();
    // Page 2 should not overlap with page 1
    const uris1 = body1.records.map((r: { uri: string }) => r.uri);
    const uris2 = body2.records.map((r: { uri: string }) => r.uri);
    for (const uri of uris2) {
      expect(uris1).not.toContain(uri);
    }
  });

  it("returns error when missing required params", async () => {
    const res = await get("com.atproto.repo.listRecords", {
      repo: testDid,
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body.error).toBe("InvalidRequest");
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

describe("getBlob", () => {
  it("retrieves an uploaded blob by cid", async () => {
    const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const uploadRes = await fetch(
      `http://localhost:${PORT}/xrpc/com.atproto.repo.uploadBlob`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          Authorization: `Bearer ${accessJwt}`,
        },
        body: data,
      },
    );
    expect(uploadRes.status).toBe(200);
    const { blob } = await uploadRes.json();

    const res = await get("com.atproto.sync.getBlob", {
      did: testDid,
      cid: blob.ref,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes).toEqual(data);
  });

  it("returns error for nonexistent blob", async () => {
    const res = await get("com.atproto.sync.getBlob", {
      did: testDid,
      cid: "nonexistent",
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body.error).toBe("BlobNotFound");
  });

  it("returns error when missing required params", async () => {
    const res = await get("com.atproto.sync.getBlob", {
      did: testDid,
    });
    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body.error).toBe("InvalidRequest");
  });
});
