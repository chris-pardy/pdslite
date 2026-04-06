export interface StoredRecord {
  uri: string;
  cid: string;
  did: string;
  collection: string;
  rkey: string;
  record: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ListRecordsOpts {
  limit?: number;
  cursor?: string;
  reverse?: boolean;
}

export interface ListRecordsResult {
  records: StoredRecord[];
  cursor?: string;
}

export interface RecordStore {
  getRecord(
    did: string,
    collection: string,
    rkey: string,
  ): Promise<StoredRecord | null>;
  listRecords(
    did: string,
    collection: string,
    opts?: ListRecordsOpts,
  ): Promise<ListRecordsResult>;
  putRecord(
    did: string,
    collection: string,
    rkey: string,
    record: unknown,
  ): Promise<StoredRecord>;
  deleteRecord(did: string, collection: string, rkey: string): Promise<void>;
}
