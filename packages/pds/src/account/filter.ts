import { runFilterPipeline } from "../filter-pipeline.js";
import type {
  AccountFilter,
  AccountOperation,
  AccountFilterResult,
} from "../plugin/types.js";

export async function runAccountFilters(
  filters: AccountFilter[],
  op: AccountOperation,
): Promise<AccountFilterResult> {
  return runFilterPipeline<AccountOperation, AccountFilterResult>({
    filters,
    operation: op,
  });
}
