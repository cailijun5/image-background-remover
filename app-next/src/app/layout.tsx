import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "背景去除 - 一键去除图片背景",
  description: "上传图片，自动去除背景，免费下载透明 PNG",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
