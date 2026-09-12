"use client";

import { useEffect, useState } from "react";
import { listChineseVoices, shortVoiceName, speakBrowser, stopSpeaking } from "@/lib/speech";

const SAMPLE = "请先做一下自我介绍,重点讲讲你最有成就感的那个项目。";

/** 试音页:列出浏览器全部中文音色,逐个试听(含压力模式语气) */
export default function VoicesPage() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () => {
      setVoices(listChineseVoices(true));
      setLoaded(true);
    };
    load();
    window.speechSynthesis?.addEventListener?.("voiceschanged", load);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
      stopSpeaking();
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        试音页
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#78716c]">
        每个音色两种语气可试听。选定后把音色名告诉我(如「1 · Yunxi」),我会把它固定为面试官的唯一音色。
        此页不上线,选定后即删除。
      </p>
      {!loaded && <p className="mt-8 text-sm text-[#78716c]">正在加载浏览器音色列表…</p>}
      {loaded && voices.length === 0 && (
        <p className="mt-8 text-sm text-[#d41111]">
          当前浏览器没有检测到中文音色——请换 Edge 打开此页(Edge 自带微软自然音色)。
        </p>
      )}
      <div className="mt-8 space-y-2">
        {voices.map((v, i) => (
          <div key={v.name} className="card flex flex-wrap items-center gap-3 p-4">
            <span className="w-8 shrink-0 font-bold text-[#d41111]">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{shortVoiceName(v)}</span>
            <span className="text-xs text-[#78716c]">{v.lang}</span>
            <button
              onClick={() => speakBrowser(SAMPLE, v)}
              className="btn-ghost !px-3 !py-1.5 !text-xs"
            >
              试听
            </button>
            <button
              onClick={() => speakBrowser(SAMPLE, v, { pitch: 0.85, rate: 1.12 })}
              className="btn-primary !px-3 !py-1.5 !text-xs"
            >
              试听 · 压力
            </button>
          </div>
        ))}
      </div>
      <button onClick={stopSpeaking} className="btn-ghost mt-8 !px-4 !py-2 !text-xs">
        停止播放
      </button>
    </div>
  );
}
