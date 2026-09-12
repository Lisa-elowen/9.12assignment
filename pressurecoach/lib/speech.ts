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
    rec.onerror = () => {
      this.started = false;
      this.onEnd();
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

let currentVoice: SpeechSynthesisVoice | null = null;

/** 初始化:挑一个中文音色(音色列表异步加载,监听变化) */
export function initVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const pick = () => {
    const voices = window.speechSynthesis.getVoices();
    currentVoice =
      voices.find((v) => v.lang === "zh-CN") ??
      voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ??
      null;
  };
  pick();
  window.speechSynthesis.addEventListener?.("voiceschanged", pick);
}

/** 朗读面试官的问题(会先停掉上一次朗读) */
export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 1.05;
  if (currentVoice) u.voice = currentVoice;
  window.speechSynthesis.speak(u);
}

/** 停止朗读(提交回答、开始录音、离开面试舱时调用) */
export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
