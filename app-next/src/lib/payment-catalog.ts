import type { CreditPackId, PlanId } from "./types";

export interface CatalogPlan {
  id: PlanId;
  name: string;
  priceUsd: number;
  durationDays: number;
  description: string;
}

export interface CatalogCreditPack {
  id: CreditPackId;
  name: string;
  priceUsd: number;
  credits: number;
  description: string;
}

export const catalogPlans: Record<PlanId, CatalogPlan> = {
  free: {
    id: "free",
    name: "免费版",
    priceUsd: 0,
    durationDays: 0,
    description: "免费体验版，无需支付",
  },
  starter: {
    id: "starter",
    name: "入门版",
    priceUsd: 12,
    durationDays: 30,
    description: "购买后立即生效，30 天内可使用套餐权益，不自动续费",
  },
  pro: {
    id: "pro",
    name: "专业版",
    priceUsd: 29,
    durationDays: 30,
    description: "购买后立即生效，30 天内可使用套餐权益，不自动续费",
  },
  business: {
    id: "business",
    name: "商业版",
    priceUsd: 79,
    durationDays: 30,
    description: "购买后立即生效，30 天内可使用套餐权益，不自动续费",
  },
};

export const catalogCreditPacks: Record<CreditPackId, CatalogCreditPack> = {
  pack_50: {
    id: "pack_50",
    name: "小额包",
    priceUsd: 19,
    credits: 50,
    description: "购买后立即到账，点数永久有效不过期",
  },
  pack_200: {
    id: "pack_200",
    name: "标准包",
    priceUsd: 69,
    credits: 200,
    description: "购买后立即到账，点数永久有效不过期",
  },
  pack_1000: {
    id: "pack_1000",
    name: "成长包",
    priceUsd: 299,
    credits: 1000,
    description: "购买后立即到账，点数永久有效不过期",
  },
  pack_5000: {
    id: "pack_5000",
    name: "大客户包",
    priceUsd: 1299,
    credits: 5000,
    description: "购买后立即到账，点数永久有效不过期",
  },
};

export function getCatalogItem(itemType: "plan" | "credit_pack", itemId: string) {
  if (itemType === "plan") {
    return catalogPlans[itemId as PlanId] || null;
  }
  return catalogCreditPacks[itemId as CreditPackId] || null;
}
