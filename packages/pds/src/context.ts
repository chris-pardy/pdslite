import type { WriteFilter, BlobFilter } from "./write-filter/types.js";
import type {
  AccountFilter,
  AuthProvider,
} from "./plugin/types.js";
import type { AccountManager } from "./account/types.js";
import type { RecordStore } from "./record-store/types.js";
import type { BlobStore } from "./blob-store/types.js";

export interface AppContext {
  port: number;
  writeFilters: WriteFilter[];
  blobFilters: BlobFilter[];
  accountFilters: AccountFilter[];
  authProvider: AuthProvider | null;
  accountManager: AccountManager;
  recordStore: RecordStore;
  blobStore: BlobStore;
}
