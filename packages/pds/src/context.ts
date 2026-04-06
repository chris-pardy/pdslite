import type { WriteFilter, BlobFilter } from "./write-filter/types.js";
import type {
  AccountFilter,
  AuthProvider,
} from "./plugin/types.js";
import type { AccountManager } from "./account/types.js";

export interface AppContext {
  port: number;
  writeFilters: WriteFilter[];
  blobFilters: BlobFilter[];
  accountFilters: AccountFilter[];
  authProvider: AuthProvider | null;
  accountManager: AccountManager;
}
