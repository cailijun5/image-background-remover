"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultBlobRef = useRef<Blob | null>(null);

  const reset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setOriginalUrl(null);
    setResultUrl(null);
    setErrorMsg("");
    setStatus("idle");
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
    setStatus("processing");

    const fd = new FormData();
    fd.append("image", file);

    try {
      const res = await fetch("/api/remove-bg", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "处理失败，请重试" }));
        setErrorMsg(data.error || "处理失败，请重试");
        setStatus("error");
        return;
      }
      const blob = await res.blob();
      resultBlobRef.current = blob;
      setResultUrl(URL.createObjectURL(blob));
      setStatus("done");
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

  const handleDownload = () => {
    if (!resultBlobRef.current) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(resultBlobRef.current);
    a.download = "removed-bg.png";
    a.click();
  };

  const isProcessing = status === "processing" || status === "uploading";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          ✂️ 背景去除
        </h1>
        <p className="text-slate-400 text-base">
          上传图片，一键去除背景，免费下载透明 PNG
        </p>
      </div>

      {/* Upload Zone */}
      {status === "idle" || status === "error" ? (
        <div
          className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors
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
            <p className="text-red-400 text-sm bg-red-900/30 px-4 py-2 rounded-lg">
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
      ) : null}

      {/* Processing State */}
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

      {/* Result */}
      {status === "done" && originalUrl && resultUrl && (
        <div className="w-full max-w-3xl flex flex-col gap-6">
          {/* Before / After */}
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
                />
              </div>
            </div>
          </div>

          {/* Actions */}
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
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-16 text-slate-600 text-xs">
        Powered by Remove.bg · 图片仅在内存中处理，不会被存储
      </p>
    </main>
  );
}
