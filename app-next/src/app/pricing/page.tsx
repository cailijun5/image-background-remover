"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/site-header";
import { apiClient } from "../../lib/api-client";
import { getAuthToken } from "../../lib/auth-client";
import { getLoginUrl } from "../../lib/config";
import type { PricingResponse } from "../../lib/types";

const featuredPlan = "pro";
const planDescriptions: Record<string, string> = {
  free: "适合先体验产品",
  starter: "适合个人用户和轻度商用需求，30 天有效",
  pro: "适合自由职业者和稳定高频用户，30 天有效",
  business: "适合小型业务和高频处理需求，30 天有效",
};

const packDescriptions: Record<string, string> = {
  pack_50: "适合偶尔使用",
  pack_200: "适合短期项目",
  pack_1000: "适合长期高频使用",
  pack_5000: "适合大批量需求",
};

export default function PricingPage() {
  const [data, setData] = useState<PricingResponse | null>(null);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(Boolean(getAuthToken()));
    apiClient.get<PricingResponse>("/api/pricing")
      .then(setData)
      .catch((err) => setError(err.message || "加载定价失败"));
  }, []);

  function goCheckout(itemType: "plan" | "credit_pack", itemId: string) {
    const target = `/checkout?item_type=${encodeURIComponent(itemType)}&item_id=${encodeURIComponent(itemId)}`;
    if (!authenticated) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      window.location.href = getLoginUrl(`${origin}${target}`);
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white pb-16">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pt-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">简单透明的在线抠图定价</h1>
        <p className="mx-auto mt-4 max-w-3xl text-slate-300 leading-7">
          上传图片，几秒内去除背景。按你的使用频率灵活选择：可以购买 30 天套餐，也可以按需购买点数。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-slate-200">
          <span className="rounded-full border border-purple-500/40 bg-white/5 px-4 py-2">无隐藏费用</span>
          <span className="rounded-full border border-purple-500/40 bg-white/5 px-4 py-2">套餐 30 天有效，不自动续费</span>
          <span className="rounded-full border border-purple-500/40 bg-white/5 px-4 py-2">点数永久有效</span>
        </div>
      </section>

      {error && (
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-red-500/30 bg-red-950/20 px-5 py-4 text-red-200">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="mx-auto mt-12 max-w-6xl px-4">
            <h2 className="text-2xl font-semibold mb-5">30 天套餐</h2>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {data.plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-3xl border p-6 shadow-xl ${plan.id === featuredPlan ? "border-purple-400 bg-purple-950/30" : "border-white/10 bg-white/5"}`}
                >
                  {plan.id === featuredPlan && (
                    <div className="mb-4 inline-flex rounded-full bg-purple-500 px-3 py-1 text-xs font-semibold">
                      最受欢迎
                    </div>
                  )}
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-2 min-h-12 text-sm text-slate-300">{planDescriptions[plan.id]}</p>
                  <div className="mt-5 text-4xl font-bold">
                    ${plan.price_usd}
                    <span className="text-base font-normal text-slate-400"> {plan.id === "free" ? "" : "/ 30 天"}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {plan.id === "free" ? "适合先免费体验" : "一次性购买，立即生效，不自动续费"}
                  </p>
                  <ul className="mt-5 space-y-3 text-sm text-slate-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => goCheckout("plan", plan.id)}
                    className={`mt-6 w-full rounded-xl px-4 py-3 font-semibold transition-colors ${plan.id === featuredPlan ? "bg-purple-600 hover:bg-purple-500" : "bg-slate-800 hover:bg-slate-700"}`}
                  >
                    {plan.id === "free" ? "免费开始" : `购买${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-6xl px-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold">按需购买点数</h2>
              <p className="mt-3 text-slate-300">
                如果你不想购买套餐，或者临时处理需求增加，可以随时购买额外点数。购买的点数永久有效，不过期。
              </p>
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {data.credit_packs.map((pack) => (
                  <div key={pack.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                    <h3 className="text-xl font-semibold">{pack.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">{packDescriptions[pack.id]}</p>
                    <div className="mt-5 text-3xl font-bold">{pack.credits} 张</div>
                    <p className="mt-1 text-slate-300">${pack.price_usd}</p>
                    <button
                      onClick={() => goCheckout("credit_pack", pack.id)}
                      className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-3 font-semibold hover:bg-slate-700 transition-colors"
                    >
                      立即购买
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="mx-auto mt-16 max-w-6xl px-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">功能对比</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-4 pr-4">功能</th>
                  <th className="pb-4 pr-4">免费版</th>
                  <th className="pb-4 pr-4">入门版</th>
                  <th className="pb-4 pr-4">专业版</th>
                  <th className="pb-4">商业版</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {[
                  ["30 天图片额度", "2 张", "40 张", "120 张", "400 张"],
                  ["高清下载", "否", "是", "是", "是"],
                  ["处理速度", "标准", "更快", "优先", "优先"],
                  ["商业使用", "否", "是", "是", "是"],
                  ["超额购买", "否", "是", "是", "是"],
                  ["点数包加购", "否", "是", "是", "是"],
                  ["专属支持", "否", "否", "否", "是"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-white/10">
                    {row.map((cell, idx) => (
                      <td key={cell + idx} className="py-4 pr-4">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">常见问题</h2>
          <div className="mt-5 space-y-5 text-sm leading-7 text-slate-300">
            <div><strong className="text-white">点数怎么计算？</strong><br />每成功处理 1 张图片，会消耗 1 个点数。</div>
            <div><strong className="text-white">网站会保存我处理过的图片吗？</strong><br />不会。当前网站版不保存历史记录。图片处理完成后，请及时下载结果。</div>
            <div><strong className="text-white">支持批量处理吗？</strong><br />当前网站版暂不支持批量处理。批量处理功能将由后续桌面软件提供。</div>
            <div><strong className="text-white">套餐会自动续费吗？</strong><br />不会。当前套餐为一次性购买，生效 30 天，到期后如需继续使用请手动续购。</div>
            <div><strong className="text-white">用完额度怎么办？</strong><br />你可以购买额外点数，或者重新购买更高档套餐。</div>
          </div>
        </div>
      </section>
    </main>
  );
}
