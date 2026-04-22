export interface PaypalAccessTokenResponse {
  access_token: string;
  token_type: string;
  app_id?: string;
  expires_in: number;
  nonce?: string;
}

export interface PaypalLink {
  href: string;
  rel: string;
  method?: string;
}

export interface PaypalOrderResponse {
  id: string;
  status: string;
  links?: PaypalLink[];
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    description?: string;
    amount?: {
      currency_code: string;
      value: string;
    };
  }>;
}

export interface PaypalWebhookVerificationResponse {
  verification_status: "SUCCESS" | "FAILURE" | string;
}

function getPaypalBaseUrl() {
  const mode = process.env.PAYPAL_MODE || "sandbox";
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 未配置`);
  }
  return value;
}

async function paypalFetch<T>(path: string, init: RequestInit, accessToken?: string): Promise<T> {
  const base = getPaypalBaseUrl();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.name || "PayPal 请求失败";
    throw new Error(message);
  }

  return data as T;
}

export async function getPaypalAccessToken() {
  const clientId = getRequiredEnv("PAYPAL_CLIENT_ID");
  const secret = getRequiredEnv("PAYPAL_SECRET");
  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");

  return paypalFetch<PaypalAccessTokenResponse>("/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
}

export function getBaseSiteUrl() {
  return process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function buildReturnUrl(path: string) {
  return `${getBaseSiteUrl().replace(/\/$/, "")}${path}`;
}

export function getApproveUrl(order: PaypalOrderResponse) {
  return order.links?.find((link) => link.rel === "approve")?.href;
}

export function formatAmount(amount: number) {
  return amount.toFixed(2);
}

export async function createPaypalOrder(payload: {
  itemId: string;
  itemType: "plan" | "credit_pack";
  name: string;
  description: string;
  priceUsd: number;
  authToken?: string | null;
}) {
  const access = await getPaypalAccessToken();
  const returnBase = `/dashboard?payment=success&item_type=${encodeURIComponent(payload.itemType)}&item_id=${encodeURIComponent(payload.itemId)}`;
  const cancelBase = `/checkout?payment=cancelled&item_type=${encodeURIComponent(payload.itemType)}&item_id=${encodeURIComponent(payload.itemId)}`;

  return paypalFetch<PaypalOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PayPal-Request-Id": `${payload.itemType}_${payload.itemId}_${Date.now()}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `${payload.itemType}:${payload.itemId}`,
          custom_id: payload.authToken?.slice(0, 120) || `${payload.itemType}:${payload.itemId}`,
          description: payload.description,
          amount: {
            currency_code: "USD",
            value: formatAmount(payload.priceUsd),
          },
        },
      ],
      application_context: {
        brand_name: "Image Background Remover",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: buildReturnUrl(returnBase),
        cancel_url: buildReturnUrl(cancelBase),
      },
    }),
  }, access.access_token);
}

export async function capturePaypalOrder(orderId: string) {
  const access = await getPaypalAccessToken();
  return paypalFetch<PaypalOrderResponse>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  }, access.access_token);
}

export async function verifyPaypalWebhookSignature(payload: {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  eventBody: unknown;
}) {
  const access = await getPaypalAccessToken();

  return paypalFetch<PaypalWebhookVerificationResponse>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: payload.authAlgo,
      cert_url: payload.certUrl,
      transmission_id: payload.transmissionId,
      transmission_sig: payload.transmissionSig,
      transmission_time: payload.transmissionTime,
      webhook_id: payload.webhookId,
      webhook_event: payload.eventBody,
    }),
  }, access.access_token);
}
