import type { WriteFilter, BlobFilter } from "./write-filter/types.js";

export interface AppContext {
  port: number;
  writeFilters: WriteFilter[];
  blobFilters: BlobFilter[];
}

export function createContext(opts?: Partial<AppContext>): AppContext {
  return {
    port: opts?.port ?? 13583,
    writeFilters: opts?.writeFilters ?? [],
    blobFilters: opts?.blobFilters ?? [],
  };
}
