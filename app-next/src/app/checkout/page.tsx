"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "../../components/site-header";
import { apiClient } from "../../lib/api-client";
import { clearAuthToken, getAuthToken } from "../../lib/auth-client";
import { getLoginUrl } from "../../lib/config";

const planInfo: Record<string, { name: string; price: string; desc: string }> = {
  free: { name: "免费版", price: "$0", desc: "免费体验版，无需支付" },
  starter: { name: "入门版", price: "$12 / 30 天", desc: "购买后立即生效，30 天有效，不自动续费" },
  pro: { name: "专业版", price: "$29 / 30 天", desc: "购买后立即生效，30 天有效，不自动续费" },
  business: { name: "商业版", price: "$79 / 30 天", desc: "购买后立即生效，30 天有效，不自动续费" },
};

const packInfo: Record<string, { name: string; price: string; desc: string }> = {
  pack_50: { name: "小额包", price: "$19", desc: "50 张点数，购买后立即到账，永久有效" },
  pack_200: { name: "标准包", price: "$69", desc: "200 张点数，购买后立即到账，永久有效" },
  pack_1000: { name: "成长包", price: "$299", desc: "1000 张点数，购买后立即到账，永久有效" },
  pack_5000: { name: "大客户包", price: "$1299", desc: "5000 张点数，购买后立即到账，永久有效" },
};

interface CreateOrderResponse {
  order_id: string;
  approve_url?: string;
}

interface CaptureOrderResponse {
  ok: boolean;
  order_id: string;
  status: string;
  note?: string;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("/");
  const [info, setInfo] = useState("");
  const [captureState, setCaptureState] = useState<"idle" | "capturing" | "done">("idle");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const itemType = searchParams.get("item_type");
  const itemId = searchParams.get("item_id");
  const payment = searchParams.get("payment");
  const payerId = searchParams.get("PayerID");
  const orderId = searchParams.get("token");
  const token = getAuthToken();

  const detail = useMemo(() => {
    if (itemType === "plan") return itemId ? planInfo[itemId] : null;
    if (itemType === "credit_pack") return itemId ? packInfo[itemId] : null;
    return null;
  }, [itemId, itemType]);

  useEffect(() => {
    if (!token) return;
    apiClient.get("/api/auth/me").catch(() => clearAuthToken());
  }, [token]);

  useEffect(() => {
    if (payment === "cancelled") {
      setInfo("你已取消本次支付，可以返回定价页重新选择。");
    }
  }, [payment]);

  useEffect(() => {
    if (payment !== "success" || !orderId || !payerId || captureState !== "idle") return;

    setCaptureState("capturing");
    setInfo("正在确认 PayPal 支付结果...");

    apiClient.post<CaptureOrderResponse>("/api/payment/capture-order", { order_id: orderId })
      .then((data) => {
        if (data.ok) {
          setInfo("支付已确认成功。当前版本已完成 PayPal 收款链路，套餐/点数到账逻辑将在主业务后端接入后自动发放。");
        } else {
          setError(`支付返回状态：${data.status}`);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "确认支付失败"))
      .finally(() => setCaptureState("done"));
  }, [captureState, orderId, payerId, payment]);

  async function handleCreateOrder() {
    if (!itemType || !itemId) {
      setError("缺少购买参数，请从定价页重新进入。");
      return;
    }

    if (itemType === "plan" && itemId === "free") {
      window.location.href = "/dashboard";
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await apiClient.post<CreateOrderResponse>("/api/payment/create-order", {
        item_type: itemType,
        item_id: itemId,
        billing: "one_time",
      });

      if (data.approve_url) {
        window.location.href = data.approve_url;
        return;
      }

      setError("订单已创建，但未返回支付链接，请检查 PayPal 配置。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建订单失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 pt-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">完成支付</h1>
        <p className="mt-3 text-slate-300 leading-7">
          确认购买内容后，点击下方按钮跳转 PayPal 完成支付。当前套餐为一次性购买，生效 30 天，不自动续费；点数包购买后立即到账，永久有效。
        </p>

        {!token && (
          <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4 text-amber-200">
            请先登录后再完成支付。
            <div className="mt-4">
              <a
                href={getLoginUrl(currentUrl)}
                className="inline-flex rounded-xl bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 transition-colors"
              >
                先登录再支付
              </a>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/30 p-5">
          <h2 className="text-2xl font-semibold">{detail?.name || "加载中..."}</h2>
          <div className="mt-4 space-y-2 text-slate-300">
            <p><strong className="text-white">类型：</strong>{itemType === "plan" ? "30 天套餐" : itemType === "credit_pack" ? "点数包" : "未知"}</p>
            <p><strong className="text-white">价格：</strong>{detail?.price || "-"}</p>
            <p><strong className="text-white">说明：</strong>{detail?.desc || "-"}</p>
          </div>
        </div>

        {info && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-emerald-200">
            {info}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={handleCreateOrder}
            disabled={!token || loading}
            className="rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-slate-700 transition-colors"
          >
            {loading ? "创建订单中..." : "前往 PayPal 支付"}
          </button>
          <a
            href="/pricing"
            className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            返回定价页
          </a>
        </div>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white pb-16">
      <SiteHeader />
      <Suspense fallback={<section className="mx-auto max-w-3xl px-4 pt-10 text-slate-300">加载支付信息中...</section>}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}
