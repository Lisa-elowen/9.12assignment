"use client";

import { useState } from "react";
import { MODES, Mode, SCENARIOS, Scenario } from "@/lib/types";

interface Props {
  onStart: (s: Scenario, m: Mode, resume: string) => void;
  onBack: () => void;
}

export function Setup({ onStart, onBack }: Props) {
  const [scenario, setScenario] = useState<Scenario>("intern");
  const [mode, setMode] = useState<Mode>("pressure");
  const [resume, setResume] = useState("");

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <header className="flex items-center justify-between py-6">
        <button onClick={onBack} className="btn-ghost px-3 py-1.5 text-sm">
          ← 返回
        </button>
        <span className="text-sm text-[#5b6275]">配置你的面试舱</span>
      </header>

      {/* 场景 */}
      <h2 className="text-sm font-semibold text-[#8b93a7]">
        ① 选择面试场景
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {(Object.keys(SCENARIOS) as Scenario[]).map((key) => {
          const s = SCENARIOS[key];
          const active = scenario === key;
          return (
            <button
              key={key}
              onClick={() => setScenario(key)}
              className={`card card-hover p-4 text-left ${
                active ? "border-rose-500/60 bg-rose-500/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{s.icon}</span>
                {active && <span className="chip border-rose-500/50 text-rose-400">已选</span>}
              </div>
              <div className="mt-2 font-semibold">{s.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-[#8b93a7]">{s.desc}</div>
              <div className="mt-2 text-[10px] text-[#5b6275]">{s.tag}</div>
            </button>
          );
        })}
      </div>

      {/* 压力模式 */}
      <h2 className="mt-8 text-sm font-semibold text-[#8b93a7]">
        ② 选择压力模式
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {(Object.keys(MODES) as Mode[]).map((key) => {
          const m = MODES[key];
          const active = mode === key;
          return (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`card card-hover p-4 text-left ${
                active
                  ? key === "pressure"
                    ? "border-rose-500/60 bg-rose-500/10"
                    : "border-sky-500/60 bg-sky-500/10"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{m.icon}</span>
                {active && <span className="chip border-rose-500/50 text-rose-400">已选</span>}
              </div>
              <div className="mt-2 font-semibold">{m.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-[#8b93a7]">{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 简历 */}
      <h2 className="mt-8 text-sm font-semibold text-[#8b93a7]">
        ③ 粘贴简历 / 项目描述
        <span className="ml-1 font-normal text-[#5b6275]">(可选)</span>
      </h2>
      <textarea
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        rows={5}
        placeholder={"例如:我做过一个校园二手交易小程序,负责后端和数据库,日均活跃用户 300+…\n\n面试官会围绕它针对性追问。"}
        className="input mt-3 text-sm leading-relaxed"
      />

      <button
        onClick={() => onStart(scenario, mode, resume)}
        className="btn-primary mt-8 w-full text-lg"
      >
        进入面试舱 →
      </button>
      <p className="mt-3 text-center text-xs text-[#5b6275]">
        6 轮追问 · 约 8 分钟 · 支持语音回答(Chrome/Edge)
      </p>
    </div>
  );
}
