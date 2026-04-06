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
  let allowed = false;
  let record = op.record;

  for (const filter of filters) {
    const result = await filter({ ...op, record });
    if (result.decision === "reject") {
      return result;
    }
    if (result.decision === "allow") {
      allowed = true;
    }
    if ("record" in result && result.record !== undefined) {
      record = result.record;
    }
  }

  if (!allowed) {
    return { decision: "reject", reason: "No filter allowed this operation" };
  }
  return { decision: "allow", record };
}

export async function runBlobFilters(
  filters: BlobFilter[],
  op: BlobUploadOperation,
): Promise<FilterResult> {
  let allowed = false;

  for (const filter of filters) {
    const result = await filter(op);
    if (result.decision === "reject") {
      return result;
    }
    if (result.decision === "allow") {
      allowed = true;
    }
  }

  if (!allowed) {
    return { decision: "reject", reason: "No filter allowed this operation" };
  }
  return { decision: "allow" };
}
