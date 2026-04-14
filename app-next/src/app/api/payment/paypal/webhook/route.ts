export const runtime = "edge";

import { verifyPaypalWebhookSignature } from "../../../../../lib/paypal";
import { applySuccessfulPayment, getPaymentOrder } from "../../../../../lib/payment-store";

interface PaypalWebhookEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    payer?: {
      payer_id?: string;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
}

function getHeader(request: Request, name: string) {
  return request.headers.get(name) || "";
}

function getRequiredWebhookId() {
  const value = process.env.PAYPAL_WEBHOOK_ID;
  if (!value) {
    throw new Error("PAYPAL_WEBHOOK_ID 未配置");
  }
  return value;
}

function resolveOrderId(event: PaypalWebhookEvent) {
  return event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id || null;
}

function resolvePayerId(event: PaypalWebhookEvent) {
  return event.resource?.payer?.payer_id || null;
}

export async function POST(request: Request) {
  try {
    const event = await request.json() as PaypalWebhookEvent;

    const authAlgo = getHeader(request, "paypal-auth-algo");
    const certUrl = getHeader(request, "paypal-cert-url");
    const transmissionId = getHeader(request, "paypal-transmission-id");
    const transmissionSig = getHeader(request, "paypal-transmission-sig");
    const transmissionTime = getHeader(request, "paypal-transmission-time");

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      return Response.json({ error: "缺少 PayPal 验签请求头" }, { status: 400 });
    }

    const verify = await verifyPaypalWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookId: getRequiredWebhookId(),
      eventBody: event,
    });

    if (verify.verification_status !== "SUCCESS") {
      return Response.json({ error: "Webhook 验签失败", verification_status: verify.verification_status }, { status: 400 });
    }

    const eventType = event.event_type || "unknown";
    const orderId = resolveOrderId(event);

    if (!orderId) {
      return Response.json({ verified: true, ignored: true, reason: "未识别到订单号", event_type: eventType });
    }

    if (eventType !== "CHECKOUT.ORDER.APPROVED" && eventType !== "PAYMENT.CAPTURE.COMPLETED") {
      return Response.json({ verified: true, ignored: true, reason: "当前事件无需处理", event_type: eventType, order_id: orderId });
    }

    const order = await getPaymentOrder(orderId);
    if (!order) {
      return Response.json({ verified: true, ignored: true, reason: "本地未找到订单", event_type: eventType, order_id: orderId });
    }

    const applied = await applySuccessfulPayment({
      orderId,
      userId: order.user_id,
      payerId: resolvePayerId(event),
      capturePayload: event,
    });

    return Response.json({
      verified: true,
      processed: true,
      event_type: eventType,
      order_id: orderId,
      applied,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook 处理失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
