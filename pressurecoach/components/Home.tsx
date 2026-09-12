"use client";

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

/** 逐字入场标题(clawsgo 风) */
function CharTitle({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          className="char-in"
          style={{ animationDelay: `${delay + i * 0.045}s` }}
        >
          {ch}
        </span>
      ))}
    </>
  );
}

/** 内嵌应用窗口 mockup(hero 下方,clawsgo 的展示手法) */
function AppWindow() {
  const steps = [
    { t: "自我介绍", d: "38s" },
    { t: "项目经历 · 数据口径质疑", d: "52s" },
    { t: "突发打断 → 恢复", d: "47s" },
    { t: "压力追问 · 换题", d: "61s" },
    { t: "沉默考验 → 补充", d: "44s" },
    { t: "超纲题 · 思考框架", d: "58s" },
  ];
  return (
    <div className="card overflow-hidden text-left">
      <div className="flex">
        {/* 侧栏 */}
        <aside className="hidden w-56 shrink-0 border-r border-[#262626] p-3 md:block">
          <div className="px-2 py-1 font-mono text-xs font-bold">⚡ PressureCoach</div>
          <div className="mt-3 space-y-0.5 text-xs text-[#9aa0a6]">
            <div className="rounded-md bg-[#1c1c1c] px-2 py-1.5 text-[#f5f5f5]">开始面试</div>
            <div className="px-2 py-1.5">训练历史</div>
            <div className="px-2 py-1.5">应急锦囊</div>
            <div className="px-2 py-1.5">设置</div>
          </div>
          <div className="mt-4 px-2 font-mono text-[10px] uppercase tracking-wider text-[#5f6368]">
            Pinned tasks
          </div>
          <div className="mt-1 space-y-0.5 text-xs">
            <div className="rounded-md px-2 py-1.5 text-[#9aa0a6]">保研复试 · 压力模拟</div>
            <div className="px-2 py-1.5 text-[#5f6368]">2h ago · Cloud host</div>
          </div>
        </aside>
        {/* 面试面板 */}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center gap-2">
            <span className="chip !border-[#00bb7f]/40 !text-[#00bb7f]">
              面试官 · ⚡ 高压施压
            </span>
            <span className="chip">High</span>
            <span className="ml-auto font-mono text-[10px] text-[#5f6368]">
              ❤️ 128 bpm
            </span>
          </div>
          <div className="mt-3 text-xs text-[#5f6368]">面试官</div>
          <div className="mt-1 rounded-lg border border-[#262626] bg-[#0d0d0d] px-3 py-2 text-sm">
            你说这个项目带来了 30% 的增长——数据口径是什么?别讲空话,给我具体的数。
          </div>
          <div className="mt-3 text-right text-xs text-[#5f6368]">你</div>
          <div className="mt-1 ml-auto max-w-[85%] rounded-lg border border-[#00bb7f]/25 bg-[#00bb7f]/8 px-3 py-2 text-sm">
            增长来自 A/B 实验组对比,对照组 1,240 人,实验组 1,180 人,留存提升 31.2%,p&lt;0.01…
          </div>
          <div className="mt-4 font-mono text-[11px] text-[#9aa0a6]">Worked through 6 steps</div>
          <div className="mt-1 space-y-0.5 font-mono text-[11px]">
            {steps.map((s) => (
              <div key={s.t} className="flex items-center gap-2">
                <span className="text-[#00bb7f]">✓</span>
                <span className="text-[#9aa0a6]">{s.t}</span>
                <span className="ml-auto text-[#5f6368]">{s.d}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="file-chip">
              📄 压力体检报告.pdf <span className="badge">+64</span>
            </span>
            <span className="file-chip">
              📈 压力曲线.png <span className="badge">PNG</span>
            </span>
            <span className="file-chip">
              🧭 六维能力图.svg <span className="badge">6</span>
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#262626] bg-[#0d0d0d] px-3 py-2.5">
            <span className="flex-1 text-xs text-[#5f6368]">
              输入你的回答 · / 查看应急锦囊 · 🎤 语音回答
            </span>
            <span className="chip">第 4/6 轮 · 压力追问</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Home({ sessions, onStart, onViewSession }: Props) {
  return (
    <div className="min-h-screen">
      {/* 顶栏 */}
      <nav className="sticky top-0 z-50 border-b border-[#262626] bg-[#0a0a0a]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-3">
          <span className="font-mono text-sm font-bold">⚡ PressureCoach</span>
          <span className="chip ml-3">AI 压力面试教练</span>
          <div className="ml-auto">
            <button onClick={onStart} className="btn-primary !px-4 !py-1.5 text-sm">
              快速开始
            </button>
          </div>
        </div>
      </nav>

      {/* Hero:逐字入场 */}
      <section className="mx-auto max-w-3xl px-5 pt-20 pb-8 text-center">
        <p className="time-tag">16 小时项目挑战作品 · AI 模拟面试官</p>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
          <CharTitle text="你知道自己会在" />
          <br />
          <span className="text-[#00bb7f]">
            <CharTitle text="哪个问题上失分" delay={0.6} />
          </span>
          <CharTitle text="吗?" delay={1.3} />
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-[#9aa0a6]">
          在正式面试前,让 AI 模拟一次真实高压面试。
          <br />
          找到你的失分点,训练你在压力下稳定表达。
        </p>
        <button onClick={onStart} className="btn-primary mt-8 text-lg">
          快速开始
        </button>
        <p className="time-tag mt-4">6 轮追问 · 约 8 分钟 · 免费</p>
      </section>

      {/* 内嵌应用窗口 */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <AppWindow />
      </section>

      {/* 从一次面试,到一份报告(clawsgo 时间叙事) */}
      <section className="border-t border-[#262626] py-16">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-center text-2xl font-bold md:text-3xl">
            从一个回答,到一份带引用的体检报告
          </h2>
          <p className="mt-2 text-center text-[#9aa0a6]">
            开始面试,拿到报告——你的每个压力瞬间都被记录、拆解、给出改法。
          </p>
          <div className="mx-auto mt-8 max-w-2xl space-y-6">
            <div>
              <span className="time-tag">19:00 · 开始面试</span>
              <div className="mt-1 text-sm">
                选场景、选面试官性格,进入面试舱。一句话,就够。
              </div>
            </div>
            <div className="border-l border-[#262626] pl-4">
              <span className="time-tag">19:00 – 19:08 · 它开始施压,你开始暴露</span>
              <div className="step-log mt-1">
                第 1 轮 · 自我介绍 <span className="t">犹豫 1.2s ✓</span>
                <br />
                第 2 轮 · 项目经历,质疑数据口径 <span className="t">56s · 突发×1</span>
                <br />
                第 3 轮 · 突然打断 → 恢复 <span className="t">47s</span>
                <br />
                第 4 轮 · 压力追问,突然换题 <span className="t">61s · 逻辑断裂</span>
                <br />
                第 5 轮 · 长时间沉默 → 补充 <span className="t">44s</span>
                <br />
                第 6 轮 · 超纲题,只要思路 <span className="t">58s</span>
              </div>
            </div>
            <div>
              <span className="time-tag">19:08 · 拿到报告</span>
              <div className="mt-1 text-sm">
                六维能力图、压力曲线、语气词改造建议、下一次训练任务——全部可执行。
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 可溯源的过程:终端面板 */}
      <section className="border-t border-[#262626] py-16">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-2xl font-bold md:text-3xl">可溯源的过程</h2>
          <p className="mt-2 max-w-xl text-[#9aa0a6]">
            犹豫时长、语气词密度、逻辑分走势——每个动作都在它发生的位置上,整场面试随时重放。
          </p>
          <div className="terminal mt-6">
            <div>
              <span className="prompt">$</span> python analyze.py --session 20260912-1900
            </div>
            <div className="dim">loaded 6 turns · 2 interventions · 1 logic break</div>
            <div>turn 2: filler_ratio 0.09 ⚠ 高频词:「然后」×4</div>
            <div>turn 3: latency 6.8s (threshold 3s) → penalty -1.5</div>
            <div>turn 4: logic drop 7.2 → 5.1 · recovery 2.3s</div>
            <div>hexagon: [稳定 78, 逻辑 62, 反应 51, 恢复 58, 深度 71, 节奏 66]</div>
            <div className="text-[#00bb7f]">✓ wrote 压力体检报告.pdf (+64)</div>
          </div>
        </div>
      </section>

      {/* 面试官人格(模型卡片风) */}
      <section className="border-t border-[#262626] py-16">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-2xl font-bold md:text-3xl">建立在不同的面试官之上</h2>
          <p className="mt-2 text-[#9aa0a6]">
            四种性格,按你想练的场景随手切换——最真实的面试,来自最不可预测的人。
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-4">
            {(Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]).map((key, i) => {
              const p = PERSONAS[key];
              return (
                <div key={key} className="card card-hover p-5">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#5f6368]">
                    {["Warm", "Pro", "Tough", "Curious"][i]}
                  </div>
                  <div className="mt-2 text-2xl">{p.icon}</div>
                  <div className="mt-2 font-semibold">{p.name}</div>
                  <div className="mt-1 text-xs leading-relaxed text-[#9aa0a6]">
                    {p.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 应急锦囊 */}
      <section className="border-t border-[#262626] py-16">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-2xl font-bold md:text-3xl">应急锦囊</h2>
          <p className="mt-2 text-[#9aa0a6]">
            突发状况的应对措施——被问到不会的问题、突然换题、被质疑时怎么办。
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {EMERGENCY_TIPS.map((t) => (
              <div key={t.situation} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-sm font-semibold">{t.situation}</span>
                </div>
                <div className="mt-2 text-sm leading-relaxed text-[#9aa0a6]">
                  {t.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 训练历史(clawsgo Tasks 列表风) */}
      <section className="border-t border-[#262626] py-16">
        <div className="mx-auto max-w-4xl px-5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Tasks</h2>
            <span className="chip">训练历史</span>
          </div>
          {sessions.length === 0 ? (
            <p className="mt-6 text-sm text-[#5f6368]">
              还没有训练记录——点「快速开始」,跑完 6 轮就能拿到第一份体检报告。
            </p>
          ) : (
            <div className="mt-5 space-y-1.5">
              {sessions.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onViewSession(s)}
                  className="card card-hover flex w-full items-center gap-3 p-3 text-left"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                      s.report.overall >= 70
                        ? "bg-[#00bb7f]/15 text-[#00bb7f]"
                        : s.report.overall >= 55
                        ? "bg-[#febc2e]/15 text-[#febc2e]"
                        : "bg-[#ff5f57]/15 text-[#ff5f57]"
                    }`}
                  >
                    {s.report.overall}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {SCENARIOS[s.scenario].icon} {SCENARIOS[s.scenario].name}
                      <span className="ml-2 text-xs font-normal text-[#9aa0a6]">
                        {MODES[s.mode].name}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[#5f6368]">
                      {fmtTime(s.at)} · {levelName(s.report.overall)}
                      {!s.usedAI && <span className="ml-2">(演示模式)</span>}
                    </div>
                  </div>
                  <span className="chip shrink-0">6 轮 · 8 分钟</span>
                  <span className="hidden font-mono text-[10px] text-[#5f6368] sm:block">
                    查看报告 →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-[#262626] py-8 text-center">
        <p className="font-mono text-xs text-[#5f6368]">
          PressureCoach · AI 压力面试教练 · 16 小时项目挑战作品
        </p>
      </footer>
    </div>
  );
}
