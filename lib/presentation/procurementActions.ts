import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

export class ProcurementActionError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface CreatePurchaseOrderInput {
  productId: string;
  supplierId: string;
  warehouseId: string;
  quantity: number;
}

/**
 * Creates a DRAFT purchase order with a single line item — the write
 * behind the Procurement page's "Create PO" action on an EOQ suggestion
 * (components/procurement/create-po-dialog.tsx). No OM/domain logic here:
 * the suggested quantity was already computed upstream by computeEOQ
 * (lib/domain/procurement/eoq.ts); this just persists it. unitCost is
 * snapshotted from the product's current cost at creation time, same as
 * every other PurchaseOrderItem in the schema.
 */
export async function createPurchaseOrder(input: CreatePurchaseOrderInput, db: Db = prisma) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new ProcurementActionError("quantity must be a positive number", 400);
  }

  const product = await db.product.findUnique({
    where: { id: input.productId },
    select: { unitCost: true },
  });
  if (!product) {
    throw new ProcurementActionError("Product not found", 404);
  }

  try {
    return await db.purchaseOrder.create({
      data: {
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        status: "DRAFT",
        items: {
          create: [{ productId: input.productId, quantity: input.quantity, unitCost: product.unitCost }],
        },
      },
      select: { id: true, status: true, orderDate: true },
    });
  } catch {
    throw new ProcurementActionError("Supplier or warehouse not found", 404);
  }
}
