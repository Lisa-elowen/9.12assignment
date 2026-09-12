"use client";

import React from "react";
import { MODES, Mode, Report as ReportData, SCENARIOS, Scenario, Turn } from "@/lib/types";
import { levelName } from "@/lib/analysis";
import { PressureChart } from "./PressureChart";

interface Props {
  scenario: Scenario;
  mode: Mode;
  turns: Turn[];
  report: ReportData;
  usedAI: boolean;
  onRestart: () => void;
  onHome: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "#34d399" : score >= 55 ? "#fbbf24" : "#f43f5e";
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#262d3f" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-[#8b93a7]">综合表现</span>
      </div>
    </div>
  );
}

function MetricRow({
  name,
  score,
  comment,
}: {
  name: string;
  score: number;
  comment: string;
}) {
  const color = score >= 75 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-lg font-bold">{score}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#262d3f]">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-[#8b93a7]">{comment}</div>
    </div>
  );
}

function highlightFillers(text: string, fillers: string[]): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  for (const f of fillers) {
    const idx = rest.indexOf(f);
    if (idx === -1) continue;
    if (idx > 0) parts.push(<React.Fragment key={key++}>{rest.slice(0, idx)}</React.Fragment>);
    parts.push(
      <span key={key++} className="filler-hl">
        {f}
      </span>
    );
    rest = rest.slice(idx + f.length);
  }
  if (rest) parts.push(<React.Fragment key={key++}>{rest}</React.Fragment>);
  return parts;
}

export function Report({ scenario, mode, turns, report, usedAI, onRestart, onHome }: Props) {
  const sc = SCENARIOS[scenario];
  const md = MODES[mode];
  const level = levelName(report.overall);

  const comments: Record<string, string> = {
    stability:
      report.stability >= 80
        ? "全程输出稳定,语言信号干净"
        : report.stability >= 65
        ? "前段稳定,追问后期出现波动"
        : "压力下表达退化明显,模糊词激增",
    logic:
      report.logic >= 80
        ? "逻辑组织清晰,结论先行"
        : report.logic >= 65
        ? "结构基本完整,偶有松散"
        : "面对质疑时逻辑丢失,回答失焦",
    recovery:
      report.recovery >= 80
        ? "恢复能力强,被打断后能迅速稳住"
        : report.recovery >= 65
        ? "可以恢复,但需要明显的时间"
        : "一旦被挑战,难以回到正轨",
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <header className="flex items-center justify-between py-6">
        <button onClick={onHome} className="btn-ghost px-3 py-1.5 text-sm">
          ← 首页
        </button>
        <span className="text-sm text-[#5b6275]">面试体检报告</span>
      </header>

      {!usedAI && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
          演示模式(未接入 AI):题目来自内置脚本,评分来自语言分析引擎。
        </div>
      )}

      {/* 总览 */}
      <section className="card flex flex-col items-center gap-5 p-6 md:flex-row md:justify-between">
        <div className="fade-up flex items-center gap-5">
          <ScoreRing score={report.overall} />
          <div>
            <div className="text-lg font-bold">
              {sc.icon} {sc.name}
              <span className="ml-2 text-sm font-normal text-[#8b93a7]">{md.name}</span>
            </div>
            <div className="mt-1 text-sm text-[#8b93a7]">
              等级:<span className="font-semibold text-[#e6e8ee]">{level}</span>
            </div>
            <div className="mt-1 text-sm text-[#8b93a7]">
              {turns.length} 轮问答 ·{" "}
              {turns.reduce((s, t) => s + t.durationSec, 0).toFixed(0)} 秒
              {turns.some((t) => t.timedOut) && (
                <span className="ml-1 text-rose-400">
                  · {turns.filter((t) => t.timedOut).length} 轮超时
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="w-full text-center md:w-56 md:text-left">
          <div className="text-xs text-[#5b6275]">核心结论</div>
          <div className="mt-1 text-sm leading-relaxed text-[#e6e8ee]">
            {report.trigger
              ? `你的问题不是不会,而是「${report.trigger.label}」时在持续压力下无法保持输出。`
              : "整体表现稳定,可以挑战更高压的训练模式。"}
          </div>
        </div>
      </section>

      {/* 三维能力 */}
      <section className="mt-4 grid grid-cols-1 gap-3">
        <div className="fade-up" style={{ animationDelay: "0.1s" }}>
          <MetricRow name="① 表达稳定性" score={report.stability} comment={comments.stability} />
        </div>
        <div className="fade-up" style={{ animationDelay: "0.2s" }}>
          <MetricRow name="② 逻辑组织能力" score={report.logic} comment={comments.logic} />
        </div>
        <div className="fade-up" style={{ animationDelay: "0.3s" }}>
          <MetricRow name="③ 压力恢复能力" score={report.recovery} comment={comments.recovery} />
        </div>
      </section>

      {/* 压力曲线 */}
      <section className="card fade-up mt-4 p-5" style={{ animationDelay: "0.4s" }}>
        <h3 className="text-sm font-bold">📈 压力曲线</h3>
        <p className="mt-1 text-xs text-[#8b93a7]">
          基于模糊词密度、回答长度变化与追问强度计算,峰值即你的压力触发点。
        </p>
        <div className="mt-3">
          <PressureChart data={report.curve} />
        </div>
      </section>

      {/* 触发点 */}
      {report.trigger && (
        <section className="card fade-up mt-4 border-rose-500/30 p-5" style={{ animationDelay: "0.5s" }}>
          <h3 className="text-sm font-bold text-rose-400">⚠️ 压力触发点</h3>
          <p className="mt-2 text-sm leading-relaxed">
            {report.trigger.detail}
          </p>
        </section>
      )}

      {/* 崩溃点 */}
      {report.crashQuote && (
        <section className="card fade-up mt-4 p-5" style={{ animationDelay: "0.6s" }}>
          <h3 className="text-sm font-bold">💥 崩溃点回放</h3>
          <p className="mt-1 text-xs text-[#5b6275]">
            第 {report.crashQuote.round} 轮 · 「{turns[report.crashQuote.round - 1]?.tag}」· 模糊词高亮
          </p>
          <blockquote className="mt-3 rounded-xl border border-[#262d3f] bg-[#0e1119] p-4 text-sm leading-relaxed text-[#c9cedd]">
            “{highlightFillers(report.crashQuote.text, report.crashQuote.fillers)}”
          </blockquote>
          <p className="mt-2 text-xs text-[#8b93a7]">
            👁 面试官观察:{turns[report.crashQuote.round - 1]?.note}
          </p>
        </section>
      )}

      {/* 训练建议 */}
      <section className="card fade-up mt-4 p-5" style={{ animationDelay: "0.7s" }}>
        <h3 className="text-sm font-bold">🏋️ 针对性训练任务</h3>
        <ol className="mt-3 space-y-2.5">
          {report.suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-xs font-bold text-rose-400">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 操作 */}
      <div className="mt-8 flex gap-3">
        <button onClick={onRestart} className="btn-primary flex-1">
          再练一次 →
        </button>
        <button onClick={onHome} className="btn-ghost flex-1">
          返回首页
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-[#5b6275]">
        数据仅保存在你的浏览器本地,不会上传。
      </p>
    </div>
  );
}
