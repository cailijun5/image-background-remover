export const runtime = "edge";

import { ensurePaymentSchema, queryD1 } from "../../../../lib/d1";
import { resolveCurrentUser } from "../../../../lib/user-sync";

function getBearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

export async function GET(request: Request) {
  try {
    const authToken = getBearerToken(request);
    if (!authToken) {
      return Response.json({ error: "请先登录" }, { status: 401 });
    }

    const user = await resolveCurrentUser(authToken);
    await ensurePaymentSchema();

    const url = new URL(request.url);
    const orderId = url.searchParams.get("order_id")?.trim();
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);

    const orders = orderId
      ? await queryD1(
          `SELECT order_id, item_type, item_id, amount_usd, currency, status, payer_id, created_at, updated_at
           FROM payment_orders
           WHERE user_id = ? AND order_id = ?
           ORDER BY updated_at DESC
           LIMIT 1`,
          [user.id, orderId],
        )
      : await queryD1(
          `SELECT order_id, item_type, item_id, amount_usd, currency, status, payer_id, created_at, updated_at
           FROM payment_orders
           WHERE user_id = ?
           ORDER BY updated_at DESC
           LIMIT ?`,
          [user.id, limit],
        );

    const plans = await queryD1(
      `SELECT user_id, plan_id, expires_at, updated_at
       FROM user_plan_access
       WHERE user_id = ?
       LIMIT 1`,
      [user.id],
    );

    const ledger = await queryD1(
      `SELECT id, order_id, delta_credits, reason, created_at
       FROM credit_ledger
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [user.id],
    );

    const creditTotalRows = await queryD1<{ total: number }>(
      `SELECT COALESCE(SUM(delta_credits), 0) AS total
       FROM credit_ledger
       WHERE user_id = ?`,
      [user.id],
    );

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      orders,
      current_plan_access: plans[0] || null,
      credit_summary: {
        total_ledger_credits: Number(creditTotalRows[0]?.total || 0),
      },
      recent_credit_ledger: ledger,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询订单失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
