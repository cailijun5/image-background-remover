export const APP_NAME = "Image Background Remover";

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "";
}

export function getLoginUrl(redirectTo?: string) {
  const base = getApiBaseUrl();
  const target = redirectTo || (typeof window !== "undefined" ? window.location.href : "/");
  return `${base}/api/auth/google?redirect_to=${encodeURIComponent(target)}`;
}

export function getLogoutUrl() {
  return `${getApiBaseUrl()}/api/auth/logout`;
}

export function withApi(path: string) {
  const base = getApiBaseUrl();
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}
