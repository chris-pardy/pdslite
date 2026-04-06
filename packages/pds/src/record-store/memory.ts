import { createHash } from "node:crypto";
import type {
  RecordStore,
  StoredRecord,
  ListRecordsOpts,
  ListRecordsResult,
} from "./types.js";

export class InMemoryRecordStore implements RecordStore {
  // did → collection → rkey → StoredRecord
  private store = new Map<string, Map<string, Map<string, StoredRecord>>>();

  private computeCid(record: unknown): string {
    return createHash("sha256")
      .update(JSON.stringify(record))
      .digest("hex")
      .slice(0, 32);
  }

  private getCollection(
    did: string,
    collection: string,
  ): Map<string, StoredRecord> | undefined {
    return this.store.get(did)?.get(collection);
  }

  private ensureCollection(
    did: string,
    collection: string,
  ): Map<string, StoredRecord> {
    let didMap = this.store.get(did);
    if (!didMap) {
      didMap = new Map();
      this.store.set(did, didMap);
    }
    let collMap = didMap.get(collection);
    if (!collMap) {
      collMap = new Map();
      didMap.set(collection, collMap);
    }
    return collMap;
  }

  async getRecord(
    did: string,
    collection: string,
    rkey: string,
  ): Promise<StoredRecord | null> {
    return this.getCollection(did, collection)?.get(rkey) ?? null;
  }

  async listRecords(
    did: string,
    collection: string,
    opts?: ListRecordsOpts,
  ): Promise<ListRecordsResult> {
    const collMap = this.getCollection(did, collection);
    if (!collMap) return { records: [] };

    const limit = Math.min(opts?.limit ?? 50, 100);
    let keys = [...collMap.keys()].sort();
    if (opts?.reverse) keys.reverse();

    if (opts?.cursor) {
      const idx = keys.indexOf(opts.cursor);
      if (idx >= 0) {
        keys = keys.slice(idx + 1);
      }
    }

    const sliced = keys.slice(0, limit);
    const records = sliced.map((k) => collMap.get(k)!);
    const cursor =
      sliced.length === limit ? sliced[sliced.length - 1] : undefined;

    return { records, cursor };
  }

  async putRecord(
    did: string,
    collection: string,
    rkey: string,
    record: unknown,
  ): Promise<StoredRecord> {
    const collMap = this.ensureCollection(did, collection);
    const now = new Date().toISOString();
    const existing = collMap.get(rkey);

    const stored: StoredRecord = {
      uri: `at://${did}/${collection}/${rkey}`,
      cid: this.computeCid(record),
      did,
      collection,
      rkey,
      record,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    collMap.set(rkey, stored);
    return stored;
  }

  async deleteRecord(
    did: string,
    collection: string,
    rkey: string,
  ): Promise<void> {
    this.getCollection(did, collection)?.delete(rkey);
  }
}
