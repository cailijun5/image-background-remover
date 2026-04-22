import type { CreditPackId, PlanId } from "./types";
import { queryD1 } from "./d1";

interface AuthMeResponse {
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
  };
}

function getApiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL 未配置");
  }
  return base;
}

export async function resolveCurrentUser(accessToken: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("用户登录态无效，请重新登录后支付");
  }

  const data = await response.json() as AuthMeResponse;
  const userId = data.user?.id;
  if (!userId) {
    throw new Error("无法识别当前用户");
  }

  return {
    id: userId,
    email: data.user?.email || null,
    name: data.user?.name || null,
  };
}

interface UsageStatsRow {
  purchased_credits_remaining?: number;
}

export async function getPurchasedCreditsBalance(accessToken: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/dashboard/stats`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json() as { balance?: { usage?: UsageStatsRow } };
  return data.balance?.usage?.purchased_credits_remaining ?? null;
}

export async function trySyncUserCreditsToPrimaryTable(userId: string, accessToken?: string | null) {
  if (!accessToken) return false;

  const currentCredits = await getPurchasedCreditsBalance(accessToken);
  if (currentCredits == null) return false;

  const ledgerRows = await queryD1<{ total: number }>(
    `SELECT COALESCE(SUM(delta_credits), 0) AS total FROM credit_ledger WHERE user_id = ?`,
    [userId],
  );
  const totalDelta = Number(ledgerRows[0]?.total || 0);
  const nextCredits = currentCredits + totalDelta;

  try {
    await queryD1(`UPDATE users SET purchased_credits = ? WHERE id = ?`, [nextCredits, userId]);
    return true;
  } catch {
    return false;
  }
}

export async function trySyncUserPlanToPrimaryTable(userId: string, planId: PlanId, expiresAt: number) {
  try {
    await queryD1(`UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?`, [planId, expiresAt, userId]);
    return true;
  } catch {
    return false;
  }
}

export function isPlanId(value: string): value is PlanId {
  return ["free", "starter", "pro", "business"].includes(value);
}

export function isCreditPackId(value: string): value is CreditPackId {
  return ["pack_50", "pack_200", "pack_1000", "pack_5000"].includes(value);
}
