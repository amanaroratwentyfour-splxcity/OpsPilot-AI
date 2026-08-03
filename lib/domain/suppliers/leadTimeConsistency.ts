const MS_PER_DAY = 1000 * 60 * 60 * 24;

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_PER_DAY;
}

export interface LeadTimeRecord {
  orderDate: Date;
  actualDeliveryDate: Date;
}

/**
 * Lead Time Consistency: how reliably a supplier's actual delivery time
 * matches its OWN contracted lead time.
 *
 * Deliberately measured as deviation from `contractedLeadTimeDays`, not
 * from the sample's own mean actual lead time: a supplier who is
 * consistently late by a fixed amount on every single order would have
 * zero variance around its own average, which would incorrectly score as
 * "perfectly consistent" if variance were measured that way. Measuring
 * against the promised lead time instead correctly penalizes a supplier
 * for being reliably slow, not just unpredictably slow.
 *
 * Formula: relativeDeviation = RMS(actualLeadTimeDays - contractedLeadTimeDays) / contractedLeadTimeDays
 *          score = 100 - min(100, relativeDeviation x 100)
 *
 * This resolves OPERATIONS_ENGINE_SPEC.md §4.8's "derived from the
 * variance... relative to its contractedLeadTimeDays" into a concrete
 * formula: a relative (scale-free) root-mean-square deviation from the
 * contracted lead time, so a 2-day miss matters more for a 3-day-lead-time
 * supplier than a 21-day one.
 *
 * @param orders - the supplier's RECEIVED purchase orders (dates only)
 * @param contractedLeadTimeDays - Supplier.contractedLeadTimeDays
 * @returns a score in [0, 100], or `null` if there are no orders to assess
 *   or contractedLeadTimeDays is non-positive/non-finite
 */
export function computeLeadTimeConsistency(
  orders: LeadTimeRecord[],
  contractedLeadTimeDays: number,
): number | null {
  if (
    orders.length === 0 ||
    !Number.isFinite(contractedLeadTimeDays) ||
    contractedLeadTimeDays <= 0
  ) {
    return null;
  }

  const deviations = orders.map((order) => {
    const actualLeadTimeDays = daysBetween(order.orderDate, order.actualDeliveryDate);
    return actualLeadTimeDays - contractedLeadTimeDays;
  });

  const meanSquaredDeviation = mean(deviations.map((deviation) => deviation ** 2));
  const rmsDeviation = Math.sqrt(meanSquaredDeviation);
  const relativeDeviation = rmsDeviation / contractedLeadTimeDays;

  return Math.max(0, 100 - Math.min(100, relativeDeviation * 100));
}
