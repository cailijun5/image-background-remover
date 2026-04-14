export const runtime = "edge";

export async function POST(request: Request) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    return Response.json({ error: "NEXT_PUBLIC_API_BASE_URL 未配置" }, { status: 500 });
  }

  const formData = await request.formData();
  const authHeader = request.headers.get("authorization");

  const response = await fetch(`${apiBase}/api/process`, {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : undefined,
    body: formData,
  });

  const contentType = response.headers.get("content-type") || "application/json";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return Response.json(data, { status: response.status });
  }

  const blob = await response.blob();
  return new Response(blob, {
    status: response.status,
    headers: {
      "content-type": contentType,
    },
  });
}
