export const runtime = "edge";

import { createPaypalOrder, getApproveUrl } from "../../../../lib/paypal";
import { getCatalogItem } from "../../../../lib/payment-catalog";
import { recordPendingOrder } from "../../../../lib/payment-store";
import { resolveCurrentUser } from "../../../../lib/user-sync";

interface CreateOrderRequest {
  item_type?: "plan" | "credit_pack";
  item_id?: string;
}

function getBearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateOrderRequest;
    const itemType = body.item_type;
    const itemId = body.item_id;

    if (!itemType || !itemId) {
      return Response.json({ error: "缺少 item_type 或 item_id" }, { status: 400 });
    }

    const item = getCatalogItem(itemType, itemId);
    if (!item) {
      return Response.json({ error: "未找到对应的购买项" }, { status: 404 });
    }

    if (itemType === "plan" && itemId === "free") {
      return Response.json({ error: "免费版无需支付" }, { status: 400 });
    }

    const authToken = getBearerToken(request);
    if (!authToken) {
      return Response.json({ error: "请先登录后再支付" }, { status: 401 });
    }

    const user = await resolveCurrentUser(authToken);
    const order = await createPaypalOrder({
      itemId,
      itemType,
      name: item.name,
      description: item.description,
      priceUsd: item.priceUsd,
      authToken,
    });

    await recordPendingOrder({
      orderId: order.id,
      userId: user.id,
      itemType,
      itemId,
      amountUsd: item.priceUsd,
    });

    return Response.json({
      order_id: order.id,
      status: order.status,
      approve_url: getApproveUrl(order),
      item: {
        id: item.id,
        name: item.name,
        price_usd: item.priceUsd,
      },
    });
  } catch (error) {
    console.error("[payment/create-order] failed", error);
    const message = error instanceof Error ? error.message : "创建订单失败";
    return Response.json({ error: message, stage: "create-order" }, { status: 500 });
  }
}
