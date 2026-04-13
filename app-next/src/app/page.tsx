"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { SiteHeader } from "../components/site-header";
import { UsageBanner } from "../components/usage-banner";
import { ErrorBoundary } from "../components/error-boundary";
import { getAuthToken } from "../lib/auth-client";
import { getLoginUrl } from "../lib/config";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

interface ProcessResponse {
  job_id: string;
  status: string;
  result_url: string;
  quality: "basic" | "hd";
  watermark: boolean;
  source_type: "monthly_quota" | "purchased_credit" | "overage" | "guest";
  processing_time_ms: number;
  expires_at: number;
}

function sourceLabel(source: ProcessResponse["source_type"]) {
  return {
    monthly_quota: "本次消耗月额度",
    purchased_credit: "本次消耗已购点数",
    overage: "本次进入超额计费",
    guest: "本次为游客体验",
  }[source] || source;
}

function HeaderFallback() {
  return (
    <>
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-4">
        <a className="text-white font-semibold text-lg tracking-tight" href="/">
          Image Background Remover
        </a>
        <nav className="flex items-center gap-3 text-sm flex-wrap justify-end">
          <a href="/pricing" className="text-slate-300 hover:text-white transition-colors">定价</a>
          <a href="/dashboard" className="text-slate-300 hover:text-white transition-colors">用户中心</a>
          <a href="/payment-debug" className="text-slate-300 hover:text-white transition-colors">支付调试</a>
          <a href="/" className="rounded-xl bg-purple-600 px-4 py-2 text-white hover:bg-purple-500 transition-colors">首页</a>
        </nav>
      </header>
      <div className="w-full max-w-5xl mx-auto px-4 mb-8">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 px-5 py-4 text-sm text-slate-300">
          页面已自动降级显示。若你刚登录或刚更新版本，请刷新后重试。
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [usageHint, setUsageHint] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [processingMeta, setProcessingMeta] = useState<ProcessResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultBlobRef = useRef<Blob | null>(null);

  const reset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl && resultUrl.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setOriginalUrl(null);
    setResultUrl(null);
    setErrorMsg("");
    setUsageHint("");
    setStatus("idle");
    setProcessingMeta(null);
    resultBlobRef.current = null;
  };

  const processFile = useCallback(async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setErrorMsg("仅支持 JPEG 和 PNG 格式的图片");
      setStatus("error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("图片大小不能超过 5MB");
      setStatus("error");
      return;
    }

    const preview = URL.createObjectURL(file);
    setOriginalUrl(preview);
    setResultUrl(null);
    setErrorMsg("");
    setUsageHint("");
    setProcessingMeta(null);
    resultBlobRef.current = null;
    setStatus("processing");

    const fd = new FormData();
    fd.append("image", file);

    try {
      const token = getAuthToken();
      const response = await fetch("/api/process/", {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "处理失败，请重试" }));

        if (response.status === 401 && data.code === "LOGIN_REQUIRED") {
          setErrorMsg("游客仅支持体验 1 次，请先登录后继续使用。");
          setUsageHint("登录后可查看月额度、购买点数，并继续处理更多图片。");
        } else if (response.status === 429 && data.code === "QUOTA_EXCEEDED") {
          setErrorMsg("当前套餐额度已用完，请购买点数包或升级套餐后继续使用。");
          setUsageHint("你可以前往定价页购买点数包，或升级到更高套餐。");
        } else {
          setErrorMsg(data.error || data.message || "处理失败，请重试");
        }

        setStatus("error");
        return;
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = (await response.json()) as ProcessResponse;
        setProcessingMeta(data);
        setResultUrl(data.result_url);
        setUsageHint(sourceLabel(data.source_type));
        setStatus("done");
        return;
      }

      if (contentType.startsWith("image/")) {
        const blob = await response.blob();
        resultBlobRef.current = blob;
        const blobUrl = URL.createObjectURL(blob);
        setResultUrl(blobUrl);
        setUsageHint("处理完成，可直接预览并下载 PNG 结果。");
        setStatus("done");
        return;
      }

      setErrorMsg("返回结果格式异常，请稍后重试");
      setStatus("error");
    } catch {
      setErrorMsg("网络错误，请检查连接后重试");
      setStatus("error");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      let blob = resultBlobRef.current;
      if (!blob) {
        blob = await fetch(resultUrl).then((response) => response.blob());
        resultBlobRef.current = blob;
      }
      if (!blob) {
        throw new Error("empty blob");
      }
      const blobUrl = URL.createObjectURL(blob as Blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "removed-bg.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setErrorMsg("下载失败，请稍后重试");
      setStatus("error");
    }
  };

  const isProcessing = status === "processing" || status === "uploading";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col text-white">
      <ErrorBoundary fallback={<HeaderFallback />}>
        <SiteHeader />
        <UsageBanner />
      </ErrorBoundary>

      <div className="flex flex-col items-center px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            ✂️ 背景去除
          </h1>
          <p className="text-slate-400 text-base">
            上传图片，一键去除背景。网站版适合单张在线处理，不保存历史记录。
          </p>
        </div>

        {(status === "idle" || status === "error") ? (
          <div className="w-full max-w-xl flex flex-col gap-4">
            <div
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors
                ${isDragging ? "border-purple-400 bg-purple-900/20" : "border-slate-600 hover:border-purple-500 bg-slate-800/40"}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="text-5xl">🖼️</div>
              <p className="text-slate-300 text-lg font-medium">
                拖拽图片到这里，或点击上传
              </p>
              <p className="text-slate-500 text-sm">支持 JPEG、PNG，最大 5MB</p>
              {status === "error" && (
                <p className="text-red-300 text-sm bg-red-900/30 px-4 py-2 rounded-lg text-center">
                  ⚠️ {errorMsg}
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {usageHint && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                {usageHint}
                {(errorMsg.includes("登录") || errorMsg.includes("额度")) && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {!getAuthToken() && (
                      <a
                        href={getLoginUrl()}
                        className="rounded-xl bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 transition-colors"
                      >
                        立即登录
                      </a>
                    )}
                    <a
                      href="/pricing"
                      className="rounded-xl bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700 transition-colors"
                    >
                      查看定价
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {isProcessing && (
          <div className="w-full max-w-xl flex flex-col items-center gap-6">
            {originalUrl && (
              <div className="relative w-full rounded-2xl overflow-hidden bg-slate-800">
                <Image
                  src={originalUrl}
                  alt="原图"
                  width={600}
                  height={400}
                  className="w-full object-contain max-h-72 opacity-50"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-white font-medium text-sm">正在去除背景…</p>
                </div>
              </div>
            )}
          </div>
        )}

        {status === "done" && originalUrl && resultUrl && (
          <div className="w-full max-w-3xl flex flex-col gap-6">
            {usageHint && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
                {usageHint}
                {processingMeta && (
                  <span className="ml-2 text-emerald-200/80">
                    · 处理耗时 {processingMeta.processing_time_ms} ms
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-slate-400 text-sm text-center">原图</p>
                <div className="rounded-2xl overflow-hidden bg-slate-800">
                  <Image
                    src={originalUrl}
                    alt="原图"
                    width={600}
                    height={400}
                    className="w-full object-contain max-h-64"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-slate-400 text-sm text-center">去背景后</p>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%) 0 0 / 20px 20px",
                  }}
                >
                  <Image
                    src={resultUrl}
                    alt="去背景结果"
                    width={600}
                    height={400}
                    className="w-full object-contain max-h-64"
                    unoptimized
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
              >
                ⬇️ 下载 PNG
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                🔄 处理新图片
              </button>
              <a
                href="/dashboard"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors text-center"
              >
                查看我的用量
              </a>
            </div>
          </div>
        )}

        <p className="mt-16 text-slate-600 text-xs text-center">
          Powered by Remove.bg · 当前网站版适合单张在线处理，批量处理将由后续桌面软件提供
        </p>
      </div>
    </main>
  );
}
