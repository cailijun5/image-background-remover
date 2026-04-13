"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/site-header";
import { apiClient } from "../../lib/api-client";
import { getAuthToken } from "../../lib/auth-client";
import { getLoginUrl } from "../../lib/config";

interface PaymentOrder {
  order_id: string;
  item_type: string;
  item_id: string;
  amount_usd: number;
  currency: string;
  status: string;
  payer_id: string | null;
  created_at: number;
  updated_at: number;
}

interface CreditLedgerRow {
  id: string;
  order_id: string | null;
  delta_credits: number;
  reason: string;
  created_at: number;
}

interface PaymentDebugResponse {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  orders: PaymentOrder[];
  current_plan_access: {
    plan_id: string;
    expires_at: number;
    updated_at: number;
  } | null;
  credit_summary: {
    total_ledger_credits: number;
  };
  recent_credit_ledger: CreditLedgerRow[];
}

export default function PaymentDebugPage() {
  const [data, setData] = useState<PaymentDebugResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const token = getAuthToken();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await apiClient.get<PaymentDebugResponse>("/api/payment/orders?limit=20");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-950 text-white pb-16">
        <SiteHeader />
        <section className="mx-auto max-w-3xl px-4 pt-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h1 className="text-3xl font-bold">请先登录</h1>
            <p className="mt-3 text-slate-300">登录后才能查看 Sandbox 支付调试信息。</p>
            <a
              href={getLoginUrl()}
              className="mt-6 inline-flex rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-500 transition-colors"
            >
              去登录
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-16">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">支付调试面板</h1>
            <p className="mt-2 text-slate-300">用于验证 Sandbox 订单、套餐到账和点数流水。</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={load}
              className="rounded-xl bg-purple-600 px-4 py-2 font-semibold hover:bg-purple-500 transition-colors"
            >
              {loading ? "刷新中..." : "刷新数据"}
            </button>
            <a href="/pricing" className="rounded-xl bg-slate-800 px-4 py-2 font-semibold hover:bg-slate-700 transition-colors">去测试购买</a>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">当前用户</div>
                <div className="mt-2 text-lg font-semibold">{data.user.name || data.user.email || data.user.id}</div>
                <div className="mt-2 text-xs text-slate-400 break-all">{data.user.id}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">当前套餐权益</div>
                <div className="mt-2 text-lg font-semibold">{data.current_plan_access?.plan_id || "无"}</div>
                <div className="mt-2 text-sm text-slate-300">
                  {data.current_plan_access ? `到期时间：${new Date(data.current_plan_access.expires_at * 1000).toLocaleString("zh-CN")}` : "尚未购买套餐"}
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-slate-400">点数流水累计</div>
                <div className="mt-2 text-3xl font-bold">{data.credit_summary.total_ledger_credits}</div>
                <div className="mt-2 text-sm text-slate-300">基于 credit_ledger 汇总</div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 overflow-x-auto">
              <h2 className="text-2xl font-semibold">最近订单</h2>
              <table className="mt-5 w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-4 pr-4">订单号</th>
                    <th className="pb-4 pr-4">类型</th>
                    <th className="pb-4 pr-4">商品</th>
                    <th className="pb-4 pr-4">金额</th>
                    <th className="pb-4 pr-4">状态</th>
                    <th className="pb-4 pr-4">付款人</th>
                    <th className="pb-4 pr-4">创建时间</th>
                    <th className="pb-4">更新时间</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {data.orders.length ? data.orders.map((order) => (
                    <tr key={order.order_id} className="border-t border-white/10">
                      <td className="py-4 pr-4 break-all">{order.order_id}</td>
                      <td className="py-4 pr-4">{order.item_type}</td>
                      <td className="py-4 pr-4">{order.item_id}</td>
                      <td className="py-4 pr-4">{order.amount_usd} {order.currency}</td>
                      <td className="py-4 pr-4">{order.status}</td>
                      <td className="py-4 pr-4 break-all">{order.payer_id || "-"}</td>
                      <td className="py-4 pr-4">{new Date(order.created_at * 1000).toLocaleString("zh-CN")}</td>
                      <td className="py-4">{new Date(order.updated_at * 1000).toLocaleString("zh-CN")}</td>
                    </tr>
                  )) : (
                    <tr className="border-t border-white/10">
                      <td colSpan={8} className="py-5 text-slate-400">暂无订单数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 overflow-x-auto">
              <h2 className="text-2xl font-semibold">最近点数流水</h2>
              <table className="mt-5 w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-4 pr-4">流水ID</th>
                    <th className="pb-4 pr-4">订单号</th>
                    <th className="pb-4 pr-4">变动</th>
                    <th className="pb-4 pr-4">原因</th>
                    <th className="pb-4">时间</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {data.recent_credit_ledger.length ? data.recent_credit_ledger.map((row) => (
                    <tr key={row.id} className="border-t border-white/10">
                      <td className="py-4 pr-4 break-all">{row.id}</td>
                      <td className="py-4 pr-4 break-all">{row.order_id || "-"}</td>
                      <td className="py-4 pr-4">{row.delta_credits}</td>
                      <td className="py-4 pr-4">{row.reason}</td>
                      <td className="py-4">{new Date(row.created_at * 1000).toLocaleString("zh-CN")}</td>
                    </tr>
                  )) : (
                    <tr className="border-t border-white/10">
                      <td colSpan={5} className="py-5 text-slate-400">暂无点数流水</td>
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
