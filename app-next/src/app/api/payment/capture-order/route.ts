export const runtime = "edge";

import { capturePaypalOrder } from "../../../../lib/paypal";
import { applySuccessfulPayment } from "../../../../lib/payment-store";
import { resolveCurrentUser } from "../../../../lib/user-sync";

interface CaptureOrderRequest {
  order_id?: string;
}

function getBearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

function extractPayerId(order: unknown) {
  const maybe = order as {
    payer?: { payer_id?: string };
    payment_source?: { paypal?: { account_id?: string } };
  };
  return maybe?.payer?.payer_id || maybe?.payment_source?.paypal?.account_id || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CaptureOrderRequest;
    const orderId = body.order_id?.trim();

    if (!orderId) {
      return Response.json({ error: "缺少 order_id" }, { status: 400 });
    }

    const authToken = getBearerToken(request);
    if (!authToken) {
      return Response.json({ error: "请先登录后再确认支付" }, { status: 401 });
    }

    const user = await resolveCurrentUser(authToken);
    const order = await capturePaypalOrder(orderId);
    const applied = await applySuccessfulPayment({
      orderId,
      userId: user.id,
      payerId: extractPayerId(order),
      capturePayload: order,
      accessToken: authToken,
    });

    return Response.json({
      ok: order.status === "COMPLETED" || order.status === "APPROVED",
      order_id: order.id,
      status: order.status,
      applied,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "捕获订单失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
