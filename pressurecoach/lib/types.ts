export type Scenario = "intern" | "grad" | "deepdive";
export type Mode = "normal" | "pressure";

export const TOTAL_ROUNDS = 6;

export const SCENARIOS: Record<
  Scenario,
  { name: string; desc: string; icon: string; tag: string }
> = {
  intern: {
    name: "大厂实习综合面",
    desc: "自我介绍 · 项目经历 · 团队合作 · 困难解决",
    icon: "💼",
    tag: "互联网技术岗",
  },
  grad: {
    name: "保研复试",
    desc: "学术经历 · 研究兴趣 · 专业理解",
    icon: "🎓",
    tag: "推免复试",
  },
  deepdive: {
    name: "项目深挖",
    desc: "围绕你的项目连续追问真实性",
    icon: "🎯",
    tag: "所有岗位",
  },
};

export const MODES: Record<Mode, { name: string; desc: string; icon: string }> = {
  normal: { name: "普通模拟", desc: "正常交流节奏,温和提问", icon: "😌" },
  pressure: {
    name: "压力模拟",
    desc: "连续追问 · 挑战观点 · 要求具体化",
    icon: "🔥",
  },
};

export interface Turn {
  question: string;
  answer: string;
  durationSec: number;
  responseLatencySec: number; // 提问到首次开口/输入的犹豫时长
  wordCount: number;
  fillerCount: number;
  fillerRatio: number;
  hasStructure: boolean;
  logicScore: number; // 1-10
  note: string; // AI/规则对回答的观察
  tag: string; // 本轮标签,如「数据质疑」
  isChallenge: boolean; // 是否为施压式追问
  timedOut: boolean; // 是否限时内未完成回答
}

/** 每轮回答限时(秒):普通模式宽松,压力模式逐段收紧制造时间压迫 */
export function timeLimitFor(mode: Mode, round: number): number {
  if (mode === "normal") return 150;
  return round <= 3 ? 90 : 60;
}

export interface Report {
  stability: number; // 0-100 表达稳定性
  logic: number; // 0-100 逻辑组织能力
  recovery: number; // 0-100 压力恢复能力
  overall: number; // 0-100 综合
  trigger: { round: number; label: string; detail: string } | null;
  crashQuote: { round: number; text: string; fillers: string[] } | null;
  curve: { round: number; label: string; value: number }[];
  hexagon?: { label: string; value: number }[]; // 六维能力雷达图数据(旧存档可能没有)
  fillerBreakdown?: { word: string; count: number; advice: string }[]; // 高频语气词明细(旧存档可能没有)
  suggestions: string[];
}

export interface Session {
  id: string;
  at: number;
  scenario: Scenario;
  mode: Mode;
  resume: string;
  turns: Turn[];
  report: Report;
  usedAI: boolean;
}
