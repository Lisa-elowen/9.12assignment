"use client";

import { MODES, SCENARIOS, Session } from "@/lib/types";
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

export function Home({ sessions, onStart, onViewSession }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-16">
      {/* 顶部品牌 */}
      <header className="flex items-center gap-2 py-6">
        <span className="text-xl">⚡</span>
        <span className="text-lg font-bold tracking-tight">PressureCoach</span>
        <span className="chip">AI 压力面试教练</span>
      </header>

      {/* Hero */}
      <section className="pt-6 pb-10 text-center">
        <h1 className="mx-auto max-w-xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
          你知道自己会在
          <span className="text-rose-500">哪个问题上失分</span>
          吗?
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[#8b93a7]">
          在正式面试前,让 AI 模拟一次真实高压面试,
          <br />
          找到你的失分点,训练你在压力下稳定表达。
        </p>
        <button onClick={onStart} className="btn-primary mt-8 text-lg">
          开始压力测试 →
        </button>
        <p className="mt-3 text-xs text-[#5b6275]">
          约 8 分钟 · 6 轮追问 · 免费
        </p>
      </section>

      {/* 三个价值点 */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            icon: "🔥",
            title: "真实压力模拟",
            desc: "不是题库问答。AI 面试官连续追问、挑战观点、要求具体化,还原面试失控的瞬间。",
          },
          {
            icon: "📊",
            title: "失分点定位",
            desc: "压力曲线记录你每一轮的表现变化,精确找到从哪一轮、被哪种问题击穿。",
          },
          {
            icon: "🏋️",
            title: "针对性训练",
            desc: "体检报告给出下一次训练任务,把「知道问题」变成「改掉问题」。",
          },
        ].map((f) => (
          <div key={f.title} className="card p-5">
            <div className="text-2xl">{f.icon}</div>
            <div className="mt-2 font-semibold">{f.title}</div>
            <div className="mt-1 text-sm leading-relaxed text-[#8b93a7]">
              {f.desc}
            </div>
          </div>
        ))}
      </section>

      {/* 工作原理 */}
      <section className="mt-12">
        <h2 className="text-center text-lg font-bold">三步完成一次压力体检</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { n: "1", t: "选场景", d: "大厂实习 / 保研复试 / 项目深挖" },
            { n: "2", t: "进面试舱", d: "6 轮动态追问,语音或文字回答" },
            { n: "3", t: "拿体检报告", d: "压力曲线 + 崩溃点 + 训练任务" },
          ].map((s) => (
            <div key={s.n} className="card p-4 text-center">
              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/15 text-sm font-bold text-rose-400">
                {s.n}
              </div>
              <div className="mt-2 text-sm font-semibold">{s.t}</div>
              <div className="mt-1 text-xs leading-relaxed text-[#8b93a7]">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 应急锦囊 */}
      <section className="mt-12">
        <h2 className="text-lg font-bold">🧰 应急锦囊</h2>
        <p className="mt-1 text-sm text-[#8b93a7]">
          面试突发状况的应对措施——被问到不会的问题、突然换题、被质疑时怎么办。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {EMERGENCY_TIPS.map((t) => (
            <div key={t.situation} className="card p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{t.icon}</span>
                <span className="text-sm font-semibold">{t.situation}</span>
              </div>
              <div className="mt-2 text-sm leading-relaxed text-[#8b93a7]">
                {t.action}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 训练历史 */}
      {sessions.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold">训练历史</h2>
          <div className="mt-4 space-y-2">
            {sessions.slice(0, 6).map((s) => (
              <button
                key={s.id}
                onClick={() => onViewSession(s)}
                className="card card-hover flex w-full items-center gap-4 p-4 text-left"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    s.report.overall >= 70
                      ? "bg-emerald-500/15 text-emerald-400"
                      : s.report.overall >= 55
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {s.report.overall}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {SCENARIOS[s.scenario].icon} {SCENARIOS[s.scenario].name}
                    <span className="ml-2 text-xs font-normal text-[#8b93a7]">
                      {MODES[s.mode].name}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[#5b6275]">
                    {fmtTime(s.at)} · {levelName(s.report.overall)}
                    {!s.usedAI && <span className="ml-2">(演示模式)</span>}
                  </div>
                </div>
                <span className="text-xs text-[#5b6275]">查看报告 →</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-16 border-t border-[#262d3f] pt-6 text-center text-xs text-[#5b6275]">
        PressureCoach · AI 压力面试教练 · 16 小时项目挑战作品
      </footer>
    </div>
  );
}
