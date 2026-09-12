"use client";

import { useEffect, useRef, useState } from "react";
import { MODES, PERSONAS, SCENARIOS, Session } from "@/lib/types";
import { levelName } from "@/lib/analysis";
import { EMERGENCY_TIPS } from "@/lib/emergency";

interface Props {
  sessions: Session[];
  onStart: () => void;
  onViewSession: (s: Session) => void;
}

function fmtTime(at: number): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 滚动显隐 */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    el.querySelectorAll(".reveal").forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);
  return ref;
}

/** 逐字入场标题 */
function CharTitle({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="char-in" style={{ animationDelay: `${delay + i * 0.05}s` }}>
          {ch}
        </span>
      ))}
    </>
  );
}

/** 六维雷达(禅圆内嵌)——hero 主视觉 */
function HeroEnso() {
  const labels = ["稳定", "逻辑", "反应", "恢复", "深度", "节奏"];
  const values = [78, 62, 51, 58, 71, 66];
  const cx = 150, cy = 150, R = 96;
  const pt = (i: number, r: number) => {
    const ang = ((-90 + (i * 360) / 6) * Math.PI) / 180;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)] as const;
  };
  const poly = (r: number) =>
    Array.from({ length: 6 }, (_, i) => pt(i, r).join(",")).join(" ");
  const valuePts = values
    .map((v, i) => pt(i, (R * v) / 100).join(","))
    .join(" ");
  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" role="img" aria-label="六维能力图">
      {/* 禅圆 */}
      <path
        className="enso-path"
        d="M 150, 150 m -118, 0 a 118,118 0 1,0 236,0 a 118,118 0 1,0 -236,0"
        fill="none"
        stroke="#d41111"
        strokeLinecap="round"
        strokeWidth="3"
        style={{ filter: "blur(0.4px)" }}
      />
      {/* 雷达网格 + 数值多边形 */}
      <g opacity="0.85">
        {[1 / 3, 2 / 3, 1].map((f) => (
          <polygon key={f} points={poly(R * f)} fill="none" stroke="#d6d3d1" strokeWidth="1" />
        ))}
        {Array.from({ length: 6 }, (_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#d6d3d1" strokeWidth="1" />;
        })}
        <polygon points={valuePts} fill="rgba(212,17,17,0.10)" stroke="#d41111" strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => {
          const [x, y] = pt(i, (R * v) / 100);
          return <circle key={i} cx={x} cy={y} r="3.5" fill="#d41111" />;
        })}
        {labels.map((l, i) => {
          const [x, y] = pt(i, R + 24);
          const anchor = Math.abs(x - cx) < 20 ? "middle" : x > cx ? "start" : "end";
          return (
            <text key={i} x={x} y={y + 4} textAnchor={anchor} fontSize="13" fill="#44403c">
              {l}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

/** 迷你压力曲线(gallery 用) */
function MiniCurve() {
  const data = [22, 34, 58, 76, 63, 88];
  const W = 260, H = 120, PX = 20, PT = 14, PB = 20;
  const x = (i: number) => PX + (i * (W - PX * 2)) / (data.length - 1);
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / 100);
  const pts = data.map((d, i) => `${x(i)},${y(d)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="压力曲线">
      {[25, 50, 75].map((v) => (
        <line key={v} x1={PX} x2={W - PX} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeDasharray="3 4" strokeWidth="1" />
      ))}
      <polyline points={pts} fill="none" stroke="#d41111" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d)} r="3" fill={i === 5 ? "#d41111" : "#ffffff"} stroke="#d41111" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/** 迷你对话(gallery 用) */
function MiniChat() {
  return (
    <div className="flex h-full flex-col gap-2 p-5 text-left">
      <div className="max-w-[80%] rounded-sm border border-[#e7e5e4] bg-white px-3 py-2 text-xs">
        你说这个项目带来了 30% 的增长——数据口径是什么?
      </div>
      <div className="ml-auto max-w-[80%] rounded-sm border border-[#d41111]/20 bg-[#d41111]/5 px-3 py-2 text-xs">
        增长来自 A/B 实验组对比,留存提升 31.2%,p&lt;0.01…
      </div>
      <div className="mt-auto flex items-center gap-2 border border-[#e7e5e4] bg-white px-3 py-2 text-xs text-[#78716c]">
        输入你的回答
        <span className="ml-auto border border-[#e7e5e4] px-2 py-0.5 text-[10px]">第 4/6 轮</span>
      </div>
    </div>
  );
}

/** 迷你报告(gallery 用) */
function MiniReport() {
  const labels = ["稳", "逻", "反", "复", "深", "节"];
  const values = [78, 62, 51, 58, 71, 66];
  const cx = 70, cy = 70, R = 48;
  const pt = (i: number, r: number) => {
    const ang = ((-90 + (i * 360) / 6) * Math.PI) / 180;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)] as const;
  };
  const poly = (r: number) =>
    Array.from({ length: 6 }, (_, i) => pt(i, r).join(",")).join(" ");
  return (
    <div className="flex h-full items-center gap-4 p-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0">
        {[1 / 3, 2 / 3, 1].map((f) => (
          <polygon key={f} points={poly(R * f)} fill="none" stroke="#e7e5e4" strokeWidth="1" />
        ))}
        {Array.from({ length: 6 }, (_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e7e5e4" strokeWidth="1" />;
        })}
        <polygon
          points={values.map((v, i) => pt(i, (R * v) / 100).join(",")).join(" ")}
          fill="rgba(212,17,17,0.12)"
          stroke="#d41111"
          strokeWidth="1.5"
        />
        {labels.map((l, i) => {
          const [x, y] = pt(i, R + 13);
          return (
            <text key={i} x={x} y={y + 3} fontSize="9" fill="#44403c" textAnchor="middle">
              {l}
            </text>
          );
        })}
      </svg>
      <div className="space-y-2 text-left">
        <div className="text-2xl font-bold text-[#1c1917]">64</div>
        <div className="text-xs leading-relaxed text-[#78716c]">
          最弱维度:反应速度
          <br />
          优先训练:打断接龙
        </div>
      </div>
    </div>
  );
}

/** 画廊卡片 */
function GalleryCard({
  title,
  desc,
  wide,
  tall,
  children,
  onClick,
  clip,
}: {
  title: string;
  desc: string;
  wide?: boolean;
  tall?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  clip: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`gallery-card bg-[#e7e5e4] ${clip} ${tall ? "row-span-2" : ""} ${
        wide ? "md:col-span-2" : ""
      } min-h-[220px]`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
      <div className="item-overlay">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-1 text-sm text-[#d6d3d1]">{desc}</p>
      </div>
    </div>
  );
}

export function Home({ sessions, onStart, onViewSession }: Props) {
  const [openTip, setOpenTip] = useState<number | null>(0);
  const revealRef = useReveal();

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const navItems = [
    { label: "面试舱", action: () => onStart() },
    { label: "理念", action: () => scrollTo("philosophy") },
    { label: "作品", action: () => scrollTo("gallery") },
    { label: "锦囊", action: () => scrollTo("tips") },
    { label: "历史", action: () => scrollTo("history") },
  ];

  return (
    <div ref={revealRef} className="min-h-screen">
      {/* 竖排导航(桌面) */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-24 flex-col items-center border-r border-[#e7e5e4] bg-[#f8f6f6]/90 py-10 backdrop-blur-sm md:flex">
        <button
          onClick={onStart}
          className="flex h-14 w-14 items-center justify-center bg-[#d41111] text-lg font-bold text-white transition-transform duration-300 hover:rotate-3 hover:scale-95"
          aria-label="压力面"
        >
          压
        </button>
        <nav className="mt-auto mb-auto flex flex-col items-center gap-10" style={{ writingMode: "vertical-rl" }}>
          {navItems.map((n) => (
            <button key={n.label} onClick={n.action} className="nav-item text-xs tracking-[0.2em] text-[#44403c]">
              {n.label}
              <span className="nav-indicator" />
            </button>
          ))}
        </nav>
        <div className="stamp">
          <div className="stamp-inner">面 试 之 修</div>
        </div>
      </aside>

      {/* 移动顶栏 */}
      <div className="fixed top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#e7e5e4] bg-[#f8f6f6]/95 px-6 backdrop-blur-sm md:hidden">
        <button onClick={onStart} className="flex h-10 w-10 items-center justify-center bg-[#d41111] text-sm font-bold text-white">
          压
        </button>
        <span className="text-sm font-bold tracking-[0.2em] text-[#1c1917]">压力面</span>
        <button onClick={onStart} className="btn-primary !px-4 !py-1.5 !text-xs">
          开始
        </button>
      </div>

      <main className="md:ml-24">
        {/* Hero */}
        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20 md:flex-row md:px-14">
          <div className="hero-deco absolute top-0 right-0 hidden h-full w-1/2 opacity-50 lg:block" />
          <div className="flex w-full max-w-7xl flex-col items-center gap-12 lg:flex-row lg:items-start lg:justify-between">
            {/* 文案 */}
            <div className="flex flex-col items-center gap-8 lg:items-start">
              <div className="hidden flex-col items-center gap-6 lg:flex" style={{ writingMode: "vertical-rl" }}>
                <h1 className="text-6xl font-bold leading-tight tracking-[0.12em] text-[#1c1917]" style={{ fontFamily: "var(--font-display)" }}>
                  <CharTitle text="表达的金缮" />
                </h1>
                <p className="mt-6 text-sm font-light tracking-[0.3em] text-[#78716c]">
                  在失分里,找到修复的路径
                </p>
              </div>
              <div className="flex flex-col items-center gap-6 text-center lg:hidden">
                <h1 className="text-5xl font-bold leading-tight tracking-[0.08em] text-[#1c1917]" style={{ fontFamily: "var(--font-display)" }}>
                  <CharTitle text="表达的金缮" />
                </h1>
                <p className="text-sm font-light tracking-[0.3em] text-[#78716c]">
                  在失分里,找到修复的路径
                </p>
              </div>
              <p className="max-w-md text-center text-base leading-loose text-[#44403c] lg:text-left">
                面试前,让 AI 模拟一场真实的高压面试。每一次卡顿、每一处语塞,
                都被当作待修复的裂痕——训练不是追求无懈可击,而是在压力之下,依然保持自己的表达。
              </p>
              <button onClick={onStart} className="btn-primary text-base">
                进入面试舱
              </button>
              <p className="time-tag">六轮追问 · 约八分钟 · 无需注册</p>
            </div>
            {/* 主视觉:禅圆内嵌六维雷达 */}
            <div className="w-full max-w-md lg:w-[46%]">
              <div className="clip-rough-1 aspect-square bg-[#f4f1ee] p-4">
                <HeroEnso />
              </div>
            </div>
          </div>
          <div className="scroll-indicator">
            <span className="text-xs tracking-[0.3em] text-[#78716c]">Scroll</span>
            <span className="text-sm text-[#d41111]">↓</span>
          </div>
        </section>

        {/* 理念 */}
        <section id="philosophy" className="reveal relative flex min-h-[60vh] items-center justify-center bg-white px-6 py-28">
          <div className="reveal relative z-10 flex max-w-2xl flex-col items-center gap-10 text-center">
            <h2 className="text-2xl font-normal leading-relaxed text-[#1c1917] md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              我们把每一次卡顿、每一处语塞,当作待修复的裂痕。
              压力面试中崩掉的那句话,恰恰是下一次训练的开始。
            </h2>
            <div className="h-px w-16 bg-[#d41111]" />
            <p className="max-w-md text-sm leading-loose text-[#78716c]">
              以金缮之心面对面试——裂缝不是瑕疵,是被光照进来的地方。
            </p>
          </div>
          <div className="pointer-events-none absolute left-10 top-14 select-none text-[180px] font-bold leading-none text-[#fafaf9]">
            修
          </div>
        </section>

        {/* 作品:产品画廊 */}
        <section id="gallery" className="reveal bg-[#f4f1ee] px-6 py-24 md:px-14">
          <div className="mx-auto max-w-7xl">
            <div className="reveal flex flex-col gap-4 border-b border-[#d6d3d1] pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="text-xs font-bold tracking-[0.25em] text-[#d41111]">THE STUDIO</span>
                <h2 className="mt-2 text-4xl font-medium text-[#1c1917]" style={{ fontFamily: "var(--font-display)" }}>
                  六件作品
                </h2>
              </div>
              <button onClick={onStart} className="group flex items-center gap-2 text-sm font-bold tracking-[0.1em] text-[#78716c] transition-colors hover:text-[#d41111]">
                全部体验
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3" style={{ gridAutoRows: "220px" }}>
              <GalleryCard title="面试舱" desc="六轮动态追问,实时突发干预" onClick={onStart} clip="clip-rough-1" wide>
                <MiniChat />
              </GalleryCard>
              <GalleryCard title="六维报告" desc="稳定 · 逻辑 · 反应 · 恢复 · 深度 · 节奏" onClick={onStart} clip="clip-rough-2" tall>
                <MiniReport />
              </GalleryCard>
              <GalleryCard title="压力曲线" desc="逐轮压力指数,定位被击穿的那一轮" onClick={onStart} clip="clip-rough-3">
                <div className="h-full p-4"><MiniCurve /></div>
              </GalleryCard>
              <GalleryCard title="四位面试官" desc="温和 · 专业 · 施压 · 深挖,按需切换" onClick={onStart} clip="clip-rough-2">
                <div className="flex h-full flex-wrap items-center justify-center gap-3 p-6">
                  {(Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]).map((k) => (
                    <div key={k} className="stamp">
                      <div className="stamp-inner !text-sm">{PERSONAS[k].name.slice(0, 2)}</div>
                    </div>
                  ))}
                </div>
              </GalleryCard>
              <GalleryCard title="应急锦囊" desc="被问到不会的问题,怎么办" onClick={() => scrollTo("tips")} clip="clip-rough-1">
                <div className="flex h-full flex-col justify-center gap-2 p-6 text-sm text-[#44403c]">
                  <div>不会的题 → 划边界 · 迁移 · 给框架</div>
                  <div>被质疑 → 先认同,再区分口径</div>
                  <div>突然换题 → 一句话收尾,干净接新</div>
                </div>
              </GalleryCard>
              <GalleryCard title="训练历史" desc="每次体检都有迹可循,可回放" onClick={() => scrollTo("history")} clip="clip-rough-3">
                <div className="flex h-full flex-col justify-center gap-2 p-6">
                  {sessions.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center justify-between border-b border-[#e7e5e4] pb-1 text-xs">
                      <span className="text-[#1c1917]">
                        {SCENARIOS[s.scenario].name} · {MODES[s.mode].name}
                      </span>
                      <span className="font-bold text-[#d41111]">{s.report.overall}</span>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-xs text-[#78716c]">尚无记录——从第一场面试开始。</div>
                  )}
                </div>
              </GalleryCard>
            </div>
          </div>
        </section>

        {/* 应急锦囊(可展开) */}
        <section id="tips" className="reveal px-6 py-24 md:px-14">
          <div className="mx-auto max-w-4xl">
            <div className="reveal">
              <span className="text-xs font-bold tracking-[0.25em] text-[#d41111]">EMERGENCY</span>
              <h2 className="mt-2 text-4xl font-medium text-[#1c1917]" style={{ fontFamily: "var(--font-display)" }}>
                应急锦囊
              </h2>
              <p className="mt-3 text-sm text-[#78716c]">突发状况的应对——点开任意一条。</p>
            </div>
            <div className="mt-10 space-y-3">
              {EMERGENCY_TIPS.map((t, i) => {
                const open = openTip === i;
                return (
                  <div key={t.situation} className={`reveal card ${open ? "tip-open" : ""}`}>
                    <button
                      onClick={() => setOpenTip(open ? null : i)}
                      className="flex w-full items-center gap-4 p-5 text-left"
                    >
                      <span className="font-bold text-[#d41111]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex-1 font-medium text-[#1c1917]">{t.situation}</span>
                      <span className="tip-caret">+</span>
                    </button>
                    <div className="tip-panel">
                      <div className="px-5 pb-5 pl-13 text-sm leading-loose text-[#44403c]" style={{ paddingLeft: "3.25rem" }}>
                        {t.action}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 训练历史 */}
        <section id="history" className="reveal bg-white px-6 py-24 md:px-14">
          <div className="mx-auto max-w-4xl">
            <div className="reveal flex items-end justify-between border-b border-[#e7e5e4] pb-6">
              <div>
                <span className="text-xs font-bold tracking-[0.25em] text-[#d41111]">ARCHIVE</span>
                <h2 className="mt-2 text-4xl font-medium text-[#1c1917]" style={{ fontFamily: "var(--font-display)" }}>
                  训练历史
                </h2>
              </div>
              <button onClick={onStart} className="text-sm font-bold tracking-[0.1em] text-[#78716c] transition-colors hover:text-[#d41111]">
                再来一场 →
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="mt-10 text-sm text-[#78716c]">
                还没有训练记录——跑完六轮,第一份体检报告会出现在这里。
              </p>
            ) : (
              <div className="mt-6 space-y-2">
                {sessions.slice(0, 6).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onViewSession(s)}
                    className="card card-hover flex w-full items-center gap-4 p-4 text-left"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center text-sm font-bold ${
                        s.report.overall >= 70
                          ? "bg-[#d41111]/10 text-[#d41111]"
                          : s.report.overall >= 55
                          ? "bg-[#a16207]/10 text-[#a16207]"
                          : "bg-[#d41111] text-white"
                      }`}
                    >
                      {s.report.overall}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#1c1917]">
                        {SCENARIOS[s.scenario].name}
                        <span className="ml-2 font-normal text-[#78716c]">{MODES[s.mode].name}</span>
                        {s.persona && (
                          <span className="ml-2 font-normal text-[#78716c]">{PERSONAS[s.persona].name}</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs tracking-wide text-[#78716c]">
                        {fmtTime(s.at)} · {levelName(s.report.overall)}
                        {!s.usedAI && <span className="ml-2">(演示模式)</span>}
                      </div>
                    </div>
                    <span className="chip shrink-0">六轮 · 八分钟</span>
                    <span className="text-sm text-[#d41111]">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 页脚 */}
        <footer className="border-t border-[#e7e5e4] bg-[#fafaf9] px-6 py-14 md:px-14">
          <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-[#d41111] text-xs font-bold text-white">压</div>
              <span className="text-sm font-bold tracking-[0.15em] text-[#1c1917]">压力面 · PRESSURE COACH</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[#78716c]">
              修复压力下的表达,庆祝每一次卡顿带来的进步。十六小时项目挑战作品。
            </p>
            <div className="flex flex-col gap-1 text-sm text-[#78716c]">
              <span className="font-bold tracking-[0.1em] text-[#1c1917]">训练</span>
              <button onClick={onStart} className="text-left transition-colors hover:text-[#d41111]">面试舱</button>
              <button onClick={() => scrollTo("tips")} className="text-left transition-colors hover:text-[#d41111]">应急锦囊</button>
            </div>
          </div>
          <div className="mx-auto mt-14 flex max-w-7xl items-center justify-between border-t border-[#e7e5e4] pt-6 text-xs text-[#a8a29e]">
            <p>压力面 · 表达的金缮</p>
            <p>数据仅保存在你的浏览器本地,不会上传。</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
