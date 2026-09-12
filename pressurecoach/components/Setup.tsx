"use client";

import { useState } from "react";
import { MODES, Mode, PERSONAS, Persona, SCENARIOS, Scenario } from "@/lib/types";

interface Props {
  onStart: (s: Scenario, m: Mode, p: Persona, resume: string) => void;
  onBack: () => void;
}

export function Setup({ onStart, onBack }: Props) {
  const [scenario, setScenario] = useState<Scenario>("intern");
  const [mode, setMode] = useState<Mode>("pressure");
  const [persona, setPersona] = useState<Persona>("pro");
  const [resume, setResume] = useState("");

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <header className="flex items-center justify-between py-6">
        <button onClick={onBack} className="btn-ghost px-3 py-1.5 text-sm">
          ← 返回
        </button>
        <span className="text-sm text-[#78716c]">配置你的面试舱</span>
      </header>

      {/* 场景 */}
      <h2 className="text-sm font-semibold text-[#78716c]">
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
                active ? "border-[#d41111]/60 bg-[#d41111]/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{s.icon}</span>
                {active && <span className="chip border-[#d41111]/50 text-[#d41111]">已选</span>}
              </div>
              <div className="mt-2 font-semibold">{s.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-[#78716c]">{s.desc}</div>
              <div className="mt-2 text-[10px] text-[#78716c]">{s.tag}</div>
            </button>
          );
        })}
      </div>

      {/* 压力模式 */}
      <h2 className="mt-8 text-sm font-semibold text-[#78716c]">
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
                    ? "border-[#d41111]/60 bg-[#d41111]/10"
                    : "border-[#575e4e]/60 bg-[#575e4e]/10"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{m.icon}</span>
                {active && <span className="chip border-[#d41111]/50 text-[#d41111]">已选</span>}
              </div>
              <div className="mt-2 font-semibold">{m.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-[#78716c]">{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 面试官人格 */}
      <h2 className="mt-8 text-sm font-semibold text-[#78716c]">
        ③ 选择面试官性格
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {(Object.keys(PERSONAS) as Persona[]).map((key) => {
          const p = PERSONAS[key];
          const active = persona === key;
          return (
            <button
              key={key}
              onClick={() => setPersona(key)}
              className={`card card-hover p-4 text-left ${
                active ? "border-[#d41111]/60 bg-[#d41111]/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{p.icon}</span>
                {active && <span className="chip border-[#d41111]/50 text-[#d41111]">已选</span>}
              </div>
              <div className="mt-2 font-semibold">{p.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-[#78716c]">{p.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 简历 */}
      <h2 className="mt-8 text-sm font-semibold text-[#78716c]">
        ④ 粘贴简历 / 项目描述
        <span className="ml-1 font-normal text-[#78716c]">(可选)</span>
      </h2>
      <textarea
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        rows={5}
        placeholder={"例如:我做过一个校园二手交易小程序,负责后端和数据库,日均活跃用户 300+…\n\n面试官会围绕它针对性追问。"}
        className="input mt-3 text-sm leading-relaxed"
      />

      <button
        onClick={() => onStart(scenario, mode, persona, resume)}
        className="btn-primary mt-8 w-full text-lg"
      >
        进入面试舱 →
      </button>
      <p className="mt-3 text-center text-xs text-[#78716c]">
        6 轮追问 · 约 8 分钟 · 支持语音回答(Chrome/Edge)
      </p>
    </div>
  );
}
