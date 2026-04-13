"use client";

import { useEffect } from "react";

const RECOVERY_FLAG = "build_recovery_attempted";

function shouldRecover(message: string) {
  return [
    "chunkloaderror",
    "loading chunk",
    "failed to fetch dynamically imported module",
    "importing a module script failed",
    "loading css chunk",
    "failed to load script",
  ].some((keyword) => message.toLowerCase().includes(keyword));
}

function recoverOnce() {
  if (typeof window === "undefined") return;

  try {
    const attempted = window.sessionStorage.getItem(RECOVERY_FLAG);
    if (attempted === "1") return;
    window.sessionStorage.setItem(RECOVERY_FLAG, "1");
  } catch {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));

  if (typeof window.caches !== "undefined") {
    window.caches.keys()
      .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
      .catch(() => undefined)
      .finally(() => {
        window.location.replace(url.toString());
      });
    return;
  }

  window.location.replace(url.toString());
}

export function BuildRecovery() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("_r")) {
        url.searchParams.delete("_r");
        window.history.replaceState({}, "", url.toString());
      } else {
        window.sessionStorage.removeItem(RECOVERY_FLAG);
      }
    } catch {
      // ignore
    }

    const onError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || "";
      if (shouldRecover(message)) {
        recoverOnce();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === "string"
        ? reason
        : reason?.message || "";

      if (shouldRecover(message)) {
        recoverOnce();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
