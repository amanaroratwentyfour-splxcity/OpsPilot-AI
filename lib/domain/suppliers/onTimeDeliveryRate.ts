export interface DeliveryRecord {
  expectedDeliveryDate: Date;
  actualDeliveryDate: Date;
}

/**
 * On-Time Delivery Rate: the percentage of a supplier's received orders
 * that arrived on or before their expected delivery date.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.8.
 *
 * @param orders - the supplier's RECEIVED purchase orders (dates only)
 * @returns a percentage in [0, 100], or `null` if there are no orders to assess
 */
export function computeOnTimeDeliveryRate(orders: DeliveryRecord[]): number | null {
  if (orders.length === 0) {
    return null;
  }

  const onTimeCount = orders.filter(
    (order) => order.actualDeliveryDate.getTime() <= order.expectedDeliveryDate.getTime(),
  ).length;

  return (onTimeCount / orders.length) * 100;
}
