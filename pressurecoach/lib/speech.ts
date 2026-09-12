/**
 * 浏览器语音识别封装(Web Speech API,免费,无需 ASR 服务)。
 * 仅 Chrome / Edge 支持;不支持时 UI 隐藏麦克风按钮。
 */

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export class SpeechInput {
  private rec: any = null;
  private final = "";
  private started = false;
  onUpdate: (text: string) => void = () => {};
  onEnd: () => void = () => {};
  onError: (msg: string) => void = () => {};

  constructor() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.final += r[0].transcript;
        else interim += r[0].transcript;
      }
      this.onUpdate(this.final + interim);
    };
    rec.onerror = (e: any) => {
      this.started = false;
      this.onEnd();
      this.onError(e?.error === "not-allowed" ? "麦克风权限被拒绝,请在浏览器地址栏允许麦克风" : "语音识别服务不可用(国内网络限制),请改用打字输入");
    };
    rec.onend = () => {
      if (this.started) {
        this.started = false;
        this.onEnd();
      }
    };
    this.rec = rec;
  }

  get supported(): boolean {
    return !!this.rec;
  }

  start() {
    if (!this.rec || this.started) return;
    this.final = "";
    this.started = true;
    try {
      this.rec.start();
    } catch {
      this.started = false;
    }
  }

  stop() {
    if (!this.rec || !this.started) return;
    this.started = false;
    try {
      this.rec.stop();
    } catch {
      /* noop */
    }
  }
}

/* ── 面试官语音(TTS)─────────────────────────────── */

const GOOD_VOICES = [
  "xiaoxiao", "yunxi", "xiaoyi", "yunjian", "yunyang",
  "yunfeng", "yunhao", "yunxia", "xiaobei", "natural", "online",
];
const BAD_VOICES = ["huihui", "kangkang", "yaoyao", "tingting"];
// 男声:压力面试更贴近"严肃面试官"
const MALE_VOICES = ["yunxi", "yunjian", "yunyang", "yunfeng", "yunhao", "xiaoyi"];
const FEMALE_VOICES = ["xiaoxiao", "xiaobei", "xiaochen", "huihui", "yaoyao", "tingting"];

function voiceScore(v: SpeechSynthesisVoice, preferMale: boolean): number {
  const n = v.name.toLowerCase();
  if (BAD_VOICES.some((b) => n.includes(b))) return 0;
  let s = GOOD_VOICES.some((g) => n.includes(g)) ? 3 : n.includes("online") ? 2 : 1;
  if (preferMale) {
    if (MALE_VOICES.some((m) => n.includes(m))) s += 2;
    if (FEMALE_VOICES.some((f) => n.includes(f))) s -= 1;
  }
  return s;
}

/** 中文音色列表;preferMale=true 时男声(严肃感)排前 */
export function listChineseVoices(preferMale = false): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("zh"))
    .sort((a, b) => voiceScore(b, preferMale) - voiceScore(a, preferMale));
}

/** 固定面试官音色:试音页第 2 名(用户选定),列表不足时退回第 1 名 */
export function pickInterviewerVoice(): SpeechSynthesisVoice | null {
  const vs = listChineseVoices(true);
  return vs[1] ?? vs[0] ?? null;
}

/** 音色短名,如 "Xiaoxiao Online" */
export function shortVoiceName(v: SpeechSynthesisVoice): string {
  return v.name
    .replace(/^Microsoft /i, "")
    .replace(/\(Natural\)/i, "")
    .replace(/\(Mainland\)/i, "")
    .replace(/\s*-\s*Chinese.*$/i, "")
    .trim();
}

let audioEl: HTMLAudioElement | null = null;

/** 浏览器语音合成(试音页与兜底共用) */
export function speakBrowser(
  text: string,
  voice?: SpeechSynthesisVoice | null,
  opts?: { pitch?: number; rate?: number }
) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const ss = window.speechSynthesis;
  ss.cancel();
  try {
    ss.resume?.();
  } catch {
    /* noop */
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = opts?.rate ?? 1.02;
  u.pitch = opts?.pitch ?? 1;
  if (voice) u.voice = voice;
  window.setTimeout(() => {
    if (ss.paused) ss.resume();
    ss.speak(u);
  }, 60);
}

/** 朗读面试官的问题。服务端 TTS(火山接入后启用)2.5s 内没响应就退回浏览器音色 */
export async function speak(
  text: string,
  voice?: SpeechSynthesisVoice | null,
  opts?: { pitch?: number; rate?: number }
) {
  if (typeof window === "undefined") return;
  // 1) 服务端 TTS:真男声,跨浏览器一致(当前微软端点不稳定,火山 Key 到位后切换)
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`/api/tts?q=${encodeURIComponent(text)}`, {
      signal: ctrl.signal,
    });
    window.clearTimeout(timer);
    if (res.ok) {
      const blob = await res.blob();
      if (!blob.size) throw new Error("empty audio");
      const url = URL.createObjectURL(blob);
      if (audioEl) {
        audioEl.pause();
        URL.revokeObjectURL(audioEl.src);
      }
      audioEl = new Audio(url);
      audioEl.playbackRate = opts?.rate ?? 1.02;
      await audioEl.play().catch(() => {});
      return;
    }
  } catch {
    /* fall through */
  }
  // 2) 浏览器语音合成
  speakBrowser(text, voice, opts);
}

/** 停止朗读(提交回答、开始录音、离开面试舱时调用) */
export function stopSpeaking() {
  if (audioEl) {
    audioEl.pause();
    URL.revokeObjectURL(audioEl.src);
    audioEl = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
