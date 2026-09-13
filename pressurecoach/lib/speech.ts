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

/** 本机离线中文音色(不依赖网络;微软在线语音服务不可达时的兜底)。男声优先,贴近"严肃面试官"。 */
const LOCAL_MALE_NAMES = ["kangkang"];

function localVoiceScore(v: SpeechSynthesisVoice): number {
  return LOCAL_MALE_NAMES.some((m) => v.name.toLowerCase().includes(m)) ? 2 : 1;
}

export function listLocalChineseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("zh") && v.localService)
    .sort((a, b) => localVoiceScore(b) - localVoiceScore(a));
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

let pendingFinish: (() => void) | null = null;

/** 上次成功出声的本机离线音色;在线音色已证明不可用时,后续直接用它,避免每问都重试等待 */
let lastGoodLocal: SpeechSynthesisVoice | null = null;

/** 浏览器语音合成(试音页与兜底共用)。返回 Promise,朗读结束/失败/被停止时 resolve。
 *  兜底链:指定音色 → 本机离线音色 → 系统默认音色(不指定)。 */
export function speakBrowser(
  text: string,
  voice?: SpeechSynthesisVoice | null,
  opts?: { pitch?: number; rate?: number }
): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  const ss = window.speechSynthesis;
  ss.cancel();
  try {
    ss.resume?.();
  } catch {
    /* noop */
  }
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (pendingFinish === finish) pendingFinish = null;
      resolve();
    };
    pendingFinish = finish;
    const tried = new Set<string>();
    let watch = 0;
    const attempt = (idx: number) => {
      if (settled || idx > 2) return finish();
      let v: SpeechSynthesisVoice | null = null;
      if (idx === 0) {
        v = voice ?? listLocalChineseVoices()[0] ?? null;
        // 上次已证明在线音色不出声:这次直接用本机离线音色
        if (lastGoodLocal && v && !v.localService) v = lastGoodLocal;
      } else if (idx === 1) {
        const l = listLocalChineseVoices()[0];
        v = l && !tried.has(l.name) ? l : null;
      }
      // idx === 2:v 保持 null,交给系统默认音色
      const key = v ? v.name : "";
      if (tried.has(key)) return attempt(idx + 1);
      tried.add(key);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = opts?.rate ?? 1.02;
      u.pitch = opts?.pitch ?? 1;
      if (v) u.voice = v;
      const detach = () => {
        u.onend = null;
        u.onerror = null;
      };
      const next = () => {
        detach();
        window.clearTimeout(watch);
        try {
          ss.cancel();
        } catch {
          /* noop */
        }
        attempt(idx + 1);
      };
      u.onend = () => {
        detach();
        if (v && v.localService) lastGoodLocal = v;
        finish();
      };
      u.onerror = () => next();
      window.setTimeout(() => {
        if (settled) return;
        if (ss.paused) ss.resume();
        ss.speak(u);
        // 静默失败探测:1.2s 后仍未进入朗读状态(在线音色网络不可达、cancel/speak 竞态)则换下一个音色
        watch = window.setTimeout(() => {
          if (!settled && !ss.speaking) next();
        }, 1200);
        // 保险:某些浏览器不触发 onend
        window.setTimeout(finish, 30000);
      }, 60);
    };
    attempt(0);
  });
}

/* ── 服务端 TTS 熔断:连续失败 2 次后,本会话不再等待服务端(每问省 1~2 秒) ── */
const TTS_BREAKER_KEY = "pressurecoach:tts-server-off";
let serverTtsFails = 0;

function serverTtsDisabled(): boolean {
  try {
    return sessionStorage.getItem(TTS_BREAKER_KEY) === "1";
  } catch {
    return false;
  }
}

function markServerTtsFailed() {
  serverTtsFails += 1;
  if (serverTtsFails >= 2) {
    try {
      sessionStorage.setItem(TTS_BREAKER_KEY, "1");
    } catch {
      /* noop */
    }
  }
}

/** 朗读面试官的问题。服务端 TTS 失败(或自动播放被拦截)时回退浏览器语音;返回朗读结束的 Promise */
export async function speak(
  text: string,
  voice?: SpeechSynthesisVoice | null,
  opts?: { pitch?: number; rate?: number }
): Promise<void> {
  if (typeof window === "undefined") return;
  // 1) 服务端 TTS(当前微软端点不稳定,火山 Key 到位后切换;失败快速熔断)
  if (!serverTtsDisabled()) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 2000);
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
        return new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            if (pendingFinish === finish) pendingFinish = null;
            resolve();
          };
          pendingFinish = finish;
          // 自动播放被拦截 / 解码失败:回退浏览器语音,而不是静默结束
          const fallback = () => {
            if (done) return;
            done = true;
            if (pendingFinish === finish) pendingFinish = null;
            if (audioEl) {
              audioEl.pause();
              URL.revokeObjectURL(audioEl.src);
              audioEl = null;
            }
            speakBrowser(text, voice, opts).then(resolve);
          };
          audioEl!.onended = finish;
          audioEl!.onerror = fallback;
          audioEl!.play().catch(fallback);
        });
      }
      markServerTtsFailed();
    } catch {
      markServerTtsFailed();
    }
  }
  // 2) 浏览器语音合成(在线音色 → 本机离线音色 → 系统默认,逐级兜底)
  return speakBrowser(text, voice, opts);
}

/** 停止朗读(提交回答、开始录音、离开面试舱时调用);会 resolve 未完成的朗读 Promise */
export function stopSpeaking() {
  if (audioEl) {
    audioEl.pause();
    URL.revokeObjectURL(audioEl.src);
    audioEl = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  pendingFinish?.();
}
