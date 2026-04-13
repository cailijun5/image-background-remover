"use client";

import { useEffect, useState } from "react";
import { apiClient } from "../lib/api-client";
import { getAuthToken } from "../lib/auth-client";
import type { UsageSummary } from "../lib/types";

function isValidUsageSummary(data: UsageSummary | null): data is UsageSummary {
  return Boolean(
    data
    && data.plan
    && typeof data.plan.name === "string"
    && data.usage
    && typeof data.usage.monthly_remaining === "number"
    && typeof data.usage.purchased_credits_remaining === "number"
    && typeof data.usage.total_available_now === "number"
  );
}

export function UsageBanner() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);

  useEffect(() => {
    if (!getAuthToken()) return;
    apiClient.get<UsageSummary>("/api/dashboard/usage")
      .then((data) => {
        setSummary(isValidUsageSummary(data) ? data : null);
      })
      .catch(() => setSummary(null));
  }, []);

  if (!summary) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 mb-8">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 px-5 py-4 text-sm text-slate-300">
          未登录用户可先体验 1 次；登录后可查看月额度、点数余额和套餐信息。
        </div>
      </div>
    );
  }

  const { plan, usage } = summary;
  return (
    <div className="w-full max-w-5xl mx-auto px-4 mb-8">
      <div className="rounded-2xl border border-purple-500/30 bg-purple-950/25 px-5 py-4 text-sm text-slate-200 shadow-lg shadow-purple-950/20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-semibold text-white">当前套餐：</span>
            {plan.name}
          </div>
          <div className="flex flex-wrap gap-4 text-slate-300">
            <span>本月剩余：{usage.monthly_remaining}</span>
            <span>已购点数：{usage.purchased_credits_remaining}</span>
            <span>总可用：{usage.total_available_now}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
