"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "../lib/api-client";
import { clearAuthToken, consumeTokenFromUrl, getAuthToken } from "../lib/auth-client";
import { APP_NAME, getLoginUrl, getLogoutUrl } from "../lib/config";

interface MeResponse {
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
    avatar_url?: string | null;
    plan?: string;
  };
}

export function SiteHeader() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeResponse["user"] | null>(null);

  useEffect(() => {
    consumeTokenFromUrl();
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apiClient.get<MeResponse>("/api/auth/me")
      .then((data) => {
        if (data?.user && (data.user.email || data.user.name || data.user.id)) {
          setUser(data.user);
          return;
        }
        clearAuthToken();
        setUser(null);
      })
      .catch(() => {
        clearAuthToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    try {
      await fetch(getLogoutUrl(), {
        method: "POST",
        headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : undefined,
      });
    } catch {
      // ignore
    }
    clearAuthToken();
    window.location.href = "/";
  }

  const displayName = user?.name || user?.email || "已登录用户";

  return (
    <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-4">
      <Link href="/" className="text-white font-semibold text-lg tracking-tight">
        {APP_NAME}
      </Link>

      <nav className="flex items-center gap-3 text-sm flex-wrap justify-end">
        <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">
          定价
        </Link>
        <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
          用户中心
        </Link>
        <Link href="/payment-debug" className="text-slate-300 hover:text-white transition-colors">
          支付调试
        </Link>

        {loading ? (
          <span className="text-slate-500">加载中...</span>
        ) : user ? (
          <>
            <span className="hidden sm:inline text-slate-300">
              {displayName}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-slate-800 px-4 py-2 text-white hover:bg-slate-700 transition-colors"
            >
              退出登录
            </button>
          </>
        ) : (
          <a
            href={getLoginUrl()}
            className="rounded-xl bg-purple-600 px-4 py-2 text-white hover:bg-purple-500 transition-colors"
          >
            登录
          </a>
        )}
      </nav>
    </header>
  );
}
