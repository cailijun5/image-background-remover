import { ensurePaymentSchema, queryD1 } from "./d1";
import { catalogCreditPacks, catalogPlans } from "./payment-catalog";
import { trySyncUserCreditsToPrimaryTable, trySyncUserPlanToPrimaryTable } from "./user-sync";
import type { PlanId } from "./types";

interface PaymentOrderRow {
  order_id: string;
  user_id: string;
  item_type: "plan" | "credit_pack";
  item_id: string;
  amount_usd: number;
  currency: string;
  status: string;
  payer_id: string | null;
  capture_payload: string | null;
  created_at: number;
  updated_at: number;
}

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function makeLedgerId(orderId: string) {
  return `credit_${orderId}`;
}

export async function recordPendingOrder(input: {
  orderId: string;
  userId: string;
  itemType: "plan" | "credit_pack";
  itemId: string;
  amountUsd: number;
}) {
  await ensurePaymentSchema();
  const now = nowTs();

  await queryD1(
    `INSERT OR REPLACE INTO payment_orders (
      order_id, user_id, item_type, item_id, amount_usd, currency, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'USD', 'CREATED', ?, ?)`,
    [input.orderId, input.userId, input.itemType, input.itemId, input.amountUsd, now, now],
  );
}

export async function getPaymentOrder(orderId: string) {
  await ensurePaymentSchema();
  const rows = await queryD1<PaymentOrderRow>(
    `SELECT * FROM payment_orders WHERE order_id = ? LIMIT 1`,
    [orderId],
  );
  return rows[0] || null;
}

export async function applySuccessfulPayment(input: {
  orderId: string;
  userId: string;
  payerId?: string | null;
  capturePayload: unknown;
  accessToken?: string | null;
}) {
  await ensurePaymentSchema();
  const order = await getPaymentOrder(input.orderId);
  if (!order) {
    throw new Error("未找到待处理订单，请重新创建支付订单");
  }

  if (order.user_id !== input.userId) {
    throw new Error("订单所属用户不匹配");
  }

  if (order.status === "COMPLETED") {
    return {
      alreadyApplied: true,
      order,
    };
  }

  const now = nowTs();
  const payloadText = JSON.stringify(input.capturePayload);

  if (order.item_type === "plan") {
    const plan = catalogPlans[order.item_id as PlanId];
    if (!plan) {
      throw new Error("未知套餐类型");
    }

    const currentPlanRows = await queryD1<{ expires_at: number | null }>(
      `SELECT expires_at FROM user_plan_access WHERE user_id = ? LIMIT 1`,
      [input.userId],
    );
    const existingExpiry = Number(currentPlanRows[0]?.expires_at || 0);
    const startFrom = existingExpiry > now ? existingExpiry : now;
    const nextExpiry = startFrom + plan.durationDays * 24 * 60 * 60;

    await queryD1(
      `INSERT OR REPLACE INTO user_plan_access (user_id, plan_id, expires_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [input.userId, plan.id, nextExpiry, now],
    );

    await trySyncUserPlanToPrimaryTable(input.userId, plan.id, nextExpiry);

    await queryD1(
      `UPDATE payment_orders
       SET status = 'COMPLETED', payer_id = ?, capture_payload = ?, updated_at = ?
       WHERE order_id = ?`,
      [input.payerId || null, payloadText, now, input.orderId],
    );

    return {
      alreadyApplied: false,
      granted: {
        type: "plan",
        plan_id: plan.id,
        expires_at: nextExpiry,
      },
    };
  }

  const pack = catalogCreditPacks[order.item_id as keyof typeof catalogCreditPacks];
  if (!pack) {
    throw new Error("未知点数包类型");
  }

  const existingLedger = await queryD1<{ id: string }>(
    `SELECT id FROM credit_ledger WHERE id = ? LIMIT 1`,
    [makeLedgerId(input.orderId)],
  );

  if (!existingLedger.length) {
    await queryD1(
      `INSERT INTO credit_ledger (id, user_id, order_id, delta_credits, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [makeLedgerId(input.orderId), input.userId, input.orderId, pack.credits, `paypal:${pack.id}`, now],
    );
  }

  await trySyncUserCreditsToPrimaryTable(input.userId, input.accessToken);

  await queryD1(
    `UPDATE payment_orders
     SET status = 'COMPLETED', payer_id = ?, capture_payload = ?, updated_at = ?
     WHERE order_id = ?`,
    [input.payerId || null, payloadText, now, input.orderId],
  );

  return {
    alreadyApplied: false,
    granted: {
      type: "credit_pack",
      pack_id: pack.id,
      credits: pack.credits,
    },
  };
}
