import { createHash } from "node:crypto";
import type { BlobStore, BlobRef } from "./types.js";

interface StoredBlob {
  bytes: Uint8Array;
  mimeType: string;
  refs: Set<string>; // recordUris referencing this blob
}

export class InMemoryBlobStore implements BlobStore {
  private blobs = new Map<string, StoredBlob>();
  // reverse index: recordUri → set of blobRefs
  private recordToBlobs = new Map<string, Set<string>>();

  private computeRef(bytes: Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  }

  async putBlob(
    _did: string,
    bytes: Uint8Array,
    mimeType: string,
  ): Promise<BlobRef> {
    const ref = this.computeRef(bytes);
    if (!this.blobs.has(ref)) {
      this.blobs.set(ref, { bytes, mimeType, refs: new Set() });
    }
    return { ref, mimeType, size: bytes.byteLength };
  }

  async getBlob(
    ref: string,
  ): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
    const stored = this.blobs.get(ref);
    if (!stored) return null;
    return { bytes: stored.bytes, mimeType: stored.mimeType };
  }

  async addReference(blobRef: string, recordUri: string): Promise<void> {
    const blob = this.blobs.get(blobRef);
    if (blob) {
      blob.refs.add(recordUri);
    }

    let refs = this.recordToBlobs.get(recordUri);
    if (!refs) {
      refs = new Set();
      this.recordToBlobs.set(recordUri, refs);
    }
    refs.add(blobRef);
  }

  async removeReferences(recordUri: string): Promise<void> {
    const blobRefs = this.recordToBlobs.get(recordUri);
    if (!blobRefs) return;

    for (const ref of blobRefs) {
      const blob = this.blobs.get(ref);
      if (blob) {
        blob.refs.delete(recordUri);
      }
    }
    this.recordToBlobs.delete(recordUri);
  }

  async gc(): Promise<number> {
    let count = 0;
    for (const [ref, blob] of this.blobs) {
      if (blob.refs.size === 0) {
        this.blobs.delete(ref);
        count++;
      }
    }
    return count;
  }
}
