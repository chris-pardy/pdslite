/**
 * Generic default-deny filter pipeline.
 *
 * Rules:
 *   1. Any "reject" short-circuits immediately
 *   2. At least one "allow" required, otherwise rejected
 *   3. Filters may optionally transform data flowing through the pipeline
 */

export interface FilterDecision {
  decision: "allow" | "reject" | "pass";
  reason?: string;
}

export interface RunPipelineOpts<TOp, TResult extends FilterDecision> {
  filters: ((op: TOp) => Promise<TResult>)[];
  operation: TOp;
  /** Extract a transformed value from a filter result and apply it to the operation for the next filter. */
  applyTransform?: (op: TOp, result: TResult) => TOp;
}

export async function runFilterPipeline<
  TOp,
  TResult extends FilterDecision,
>(opts: RunPipelineOpts<TOp, TResult>): Promise<TResult> {
  const { filters, applyTransform } = opts;
  let op = opts.operation;
  let allowed = false;
  let lastAllowResult: TResult | null = null;

  for (const filter of filters) {
    const result = await filter(op);
    if (result.decision === "reject") {
      return result;
    }
    if (result.decision === "allow") {
      allowed = true;
      lastAllowResult = result;
    }
    if (applyTransform) {
      op = applyTransform(op, result);
    }
  }

  if (!allowed) {
    return {
      decision: "reject",
      reason: "No filter allowed this operation",
    } as TResult;
  }
  return lastAllowResult!;
}
