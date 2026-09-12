import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "稳面 · AI 压力面试教练",
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
      <body className="min-h-screen">
        {/* 禅圆开场 */}
        <div className="preloader" aria-hidden>
          <svg height="200" viewBox="0 0 200 200" width="200" style={{ transform: "rotate(-15deg)" }}>
            <path
              className="enso-path"
              d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0"
              fill="none"
              stroke="#d41111"
              strokeLinecap="round"
              strokeWidth="7"
              style={{ filter: "blur(0.6px)" }}
            />
          </svg>
        </div>
        {/* 纸纹肌理 */}
        <div className="texture-overlay" aria-hidden />
        {children}
      </body>
    </html>
  );
}
