"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken } from "../../../../lib/auth-client";
import { getApiBaseUrl } from "../../../../lib/config";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (token) {
      setAuthToken(token);
      const redirectTo = url.searchParams.get("redirect_to");
      const nextPath = redirectTo
        ? decodeURIComponent(redirectTo)
        : "/dashboard/";
      router.replace(nextPath);
      return;
    }

    if (!code || !state) {
      setError("登录参数缺失，请重新发起登录。");
      return;
    }

    const apiBase = getApiBaseUrl();
    const redirectTarget = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const workerCallback = `${apiBase}/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&redirect_to=${encodeURIComponent(redirectTarget)}`;
    window.location.replace(workerCallback);
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-bold">正在完成登录…</h1>
        {!error ? (
          <p className="mt-4 text-slate-300">请稍候，我们正在验证你的 Google 账户并跳转回网站。</p>
        ) : (
          <>
            <p className="mt-4 text-red-300">{error}</p>
            <a href="/" className="mt-6 inline-flex rounded-xl bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 transition-colors">返回首页</a>
          </>
        )}
      </div>
    </main>
  );
}
