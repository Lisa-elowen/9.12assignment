import { Report, Turn } from "./types";

/** 模糊表达词库——压力下最先暴露的语言信号 */
export const FILLER_WORDS = [
  "其实",
  "可能",
  "大概",
  "然后",
  "就是",
  "额",
  "嗯",
  "那个",
  "反正",
  "好像",
  "差不多",
  "应该",
  "我觉得",
  "怎么说",
  "就是说",
  "对吧",
  "这个",
  "就是那个",
  "然后呢",
  "的话",
  "吧",
];

/** 结构信号词——回答有组织的标志 */
const STRUCTURE_MARKERS = [
  "首先",
  "其次",
  "第一",
  "第二",
  "第三",
  "最后",
  "总结",
  "结论",
  "因为",
  "所以",
  "具体来说",
  "举个例子",
  "一方面",
  "另一方面",
  "综上",
  "我认为",
  "核心是",
  "分三步",
];

export interface AnswerMetrics {
  wordCount: number;
  fillerCount: number;
  fillerRatio: number;
  hasStructure: boolean;
  logicScore: number;
  note: string;
}

export function findFillers(text: string): string[] {
  const found: string[] = [];
  for (const f of FILLER_WORDS) {
    let idx = text.indexOf(f);
    while (idx !== -1) {
      found.push(f);
      idx = text.indexOf(f, idx + f.length);
    }
  }
  return found;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** 对一段回答做语言层面的压力分析(纯本地,不依赖 LLM) */
export function analyzeAnswer(text: string): AnswerMetrics {
  const cleaned = text.replace(/\s+/g, "");
  const wordCount = cleaned.length;
  const fillers = findFillers(text);
  const fillerCount = fillers.length;
  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  const hasStructure = STRUCTURE_MARKERS.some((m) => text.includes(m));

  // 启发式逻辑分:基础分 + 内容长度 + 结构 - 模糊词惩罚
  let score = 5.5;
  if (wordCount >= 80) score += 1.2;
  else if (wordCount >= 40) score += 0.7;
  else if (wordCount < 15) score -= 1.5;
  if (hasStructure) score += 1.3;
  score -= Math.min(2.5, fillerRatio * 40);
  score = clamp(score, 1, 10);
  const logicScore = Math.round(score * 10) / 10;

  let note: string;
  if (wordCount === 0) note = "未作答";
  else if (fillerRatio >= 0.08) note = "模糊词明显偏多";
  else if (fillerRatio >= 0.04) note = "出现少量模糊表达";
  else if (wordCount < 15) note = "回答过于简短";
  else if (wordCount > 400) note = "回答冗长,重点不突出";
  else if (hasStructure) note = "结构清晰,表达稳定";
  else note = "表达尚可,结构可再清晰";

  return { wordCount, fillerCount, fillerRatio, hasStructure, logicScore, note };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 从 6 轮问答数据生成压力体检报告 */
export function computeReport(turns: Turn[]): Report {
  const early = turns.slice(0, 3);
  const late = turns.slice(3);

  const earlyFiller = avg(early.map((t) => t.fillerRatio));
  const lateFiller = avg(late.map((t) => t.fillerRatio));
  const earlyWords = avg(early.map((t) => t.wordCount));
  const lateWords = avg(late.map((t) => t.wordCount));
  const wordCollapse = Math.max(0, 1 - lateWords / Math.max(1, earlyWords));

  // 1) 表达稳定性:模糊词密度 + 后期退化惩罚
  const stability = Math.round(
    clamp(92 - (earlyFiller * 60 + lateFiller * 110) - wordCollapse * 18, 30, 96)
  );

  // 2) 逻辑组织:各轮逻辑分均值
  const logic = Math.round(
    clamp((avg(turns.map((t) => t.logicScore)) / 10) * 100, 30, 96)
  );

  // 3) 压力恢复:逻辑分走势——最低点与末轮的关系
  const scores = turns.map((t) => t.logicScore);
  const minScore = Math.min(...scores);
  const lastScore = scores[scores.length - 1];
  const recovery = Math.round(
    clamp(
      50 +
        (lastScore - minScore) * 9 +
        (lastScore >= minScore ? 8 : -12) -
        Math.max(0, 5.5 - minScore) * 6,
      35,
      96
    )
  );

  const overall = Math.round(0.34 * stability + 0.36 * logic + 0.3 * recovery);

  // 4) 逐轮压力指数 → 压力曲线 + 触发点
  const medWords = median(turns.map((t) => t.wordCount));
  const pressure = turns.map((t, i) =>
    clamp(
      t.fillerRatio * 220 +
        Math.max(0, (medWords - t.wordCount) / Math.max(1, medWords)) * 60 +
        (i >= 3 ? 12 : 0) +
        (t.isChallenge ? 10 : 0) +
        (t.timedOut ? 25 : 0),
      8,
      100
    )
  );
  const curve = pressure.map((v, i) => ({
    round: i + 1,
    label: turns[i].tag,
    value: Math.round(v),
  }));

  const peakIdx = pressure.indexOf(Math.max(...pressure));
  const peakTurn = turns[peakIdx];
  const trigger = {
    round: peakIdx + 1,
    label: peakTurn.tag,
    detail: peakTurn.timedOut
      ? `第${peakIdx + 1}轮「${peakTurn.tag}」,限时内未完成回答——时间压力下无法组织语言。`
      : `第${peakIdx + 1}轮「${peakTurn.tag}」,模糊词占比 ${(
          peakTurn.fillerRatio * 100
        ).toFixed(0)}%,${
          wordCollapse > 0.15
            ? `回答长度较前3轮平均下降 ${Math.round(wordCollapse * 100)}%`
            : "回答质量出现明显波动"
        }。`,
  };

  // 5) 崩溃点:模糊词最多的回答
  const worst = turns.reduce((a, b) =>
    b.fillerRatio > a.fillerRatio ? b : a
  );
  const worstFillers = findFillers(worst.answer);
  const crashQuote =
    worstFillers.length >= 2
      ? {
          round: turns.indexOf(worst) + 1,
          text: worst.answer,
          fillers: worstFillers,
        }
      : null;

  // 6) 针对性训练建议
  const suggestions: string[] = [];
  if (lateFiller > earlyFiller + 0.02) {
    suggestions.push(
      "连续追问下表达退化:每天做10分钟「为什么」练习——回答前强制按「结论→理由→证据」三步组织语言"
    );
  }
  if (avg(turns.map((t) => t.fillerRatio)) >= 0.05) {
    suggestions.push(
      "模糊词偏多:录下自己的回答回听,每次出现「其实/可能/大概」就停下来重说一遍该句"
    );
  }
  if (avg(turns.map((t) => t.wordCount)) < 40) {
    suggestions.push(
      "回答太单薄:用 STAR 结构(情境-任务-行动-结果)把每段回答扩充到 80 字以上"
    );
  }
  if (logic < 70) {
    suggestions.push("逻辑分偏低:练习「结论先行」——先给观点,再给论据,最后给例证");
  }
  if (recovery < 65) {
    suggestions.push(
      "被质疑后恢复慢:专项练习连续接受 3 轮质疑,每次先停顿 2 秒再回答"
    );
  }
  if (minScore < 5) {
    suggestions.push(
      `存在明显崩溃点(「${trigger.label}」):针对该主题做 5 次专项追问训练,直到模糊词占比降到 3% 以下`
    );
  }
  if (turns.some((t) => t.timedOut)) {
    suggestions.push(
      "存在超时未答完的轮次:练习「结论先行」——先给核心观点再展开,60 秒内说清要点"
    );
  }
  if (suggestions.length === 0) {
    suggestions.push("基础扎实:下一阶段挑战更高压的连续质疑训练,把稳定输出变成肌肉记忆");
  }
  suggestions.push(
    `下次训练任务:同场景下接受 6 连追问,目标——模糊词占比降到 3% 以下,全程保持「结论先行」`
  );

  return {
    stability,
    logic,
    recovery,
    overall,
    trigger,
    crashQuote,
    curve,
    suggestions: suggestions.slice(0, 4),
  };
}

/** 按综合分给等级名 */
export function levelName(overall: number): string {
  if (overall >= 85) return "稳定输出者";
  if (overall >= 70) return "抗压良好";
  if (overall >= 55) return "有提升空间";
  return "压力易感";
}
