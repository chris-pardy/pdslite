import { runFilterPipeline } from "../filter-pipeline.js";
import type {
  WriteFilter,
  BlobFilter,
  WriteOperation,
  BlobUploadOperation,
  FilterResult,
} from "./types.js";

export async function runWriteFilters(
  filters: WriteFilter[],
  op: WriteOperation,
): Promise<FilterResult> {
  return runFilterPipeline<WriteOperation, FilterResult>({
    filters,
    operation: op,
    applyTransform: (current, result) => {
      if ("record" in result && result.record !== undefined) {
        return { ...current, record: result.record };
      }
      return current;
    },
  });
}

export async function runBlobFilters(
  filters: BlobFilter[],
  op: BlobUploadOperation,
): Promise<FilterResult> {
  return runFilterPipeline<BlobUploadOperation, FilterResult>({
    filters,
    operation: op,
  });
}
