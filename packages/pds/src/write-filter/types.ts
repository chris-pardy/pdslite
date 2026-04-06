export interface WriteOperation {
  action: "create" | "update" | "delete";
  collection: string;
  rkey?: string;
  record?: unknown;
}

export interface BlobUploadOperation {
  mimeType: string;
  size: number;
}

export type FilterResult =
  | { decision: "allow"; record?: unknown }
  | { decision: "reject"; reason: string }
  | { decision: "pass"; record?: unknown };

export type WriteFilter = (op: WriteOperation) => Promise<FilterResult>;
export type BlobFilter = (op: BlobUploadOperation) => Promise<FilterResult>;
