import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryRecordStore } from "../src/record-store/memory.js";
import { InMemoryBlobStore } from "../src/blob-store/memory.js";

describe("InMemoryRecordStore", () => {
  let store: InMemoryRecordStore;

  beforeEach(() => {
    store = new InMemoryRecordStore();
  });

  const DID = "did:plc:test123";
  const COLLECTION = "app.bsky.feed.post";

  it("putRecord stores and returns a StoredRecord", async () => {
    const record = { text: "hello", $type: COLLECTION };
    const result = await store.putRecord(DID, COLLECTION, "abc", record);

    expect(result.uri).toBe(`at://${DID}/${COLLECTION}/abc`);
    expect(result.cid).toBeTruthy();
    expect(result.did).toBe(DID);
    expect(result.collection).toBe(COLLECTION);
    expect(result.rkey).toBe("abc");
    expect(result.record).toEqual(record);
    expect(result.createdAt).toBeTruthy();
    expect(result.updatedAt).toBeTruthy();
  });

  it("getRecord returns the stored record", async () => {
    const record = { text: "hello" };
    await store.putRecord(DID, COLLECTION, "abc", record);
    const result = await store.getRecord(DID, COLLECTION, "abc");

    expect(result).not.toBeNull();
    expect(result!.record).toEqual(record);
  });

  it("getRecord returns null for nonexistent record", async () => {
    const result = await store.getRecord(DID, COLLECTION, "nope");
    expect(result).toBeNull();
  });

  it("putRecord on same key updates record and changes cid", async () => {
    const r1 = await store.putRecord(DID, COLLECTION, "abc", { text: "v1" });
    const r2 = await store.putRecord(DID, COLLECTION, "abc", { text: "v2" });

    expect(r2.cid).not.toBe(r1.cid);
    expect(r2.record).toEqual({ text: "v2" });
    expect(r2.createdAt).toBe(r1.createdAt);
  });

  it("deleteRecord removes the record", async () => {
    await store.putRecord(DID, COLLECTION, "abc", { text: "hello" });
    await store.deleteRecord(DID, COLLECTION, "abc");
    const result = await store.getRecord(DID, COLLECTION, "abc");
    expect(result).toBeNull();
  });

  it("deleteRecord on nonexistent key is a no-op", async () => {
    await expect(
      store.deleteRecord(DID, COLLECTION, "nope"),
    ).resolves.toBeUndefined();
  });

  it("listRecords returns records in ascending rkey order", async () => {
    await store.putRecord(DID, COLLECTION, "ccc", { n: 3 });
    await store.putRecord(DID, COLLECTION, "aaa", { n: 1 });
    await store.putRecord(DID, COLLECTION, "bbb", { n: 2 });

    const result = await store.listRecords(DID, COLLECTION);
    expect(result.records.map((r) => r.rkey)).toEqual(["aaa", "bbb", "ccc"]);
  });

  it("listRecords with cursor paginates correctly", async () => {
    await store.putRecord(DID, COLLECTION, "a", { n: 1 });
    await store.putRecord(DID, COLLECTION, "b", { n: 2 });
    await store.putRecord(DID, COLLECTION, "c", { n: 3 });

    const page1 = await store.listRecords(DID, COLLECTION, { limit: 2 });
    expect(page1.records.map((r) => r.rkey)).toEqual(["a", "b"]);
    expect(page1.cursor).toBe("b");

    const page2 = await store.listRecords(DID, COLLECTION, {
      cursor: page1.cursor,
    });
    expect(page2.records.map((r) => r.rkey)).toEqual(["c"]);
  });

  it("listRecords with reverse returns descending order", async () => {
    await store.putRecord(DID, COLLECTION, "a", { n: 1 });
    await store.putRecord(DID, COLLECTION, "b", { n: 2 });
    await store.putRecord(DID, COLLECTION, "c", { n: 3 });

    const result = await store.listRecords(DID, COLLECTION, { reverse: true });
    expect(result.records.map((r) => r.rkey)).toEqual(["c", "b", "a"]);
  });

  it("listRecords for empty collection returns empty array", async () => {
    const result = await store.listRecords(DID, COLLECTION);
    expect(result.records).toEqual([]);
  });

  it("records are scoped by did", async () => {
    await store.putRecord("did:plc:alice", COLLECTION, "abc", { who: "alice" });
    await store.putRecord("did:plc:bob", COLLECTION, "abc", { who: "bob" });

    const alice = await store.getRecord("did:plc:alice", COLLECTION, "abc");
    const bob = await store.getRecord("did:plc:bob", COLLECTION, "abc");

    expect(alice!.record).toEqual({ who: "alice" });
    expect(bob!.record).toEqual({ who: "bob" });
  });
});

describe("InMemoryBlobStore", () => {
  let store: InMemoryBlobStore;

  beforeEach(() => {
    store = new InMemoryBlobStore();
  });

  const DID = "did:plc:test123";
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

  it("putBlob stores and returns a BlobRef", async () => {
    const ref = await store.putBlob(DID, PNG, "image/png");
    expect(ref.ref).toBeTruthy();
    expect(ref.mimeType).toBe("image/png");
    expect(ref.size).toBe(4);
  });

  it("getBlob retrieves stored bytes and mimeType", async () => {
    const ref = await store.putBlob(DID, PNG, "image/png");
    const result = await store.getBlob(ref.ref);

    expect(result).not.toBeNull();
    expect(result!.bytes).toEqual(PNG);
    expect(result!.mimeType).toBe("image/png");
  });

  it("getBlob returns null for unknown ref", async () => {
    const result = await store.getBlob("nonexistent");
    expect(result).toBeNull();
  });

  it("putBlob with same bytes returns same ref", async () => {
    const ref1 = await store.putBlob(DID, PNG, "image/png");
    const ref2 = await store.putBlob(DID, PNG, "image/png");
    expect(ref1.ref).toBe(ref2.ref);
  });

  it("addReference and removeReferences track correctly", async () => {
    const ref = await store.putBlob(DID, PNG, "image/png");
    await store.addReference(ref.ref, "at://did/col/r1");
    await store.addReference(ref.ref, "at://did/col/r2");

    // Blob still exists after removing one reference
    await store.removeReferences("at://did/col/r1");
    const gc1 = await store.gc();
    expect(gc1).toBe(0);
    expect(await store.getBlob(ref.ref)).not.toBeNull();

    // Blob is orphaned after removing second reference
    await store.removeReferences("at://did/col/r2");
    const gc2 = await store.gc();
    expect(gc2).toBe(1);
    expect(await store.getBlob(ref.ref)).toBeNull();
  });

  it("gc preserves referenced blobs", async () => {
    const ref = await store.putBlob(DID, PNG, "image/png");
    await store.addReference(ref.ref, "at://did/col/r1");

    const count = await store.gc();
    expect(count).toBe(0);
    expect(await store.getBlob(ref.ref)).not.toBeNull();
  });

  it("gc deletes unreferenced blobs", async () => {
    await store.putBlob(DID, PNG, "image/png");
    await store.putBlob(DID, JPEG, "image/jpeg");

    // Neither blob is referenced
    const count = await store.gc();
    expect(count).toBe(2);
  });

  it("gc after removeReferences cleans up orphaned blobs", async () => {
    const ref = await store.putBlob(DID, PNG, "image/png");
    const recordUri = "at://did/col/r1";

    await store.addReference(ref.ref, recordUri);
    expect(await store.gc()).toBe(0);

    await store.removeReferences(recordUri);
    expect(await store.gc()).toBe(1);
    expect(await store.getBlob(ref.ref)).toBeNull();
  });
});
