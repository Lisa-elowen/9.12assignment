"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  MODES,
  Mode,
  PERSONAS,
  Persona,
  SCENARIOS,
  Scenario,
  TOTAL_ROUNDS,
  timeLimitFor,
  Turn,
} from "@/lib/types";
import { analyzeAnswer } from "@/lib/analysis";
import { offlineNextQuestion } from "@/lib/offline";
import { isSpeechSupported, SpeechInput } from "@/lib/speech";
import {
  Intervention,
  interventionChance,
  interventionDelay,
  rollIntervention,
} from "@/lib/interventions";

interface Props {
  scenario: Scenario;
  mode: Mode;
  persona: Persona;
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

export function Interview({ scenario, mode, persona, resume, onFinish, onQuit }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState<NextQ | null>(null);
  const [thinking, setThinking] = useState(true);
  const [answer, setAnswer] = useState("");
  const [recording, setRecording] = useState(false);
  const [usedAI, setUsedAI] = useState(true);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hesitation, setHesitation] = useState(0);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const qStartRef = useRef<number>(Date.now());
  const responseStartedRef = useRef(false);
  const latencyRef = useRef(0);
  const speechRef = useRef<SpeechInput | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const interventionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interventionLogRef = useRef<string[]>([]);
  const usedKindsRef = useRef<Set<string>>(new Set());

  const round = turns.length + 1;
  const sc = SCENARIOS[scenario];
  const md = MODES[mode];
  const ps = PERSONAS[persona];
  // 犹豫阈值:超过即被扣分(压力模式更严)
  const latencyThreshold = mode === "pressure" ? 3 : 5;

  // 实时心率估算(语言压力信号 → 生理模拟;真实设备接入后替换)
  const hr = Math.round(
    Math.min(
      165,
      58 +
        Math.min(hesitation, 20) * 3 +
        (mode === "pressure" && timeLeft !== null && timeLeft <= 30 ? 18 : 0) +
        (intervention ? 12 : 0) +
        turns.reduce((s, t) => s + (t.interventions?.length ?? 0), 0) * 4
    )
  );

  // 首次输入(打字或语音)即记下犹豫时长,并按概率埋一个突发干预
  const markResponseStarted = useCallback(() => {
    if (!responseStartedRef.current) {
      responseStartedRef.current = true;
      latencyRef.current = (Date.now() - qStartRef.current) / 1000;
      setHesitation(latencyRef.current);
      if (Math.random() < interventionChance(mode, persona)) {
        interventionTimerRef.current = setTimeout(() => {
          const ev = rollIntervention(usedKindsRef.current as any);
          usedKindsRef.current.add(ev.kind);
          interventionLogRef.current.push(ev.label);
          setIntervention(ev);
          setTimeout(() => setIntervention(null), 8000);
        }, interventionDelay(mode));
      }
    }
  }, [mode, persona]);

  const fetchQuestion = useCallback(
    async (prevTurns: Turn[]): Promise<NextQ> => {
      const r = prevTurns.length + 1;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario, mode, persona, resume, turns: prevTurns, round: r }),
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
    [scenario, mode, persona, resume]
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
        responseStartedRef.current = false;
        setHesitation(0);
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
      sp.onUpdate = (text) => {
        if (text.trim()) markResponseStarted();
        setAnswer(text);
      };
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

  // 卸载时清理干预定时器
  useEffect(() => {
    return () => {
      if (interventionTimerRef.current) clearTimeout(interventionTimerRef.current);
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
    // 犹豫时长:开口/落笔前的时间,超时按满时长计
    const latencySec = timedOut
      ? limit
      : responseStartedRef.current
      ? Math.max(0, latencyRef.current)
      : Math.max(1, (Date.now() - qStartRef.current) / 1000);
    const m = analyzeAnswer(text);
    const empty = !text;
    const baseScore = empty
      ? 2
      : timedOut
      ? Math.min(question.logicScore ?? m.logicScore, 6)
      : (question.logicScore ?? m.logicScore);
    // 愣神扣分:超过阈值后每多 1 秒扣 0.4,上限 2 分
    const latPenalty = Math.min(
      2,
      Math.max(0, (latencySec - latencyThreshold) * 0.4)
    );
    const logicScore =
      Math.round(Math.max(1, Math.min(10, baseScore - latPenalty)) * 10) / 10;
    const latencyNote =
      latencySec > latencyThreshold && !timedOut
        ? `开场犹豫 ${latencySec.toFixed(1)} 秒;`
        : "";
    const interventions = [...interventionLogRef.current];
    const intNote =
      interventions.length > 0 ? `遭遇${interventions.length}次突发:${interventions.join("/")};` : "";
    const turn: Turn = {
      question: question.question,
      answer: text,
      durationSec,
      responseLatencySec: latencySec,
      wordCount: m.wordCount,
      fillerCount: m.fillerCount,
      fillerRatio: m.fillerRatio,
      hasStructure: m.hasStructure,
      logicScore,
      note: empty
        ? "超时未作答"
        : timedOut
        ? `超时未答完:${m.note}`
        : latencyNote + intNote + (question.note ?? m.note),
      tag: question.tag,
      isChallenge: question.challenge,
      timedOut,
      interventions,
    };
    // 清理本轮干预状态
    if (interventionTimerRef.current) clearTimeout(interventionTimerRef.current);
    interventionLogRef.current = [];
    usedKindsRef.current = new Set();
    setIntervention(null);
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
    responseStartedRef.current = false;
    setHesitation(0);
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

  // 犹豫计时:题目出现后未开口的时间,每 0.1s 刷新
  useEffect(() => {
    if (!question || thinking || answer.trim() || responseStartedRef.current) {
      return;
    }
    const iv = setInterval(() => {
      setHesitation((Date.now() - qStartRef.current) / 1000);
    }, 100);
    return () => clearInterval(iv);
  }, [question, thinking, answer]);

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
                  ? "border-[#d41111]/50 text-[#d41111]"
                  : "border-[#575e4e]/50 text-[#575e4e]"
              }`}
            >
              {md.icon} {md.name}
            </span>
            <span className="chip border-[#e7e5e4] text-[#78716c]">
              {ps.icon} {ps.name}
            </span>
            <span
              className={`chip shrink-0 tabular-nums ${
                hr > 110 ? "animate-pulse border-[#d41111]/50 text-[#d41111]" : "border-[#e7e5e4] text-[#78716c]"
              }`}
              title="心率估算(基于犹豫时长与压力信号,真实手环接入后替换)"
            >
              {hr}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#e7e5e4]">
              <div
                className="h-full rounded-full bg-[#d41111] transition-all duration-500"
                style={{ width: `${(Math.min(round, TOTAL_ROUNDS) / TOTAL_ROUNDS) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-[#78716c]">
              第 {Math.min(round, TOTAL_ROUNDS)}/{TOTAL_ROUNDS} 轮
            </span>
          </div>
          {/* ClawsGO 风:轮次步骤时间线 */}
          <div className="mt-2 flex items-start">
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
              const done = i < turns.length;
              const current = i === turns.length;
              return (
                <Fragment key={i}>
                  {i > 0 && <div className="step-line mt-1" />}
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <div
                      className={`step-dot ${
                        done
                          ? "bg-[#575e4e]"
                          : current
                          ? "animate-pulse bg-[#d41111]"
                          : "bg-[#e7e5e4]"
                      }`}
                    />
                    <span
                      className={`text-[9px] leading-none ${
                        done
                          ? "text-[#575e4e]"
                          : current
                          ? "font-semibold text-[#d41111]"
                          : "text-[#78716c]"
                      }`}
                    >
                      {inferTag(i + 1)}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </header>

      {offlineNotice && (
        <div className="mb-2 rounded-lg border border-[#a16207]/40 bg-[#a16207]/10 px-3 py-1.5 text-xs text-[#a16207]">
          未配置 AI Key,当前为内置演示模式。配置后即可使用真实 AI 面试官。
        </div>
      )}

      {/* 对话区 */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4 pt-2">
        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            {/* 面试官 */}
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffffff] text-base">
                {sc.icon}
              </div>
              <div className="max-w-[85%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#78716c]">面试官</span>
                  {t.isChallenge && (
                    <span className="chip border-[#d41111]/50 text-[#d41111]">追问施压</span>
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
                <div className="text-right text-xs text-[#78716c]">你</div>
                <div className="mt-1 rounded-2xl rounded-tr-sm bg-[#d41111]/15 px-4 py-3 text-sm leading-relaxed">
                  {t.answer}
                </div>
                {t.note && (
                  <div className="mt-1 text-right text-xs italic text-[#78716c]">
                    面试官观察:{t.note}
                  </div>
                )}
                {/* 回答耗时 meta(ClawsGO 风 step 计时) */}
                <div className="mt-1 flex flex-wrap justify-end gap-1">
                  <span className="meta-chip">用时 {Math.round(t.durationSec)}s</span>
                  {t.responseLatencySec != null && (
                    <span className="meta-chip">
                      犹豫 {t.responseLatencySec.toFixed(1)}s
                    </span>
                  )}
                  {(t.interventions?.length ?? 0) > 0 && (
                    <span className="meta-chip !text-[#d41111]">
                      突发 ×{t.interventions!.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d41111]/15 text-base">
                
              </div>
            </div>
          </div>
        ))}

        {/* 当前问题 */}
        {question && !thinking && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffffff] text-base">
              {sc.icon}
            </div>
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#78716c]">面试官</span>
                {question.challenge && (
                  <span className="chip border-[#d41111]/50 text-[#d41111]">追问施压</span>
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffffff] text-base">
              {sc.icon}
            </div>
            <div className="card flex items-center gap-1.5 px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#78716c]" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#78716c]" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#78716c]" />
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-[#e7e5e4] py-4">
        {/* 倒计时压力条 */}
        {timeLeft !== null && question && !thinking && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm">⏱</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7e5e4]">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  timeLeft <= 10
                    ? "bg-[#d41111]"
                    : timeLeft <= 30
                    ? "bg-[#a16207]"
                    : "bg-[#575e4e]"
                }`}
                style={{
                  width: `${(timeLeft / timeLimitFor(mode, round)) * 100}%`,
                }}
              />
            </div>
            <span
              className={`shrink-0 text-sm font-bold tabular-nums ${
                timeLeft <= 10
                  ? "animate-pulse text-[#d41111]"
                  : timeLeft <= 30
                  ? "text-[#a16207]"
                  : "text-[#78716c]"
              }`}
            >
              {Math.floor(timeLeft / 60)}:
              {String(timeLeft % 60).padStart(2, "0")}
            </span>
            <span className="chip shrink-0">限时 {timeLimitFor(mode, round)}s</span>
          </div>
        )}
        {mode === "pressure" && timeLeft !== null && timeLeft <= 30 && timeLeft > 0 && (
          <div className="mb-1.5 text-center text-xs font-medium text-[#d41111]">
            时间不等人——先给结论,细节后补
          </div>
        )}
        {/* 突发干预:面试中的不可预测因素 */}
        {intervention && (
          <div className="mb-2 animate-pulse rounded-lg border border-[#d41111]/50 bg-[#d41111]/10 px-3 py-2 text-sm leading-relaxed text-[#d41111]">
            突发情况:{intervention.text}
          </div>
        )}
        {/* 犹豫计时:开口前的沉默会被记录并扣分 */}
        {!answer.trim() && !recording && hesitation >= 0.5 && (
          <div
            className={`mb-1.5 flex items-center justify-center gap-1.5 text-xs font-medium ${
              hesitation > latencyThreshold
                ? "animate-pulse text-[#d41111]"
                : "text-[#a16207]"
            }`}
          >
            已思考 {hesitation.toFixed(1)} 秒
            {hesitation > latencyThreshold
              ? `——犹豫超 ${latencyThreshold} 秒会被记入报告,先开口再完善`
              : `(超过 ${latencyThreshold} 秒开始扣分)`}
          </div>
        )}
        <div className="mb-2 flex items-center gap-1.5 text-xs text-[#78716c]">
          结论先行,避免「其实 / 可能 / 大概」
          <span className="chip">卡住时想想首页的应急锦囊</span>
        </div>
        <textarea
          value={answer}
          onChange={(e) => {
            if (recording) return;
            if (e.target.value.trim()) markResponseStarted();
            setAnswer(e.target.value);
          }}
          rows={3}
          disabled={recording || thinking}
          placeholder={
            recording
              ? "正在录音,你的回答会实时显示在这里…"
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
                  ? "recording border-[#d41111] bg-[#d41111] text-white"
                  : "border-[#e7e5e4] bg-[#ffffff]"
              }`}
              title={recording ? "点击结束录音" : "语音回答"}
            >
              录
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
            className="mt-3 w-full text-center text-xs text-[#78716c] underline-offset-2 hover:underline"
          >
            提前结束面试,生成报告
          </button>
        )}
      </div>
    </div>
  );
}
