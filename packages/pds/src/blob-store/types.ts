export interface BlobRef {
  ref: string;
  mimeType: string;
  size: number;
}

export interface BlobStore {
  putBlob(
    did: string,
    bytes: Uint8Array,
    mimeType: string,
  ): Promise<BlobRef>;
  getBlob(
    ref: string,
  ): Promise<{ bytes: Uint8Array; mimeType: string } | null>;

  /** Track that a record references a blob. */
  addReference(blobRef: string, recordUri: string): Promise<void>;
  /** Remove all blob references from a given record. */
  removeReferences(recordUri: string): Promise<void>;
  /** Delete blobs with zero references. Returns count deleted. */
  gc(): Promise<number>;
}
