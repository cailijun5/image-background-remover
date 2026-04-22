export type PlanId = "free" | "starter" | "pro" | "business";
export type CreditPackId = "pack_50" | "pack_200" | "pack_1000" | "pack_5000";

export interface Plan {
  id: PlanId;
  name: string;
  price_usd: number;
  monthly_credits: number;
  overage_price_usd: number | null;
  quality: "basic" | "hd";
  priority: boolean;
  commercial_use: boolean;
  features: string[];
}

export interface CreditPack {
  id: CreditPackId;
  name: string;
  credits: number;
  price_usd: number;
}

export interface PricingResponse {
  plans: Plan[];
  credit_packs: CreditPack[];
}

export interface UsageSummary {
  plan: {
    id: PlanId;
    name: string;
    monthly_price_usd: number;
    monthly_credits: number;
    overage_price_usd: number | null;
    priority: boolean;
    commercial_use: boolean;
    quality: "basic" | "hd";
  };
  usage: {
    monthly_used: number;
    monthly_quota: number;
    monthly_remaining: number;
    purchased_credits_remaining: number;
    total_available_now: number;
    overage_images_this_period: number;
    overage_amount_usd: number;
    total_images_processed: number;
    current_period_start: string;
    current_period_end: string;
  };
}

export interface DashboardStatsResponse {
  user: {
    name: string | null;
    email: string;
    avatar_url: string | null;
    plan: PlanId;
    plan_expires_at: number | null;
    member_since: string;
  };
  balance: UsageSummary;
  stats: {
    total_images_processed: number;
    avg_processing_time_ms: number;
  };
}

export interface RecentJob {
  id: string;
  status: string;
  quality: "basic" | "hd";
  source_type: "monthly_quota" | "purchased_credit" | "overage" | "guest";
  file_size_kb: number | null;
  processing_time_ms: number | null;
  created_at: number;
}
