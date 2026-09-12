import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PressureCoach · AI 压力面试教练",
  description:
    "在正式面试前,让 AI 模拟一次真实高压面试,找到你的失分点,并训练你在压力下稳定表达。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
