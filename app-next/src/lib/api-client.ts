"use client";

import { clearAuthToken, getAuthToken } from "./auth-client";
import { withApi } from "./config";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(withApi(path), {
      ...init,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    throw new Error(message || "网络请求失败");
  }

  if (response.status === 401) {
    clearAuthToken();
  }

  const contentType = response.headers.get("content-type") || "";
  let data: unknown = null;

  try {
    data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data
      ? String((data as { error?: unknown }).error)
      : typeof data === "string"
        ? data
        : `请求失败 (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: BodyInit | object, init?: RequestInit) => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const headers = new Headers(init?.headers || {});
    let payload: BodyInit | undefined;

    if (body && !isFormData && typeof body === "object") {
      headers.set("Content-Type", "application/json");
      payload = JSON.stringify(body);
    } else {
      payload = body as BodyInit | undefined;
    }

    return request<T>(path, {
      method: "POST",
      ...init,
      headers,
      body: payload,
    });
  },
};
