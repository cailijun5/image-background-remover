"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/site-header";
import { apiClient } from "../../lib/api-client";
import { getAuthToken } from "../../lib/auth-client";
import { getLoginUrl } from "../../lib/config";
import type { DashboardStatsResponse, RecentJob } from "../../lib/types";

function sourceLabel(source: RecentJob["source_type"]) {
  return {
    monthly_quota: "月额度",
    purchased_credit: "点数包",
    overage: "超额计费",
    guest: "游客体验",
  }[source] || source;
}

function qualityLabel(q: RecentJob["quality"]) {
  return q === "hd" ? "高清" : "基础";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [jobs, setJobs] = useState<RecentJob[]>([]);
  const [error, setError] = useState("");
  const [currentUrl, setCurrentUrl] = useState("/");
  const token = getAuthToken();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      apiClient.get<DashboardStatsResponse>("/api/dashboard/stats"),
      apiClient.get<{ jobs: RecentJob[] }>("/api/dashboard/recent-jobs?limit=10"),
    ])
      .then(([stats, recent]) => {
        setData(stats);
        setJobs(recent.jobs || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, [token]);

  if (!token) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white pb-16">
        <SiteHeader />
        <section className="mx-auto max-w-3xl px-4 pt-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h1 className="text-3xl font-bold">请先登录</h1>
            <p className="mt-3 text-slate-300 leading-7">
              登录后即可查看当前套餐、剩余额度、已购点数，以及最近的处理记录。
            </p>
            <a
              href={getLoginUrl(currentUrl)}
              className="mt-6 inline-flex rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-500 transition-colors"
            >
              使用 Google 登录
            </a>
          </div>
        </section>
      </main>
    );
  }

  const usage = data?.balance.usage;
  const plan = data?.balance.plan;
  const usedPercent = usage && usage.monthly_quota > 0
    ? Math.min(100, Math.round((usage.monthly_used / usage.monthly_quota) * 100))
    : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white pb-16">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">用户中心</h1>
            <p className="mt-2 text-slate-300">
              {data?.user.name || data?.user.email || "查看你的套餐、额度和最近处理记录"}
            </p>
          </div>
          <div className="flex gap-3">
            <a href="/pricing" className="rounded-xl bg-slate-800 px-4 py-2 font-semibold hover:bg-slate-700 transition-colors">查看定价</a>
            <a href="/checkout?item_type=credit_pack&item_id=pack_50" className="rounded-xl bg-purple-600 px-4 py-2 font-semibold hover:bg-purple-500 transition-colors">购买点数</a>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        {data && usage && plan && (
          <>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">当前套餐</div>
                <div className="mt-2 text-3xl font-bold">{plan.name}</div>
                <div className="mt-2 text-slate-300">月费 ${plan.monthly_price_usd}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">本月已用 / 总额度</div>
                <div className="mt-2 text-3xl font-bold">{usage.monthly_used} / {usage.monthly_quota}</div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500" style={{ width: `${usedPercent}%` }} />
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">剩余月额度</div>
                <div className="mt-2 text-3xl font-bold">{usage.monthly_remaining}</div>
                <div className="mt-2 text-slate-300">周期：{usage.current_period_start} - {usage.current_period_end}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">已购点数剩余</div>
                <div className="mt-2 text-3xl font-bold">{usage.purchased_credits_remaining}</div>
                <div className="mt-2 text-slate-300">总可用：{usage.total_available_now}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">本周期超额金额</div>
                <div className="mt-2 text-3xl font-bold">${usage.overage_amount_usd.toFixed(2)}</div>
                <div className="mt-2 text-slate-300">超额张数：{usage.overage_images_this_period}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">累计处理图片</div>
                <div className="mt-2 text-3xl font-bold">{usage.total_images_processed}</div>
                <div className="mt-2 text-slate-300">平均处理时长：{data.stats.avg_processing_time_ms} ms</div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold">套餐说明</h2>
              <p className="mt-4 leading-8 text-slate-300">
                当前套餐支持：{plan.quality === "hd" ? "高清下载" : "基础下载质量"}、{plan.priority ? "优先处理" : "标准处理速度"}、
                {plan.commercial_use ? "商业使用" : "仅限个人体验"}。
                {plan.overage_price_usd ? ` 超额按 $${plan.overage_price_usd.toFixed(2)} / 张计费。` : " 当前套餐不支持超额使用。"}
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 overflow-x-auto">
              <h2 className="text-2xl font-semibold">最近处理记录</h2>
              <table className="mt-5 w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-4 pr-4">任务 ID</th>
                    <th className="pb-4 pr-4">状态</th>
                    <th className="pb-4 pr-4">质量</th>
                    <th className="pb-4 pr-4">扣减来源</th>
                    <th className="pb-4 pr-4">文件大小</th>
                    <th className="pb-4 pr-4">耗时</th>
                    <th className="pb-4">创建时间</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {jobs.length ? jobs.map((job) => (
                    <tr key={job.id} className="border-t border-white/10">
                      <td className="py-4 pr-4">{job.id.slice(0, 8)}...</td>
                      <td className="py-4 pr-4">{job.status}</td>
                      <td className="py-4 pr-4">{qualityLabel(job.quality)}</td>
                      <td className="py-4 pr-4">{sourceLabel(job.source_type)}</td>
                      <td className="py-4 pr-4">{job.file_size_kb ?? "-"} KB</td>
                      <td className="py-4 pr-4">{job.processing_time_ms ?? "-"} ms</td>
                      <td className="py-4">{new Date(job.created_at * 1000).toLocaleString("zh-CN")}</td>
                    </tr>
                  )) : (
                    <tr className="border-t border-white/10">
                      <td colSpan={7} className="py-5 text-slate-400">暂无处理记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
