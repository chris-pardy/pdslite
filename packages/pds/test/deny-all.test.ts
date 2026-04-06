/**
 * deny-all.test.ts
 *
 * Baseline test suite: with zero write filters configured, every write
 * and blob operation must be rejected by the PDS. This is the default-deny
 * model described in the plan.
 *
 * These tests currently fail because no PDS server is running. Once the
 * server skeleton is implemented (Step 1), they should all pass.
 */

import { describe, it, expect } from "vitest";
import { xrpcPost, xrpcPostBytes, xrpcGet } from "./setup.js";

// Fake auth token -- the PDS should reject these writes at the filter
// level, not the auth level. When auth is implemented these will be
// replaced with real tokens from createSession.
const FAKE_AUTH = "fake-test-token";

// Test constants
const TEST_DID = "did:plc:testuser1234567890abcdef";
const TEST_COLLECTION = "app.bsky.feed.post";
const TEST_RKEY = "3jt5k2d5zbc2s";

describe("deny-all: record writes", () => {
  it("createRecord is rejected", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.createRecord",
      {
        repo: TEST_DID,
        collection: TEST_COLLECTION,
        record: {
          $type: TEST_COLLECTION,
          text: "hello world",
          createdAt: new Date().toISOString(),
        },
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("message");
  });

  it("createRecord is rejected for structural records (likes)", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.createRecord",
      {
        repo: TEST_DID,
        collection: "app.bsky.feed.like",
        record: {
          $type: "app.bsky.feed.like",
          subject: {
            uri: "at://did:plc:other/app.bsky.feed.post/abc123",
            cid: "bafyreih2fedmf2",
          },
          createdAt: new Date().toISOString(),
        },
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("createRecord is rejected for follows", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.createRecord",
      {
        repo: TEST_DID,
        collection: "app.bsky.graph.follow",
        record: {
          $type: "app.bsky.graph.follow",
          subject: "did:plc:followtarget",
          createdAt: new Date().toISOString(),
        },
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("createRecord is rejected for blocks", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.createRecord",
      {
        repo: TEST_DID,
        collection: "app.bsky.graph.block",
        record: {
          $type: "app.bsky.graph.block",
          subject: "did:plc:blocktarget",
          createdAt: new Date().toISOString(),
        },
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("createRecord is rejected for reposts", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.createRecord",
      {
        repo: TEST_DID,
        collection: "app.bsky.feed.repost",
        record: {
          $type: "app.bsky.feed.repost",
          subject: {
            uri: "at://did:plc:other/app.bsky.feed.post/abc123",
            cid: "bafyreih2fedmf2",
          },
          createdAt: new Date().toISOString(),
        },
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("createRecord is rejected for profiles", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.createRecord",
      {
        repo: TEST_DID,
        collection: "app.bsky.actor.profile",
        record: {
          $type: "app.bsky.actor.profile",
          displayName: "Test User",
          description: "A test profile",
        },
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("createRecord is rejected for custom app lexicons", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.createRecord",
      {
        repo: TEST_DID,
        collection: "com.example.myapp.customRecord",
        record: {
          $type: "com.example.myapp.customRecord",
          data: "test",
        },
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("putRecord is rejected", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.putRecord",
      {
        repo: TEST_DID,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: {
          $type: "app.bsky.actor.profile",
          displayName: "Updated Name",
        },
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("deleteRecord is rejected", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.deleteRecord",
      {
        repo: TEST_DID,
        collection: TEST_COLLECTION,
        rkey: TEST_RKEY,
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

describe("deny-all: applyWrites", () => {
  it("applyWrites with a single create is rejected", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.applyWrites",
      {
        repo: TEST_DID,
        writes: [
          {
            $type: "com.atproto.repo.applyWrites#create",
            collection: TEST_COLLECTION,
            value: {
              $type: TEST_COLLECTION,
              text: "batch write",
              createdAt: new Date().toISOString(),
            },
          },
        ],
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("applyWrites with a single update is rejected", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.applyWrites",
      {
        repo: TEST_DID,
        writes: [
          {
            $type: "com.atproto.repo.applyWrites#update",
            collection: TEST_COLLECTION,
            rkey: TEST_RKEY,
            value: {
              $type: TEST_COLLECTION,
              text: "updated",
              createdAt: new Date().toISOString(),
            },
          },
        ],
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("applyWrites with a single delete is rejected", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.applyWrites",
      {
        repo: TEST_DID,
        writes: [
          {
            $type: "com.atproto.repo.applyWrites#delete",
            collection: TEST_COLLECTION,
            rkey: TEST_RKEY,
          },
        ],
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("applyWrites with mixed operations is rejected", async () => {
    const res = await xrpcPost(
      "com.atproto.repo.applyWrites",
      {
        repo: TEST_DID,
        writes: [
          {
            $type: "com.atproto.repo.applyWrites#create",
            collection: "app.bsky.feed.like",
            value: {
              $type: "app.bsky.feed.like",
              subject: {
                uri: "at://did:plc:other/app.bsky.feed.post/abc",
                cid: "bafyreih2fedmf2",
              },
              createdAt: new Date().toISOString(),
            },
          },
          {
            $type: "com.atproto.repo.applyWrites#delete",
            collection: TEST_COLLECTION,
            rkey: TEST_RKEY,
          },
        ],
      },
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

describe("deny-all: blob operations", () => {
  it("uploadBlob is rejected for images", async () => {
    // 1x1 transparent PNG
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02,
      0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
      0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const res = await xrpcPostBytes(
      "com.atproto.repo.uploadBlob",
      png,
      "image/png",
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("uploadBlob is rejected for JPEG", async () => {
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
    ]);

    const res = await xrpcPostBytes(
      "com.atproto.repo.uploadBlob",
      jpeg,
      "image/jpeg",
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("uploadBlob is rejected for video", async () => {
    const video = new Uint8Array(1024);

    const res = await xrpcPostBytes(
      "com.atproto.repo.uploadBlob",
      video,
      "video/mp4",
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("uploadBlob is rejected for arbitrary binary", async () => {
    const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

    const res = await xrpcPostBytes(
      "com.atproto.repo.uploadBlob",
      data,
      "application/octet-stream",
      { auth: FAKE_AUTH },
    );

    expect(res.ok).toBe(false);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

describe("deny-all: record creation across collections is universally denied", () => {
  const collections = [
    "app.bsky.feed.post",
    "app.bsky.feed.like",
    "app.bsky.feed.repost",
    "app.bsky.graph.follow",
    "app.bsky.graph.block",
    "app.bsky.graph.list",
    "app.bsky.graph.listitem",
    "app.bsky.actor.profile",
    "app.bsky.feed.generator",
    "app.bsky.feed.threadgate",
    "com.example.custom.record",
  ];

  for (const collection of collections) {
    it(`createRecord is rejected for ${collection}`, async () => {
      const res = await xrpcPost(
        "com.atproto.repo.createRecord",
        {
          repo: TEST_DID,
          collection,
          record: {
            $type: collection,
            createdAt: new Date().toISOString(),
          },
        },
        { auth: FAKE_AUTH },
      );

      expect(res.ok).toBe(false);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  }
});
