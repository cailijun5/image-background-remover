import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

export async function POST(req: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "服务未配置，请联系管理员设置 API Key" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file) {
    return NextResponse.json({ error: "请上传图片文件" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "仅支持 JPEG 和 PNG 格式的图片" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "图片大小不能超过 5MB" },
      { status: 400 }
    );
  }

  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type });

  const rbFormData = new FormData();
  rbFormData.append("image_file", blob, file.name);
  rbFormData.append("size", "auto");

  let rbRes: Response;
  try {
    rbRes = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: rbFormData,
    });
  } catch {
    return NextResponse.json(
      { error: "网络请求失败，请稍后重试" },
      { status: 502 }
    );
  }

  if (!rbRes.ok) {
    if (rbRes.status === 402) {
      return NextResponse.json(
        { error: "API 配额已用尽，请稍后再试" },
        { status: 402 }
      );
    }
    const errText = await rbRes.text().catch(() => "");
    console.error("remove.bg error:", rbRes.status, errText);
    return NextResponse.json(
      { error: "背景去除失败，请重试" },
      { status: 500 }
    );
  }

  const resultBuf = await rbRes.arrayBuffer();
  return new NextResponse(resultBuf, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="removed-bg.png"',
    },
  });
}
