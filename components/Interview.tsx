"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MODES, Mode, SCENARIOS, Scenario, TOTAL_ROUNDS, timeLimitFor, Turn } from "@/lib/types";
import { analyzeAnswer } from "@/lib/analysis";
import { offlineNextQuestion } from "@/lib/offline";
import { isSpeechSupported, SpeechInput } from "@/lib/speech";

interface Props {
  scenario: Scenario;
  mode: Mode;
  resume: string;
  onFinish: (turns: Turn[], usedAI: boolean) => void;
  onQuit: () => void;
}

interface NextQ {
  question: string;
  tag: string;
  challenge: boolean;
  logicScore: number | null;
  note: string | null;
}

function inferTag(round: number): string {
  if (round === 1) return "自我介绍";
  if (round <= 3) return "项目经历";
  return "压力追问";
}

export function Interview({ scenario, mode, resume, onFinish, onQuit }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState<NextQ | null>(null);
  const [thinking, setThinking] = useState(true);
  const [answer, setAnswer] = useState("");
  const [recording, setRecording] = useState(false);
  const [usedAI, setUsedAI] = useState(true);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const qStartRef = useRef<number>(Date.now());
  const speechRef = useRef<SpeechInput | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const round = turns.length + 1;
  const sc = SCENARIOS[scenario];
  const md = MODES[mode];

  const fetchQuestion = useCallback(
    async (prevTurns: Turn[]): Promise<NextQ> => {
      const r = prevTurns.length + 1;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario, mode, resume, turns: prevTurns, round: r }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.question) {
            return {
              question: data.question,
              tag: data.tag ?? inferTag(r),
              challenge: data.challenge ?? r >= 4,
              logicScore: data.logicScore ?? null,
              note: data.note ?? null,
            };
          }
        }
        const err = res.ok ? null : await res.json().catch(() => null);
        if (err?.error === "no_key") {
          setUsedAI(false);
          setOfflineNotice(true);
        } else if (err) {
          setUsedAI(false);
        }
      } catch {
        setUsedAI(false);
      }
      // 离线兜底
      const last = prevTurns[prevTurns.length - 1];
      const o = offlineNextQuestion(scenario, mode, r, last?.answer ?? "");
      return {
        question: o.question,
        tag: o.tag,
        challenge: o.challenge,
        logicScore: o.logicScore,
        note: o.note,
      };
    },
    [scenario, mode, resume]
  );

  // 首题
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = await fetchQuestion([]);
      if (!cancelled) {
        setQuestion(q);
        setThinking(false);
        qStartRef.current = Date.now();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchQuestion]);

  // 语音识别
  useEffect(() => {
    if (isSpeechSupported()) {
      const sp = new SpeechInput();
      sp.onUpdate = (text) => setAnswer(text);
      sp.onEnd = () => setRecording(false);
      speechRef.current = sp;
    }
    return () => {
      try {
        speechRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  // 自动滚动
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, question, thinking, answer]);

  const toggleRecord = () => {
    const sp = speechRef.current;
    if (!sp) return;
    if (!recording) {
      sp.start();
      setRecording(true);
    } else {
      sp.stop();
    }
  };

  const doSubmit = async (timedOut = false) => {
    if (!question || thinking) return;
    const text = answer.trim();
    if (!text && !timedOut) return;
    if (recording) {
      speechRef.current?.stop();
      setRecording(false);
    }
    const limit = timeLimitFor(mode, round);
    const durationSec = timedOut
      ? limit
      : Math.max(1, (Date.now() - qStartRef.current) / 1000);
    const m = analyzeAnswer(text);
    const empty = !text;
    const turn: Turn = {
      question: question.question,
      answer: text,
      durationSec,
      wordCount: m.wordCount,
      fillerCount: m.fillerCount,
      fillerRatio: m.fillerRatio,
      hasStructure: m.hasStructure,
      logicScore: empty ? 2 : (question.logicScore ?? m.logicScore),
      note: empty
        ? "超时未作答"
        : timedOut
        ? `超时未答完:${m.note}`
        : (question.note ?? m.note),
      tag: question.tag,
      isChallenge: question.challenge,
      timedOut,
    };
    const newTurns = [...turns, turn];
    setTurns(newTurns);
    setAnswer("");
    if (newTurns.length >= TOTAL_ROUNDS) {
      onFinish(newTurns, usedAI);
      return;
    }
    setThinking(true);
    const q = await fetchQuestion(newTurns);
    setQuestion(q);
    setThinking(false);
    qStartRef.current = Date.now();
  };

  const submit = () => doSubmit(false);

  // 倒计时:题目出现即开始,制造时间压力
  useEffect(() => {
    if (!question || thinking) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(timeLimitFor(mode, turns.length + 1));
    const iv = setInterval(() => {
      setTimeLeft((t) => (t === null ? t : t - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [question, thinking, turns.length, mode]);

  // 超时自动交卷——哪怕只写了半句,这就是压力
  useEffect(() => {
    if (timeLeft === 0) {
      doSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const earlyFinish = () => {
    if (turns.length >= 3) onFinish(turns, usedAI);
  };

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col px-5">
      {/* 顶栏 */}
      <header className="flex items-center gap-3 py-4">
        <button onClick={onQuit} className="btn-ghost px-2.5 py-1 text-xs">
          ← 退出
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{sc.icon}</span>
            <span className="truncate text-sm font-semibold">{sc.name}</span>
            <span
              className={`chip ${
                mode === "pressure"
                  ? "border-rose-500/50 text-rose-400"
                  : "border-sky-500/50 text-sky-400"
              }`}
            >
              {md.icon} {md.name}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#262d3f]">
              <div
                className="h-full rounded-full bg-rose-500 transition-all duration-500"
                style={{ width: `${(Math.min(round, TOTAL_ROUNDS) / TOTAL_ROUNDS) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-[#5b6275]">
              第 {Math.min(round, TOTAL_ROUNDS)}/{TOTAL_ROUNDS} 轮
            </span>
          </div>
        </div>
      </header>

      {offlineNotice && (
        <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
          未配置 AI Key,当前为内置演示模式。配置后即可使用真实 AI 面试官。
        </div>
      )}

      {/* 对话区 */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4 pt-2">
        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            {/* 面试官 */}
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#191e2c] text-base">
                {sc.icon}
              </div>
              <div className="max-w-[85%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5b6275]">面试官</span>
                  {t.isChallenge && (
                    <span className="chip border-rose-500/50 text-rose-400">⚔️ 追问施压</span>
                  )}
                </div>
                <div className="card mt-1 px-4 py-3 text-sm leading-relaxed">
                  {t.question}
                </div>
              </div>
            </div>
            {/* 候选人 */}
            <div className="flex items-start justify-end gap-2.5">
              <div className="max-w-[85%]">
                <div className="text-right text-xs text-[#5b6275]">你</div>
                <div className="mt-1 rounded-2xl rounded-tr-sm bg-rose-500/15 px-4 py-3 text-sm leading-relaxed">
                  {t.answer}
                </div>
                {t.note && (
                  <div className="mt-1 text-right text-xs italic text-[#5b6275]">
                    👁 面试官观察:{t.note}
                  </div>
                )}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-base">
                🧑‍🎓
              </div>
            </div>
          </div>
        ))}

        {/* 当前问题 */}
        {question && !thinking && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#191e2c] text-base">
              {sc.icon}
            </div>
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5b6275]">面试官</span>
                {question.challenge && (
                  <span className="chip border-rose-500/50 text-rose-400">⚔️ 追问施压</span>
                )}
              </div>
              <div className="card mt-1 px-4 py-3 text-sm leading-relaxed">
                {question.question}
              </div>
            </div>
          </div>
        )}

        {thinking && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#191e2c] text-base">
              {sc.icon}
            </div>
            <div className="card flex items-center gap-1.5 px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#8b93a7]" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#8b93a7]" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#8b93a7]" />
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-[#262d3f] py-4">
        {/* 倒计时压力条 */}
        {timeLeft !== null && question && !thinking && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm">⏱</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#262d3f]">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  timeLeft <= 10
                    ? "bg-rose-500"
                    : timeLeft <= 30
                    ? "bg-amber-400"
                    : "bg-sky-400"
                }`}
                style={{
                  width: `${(timeLeft / timeLimitFor(mode, round)) * 100}%`,
                }}
              />
            </div>
            <span
              className={`shrink-0 text-sm font-bold tabular-nums ${
                timeLeft <= 10
                  ? "animate-pulse text-rose-400"
                  : timeLeft <= 30
                  ? "text-amber-400"
                  : "text-[#8b93a7]"
              }`}
            >
              {Math.floor(timeLeft / 60)}:
              {String(timeLeft % 60).padStart(2, "0")}
            </span>
            <span className="chip shrink-0">限时 {timeLimitFor(mode, round)}s</span>
          </div>
        )}
        {mode === "pressure" && timeLeft !== null && timeLeft <= 30 && timeLeft > 0 && (
          <div className="mb-1.5 text-center text-xs font-medium text-rose-400">
            ⏳ 时间不等人——先给结论,细节后补
          </div>
        )}
        <div className="mb-2 text-xs text-[#5b6275]">
          💡 保持「结论先行」,避免「其实 / 可能 / 大概」
        </div>
        <textarea
          value={answer}
          onChange={(e) => !recording && setAnswer(e.target.value)}
          rows={3}
          disabled={recording || thinking}
          placeholder={
            recording
              ? "🎤 正在录音,你的回答会实时显示在这里…"
              : "在这里输入你的回答…"
          }
          className="input text-sm leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-3 flex items-center gap-2">
          {speechRef.current?.supported && (
            <button
              onClick={toggleRecord}
              disabled={thinking}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-all ${
                recording
                  ? "recording border-rose-500 bg-rose-500 text-white"
                  : "border-[#262d3f] bg-[#191e2c]"
              }`}
              title={recording ? "点击结束录音" : "语音回答"}
            >
              🎤
            </button>
          )}
          <button
            onClick={submit}
            disabled={!answer.trim() || thinking || recording}
            className="btn-primary flex-1"
          >
            {recording ? "录音中…" : round >= TOTAL_ROUNDS ? "提交并生成报告 →" : "提交回答 →"}
          </button>
        </div>
        {turns.length >= 3 && round < TOTAL_ROUNDS && (
          <button
            onClick={earlyFinish}
            className="mt-3 w-full text-center text-xs text-[#5b6275] underline-offset-2 hover:underline"
          >
            提前结束面试,生成报告
          </button>
        )}
      </div>
    </div>
  );
}
