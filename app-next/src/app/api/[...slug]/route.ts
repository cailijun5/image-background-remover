export const runtime = "edge";

function buildHeaders(request: Request) {
  const authHeader = request.headers.get("authorization");
  const headers: Record<string, string> = {};
  if (authHeader) headers.Authorization = authHeader;
  return headers;
}

function normalizePath(slug: string[]) {
  const joined = slug.join("/");
  if (joined === "auth/google" || joined === "auth/callback") {
    return `/api/${joined}`;
  }
  return `/api/${joined}`;
}

async function proxy(request: Request, path: string, method: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) {
    return Response.json({ error: "NEXT_PUBLIC_API_BASE_URL 未配置" }, { status: 500 });
  }

  const init: RequestInit = {
    method,
    headers: buildHeaders(request),
    redirect: "manual",
  };

  if (method !== "GET") {
    const contentType = request.headers.get("content-type") || "application/json";
    if (contentType) {
      (init.headers as Record<string, string>)["Content-Type"] = contentType;
    }
    init.body = await request.text();
  }

  const response = await fetch(`${apiBase}${path}`, init);
  const contentType = response.headers.get("content-type") || "application/json";
  const location = response.headers.get("location");

  if (location) {
    return new Response(null, {
      status: response.status,
      headers: { location },
    });
  }

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return Response.json(data, { status: response.status });
  }

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "content-type": contentType },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  const query = new URL(request.url).search;
  return proxy(request, `${normalizePath(slug)}${query}`, "GET");
}

export async function POST(request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return proxy(request, normalizePath(slug), "POST");
}
