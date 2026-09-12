import { Mode, Persona } from "./types";

/**
 * 实时微干预引擎:在候选人回答中途,随机发动不可预测的突发状况,
 * 还原真实面试里的失控瞬间——打断、换题、要求举例、质疑、沉默、超纲题。
 */

export type InterventionKind =
  | "interrupt"
  | "switch"
  | "example"
  | "challenge"
  | "silence"
  | "wildcard";

export interface Intervention {
  kind: InterventionKind;
  label: string;
  text: string;
}

const BANK: Intervention[] = [
  {
    kind: "interrupt",
    label: "突然打断",
    text: "面试官突然打断:停一下——你刚才那句话太虚了,说具体点,到底是做了什么、结果是多少?",
  },
  {
    kind: "switch",
    label: "突然换题",
    text: "面试官突然换题:这个问题先放一放。换一个——如果这个项目预算砍掉一半,你怎么保交付?",
  },
  {
    kind: "example",
    label: "要求举例",
    text: "面试官要求举例:别讲方法论了,给我一个你亲手处理过的真实例子,说细节。",
  },
  {
    kind: "challenge",
    label: "质疑否定",
    text: "面试官质疑:你这个结论站不住脚吧?这个数据口径是怎么来的?换个角度,我完全可以说它是反的。",
  },
  {
    kind: "silence",
    label: "长时间沉默",
    text: "面试官陷入了沉默……(一直盯着你,没有接话的意思——你继续说,还是停在这里?)",
  },
  {
    kind: "wildcard",
    label: "完全不会的题",
    text: "面试官抛出一道超纲题:这个问题你大概率完全没接触过——但我想看看你的思考框架,开始吧。",
  },
];

/** 触发概率:压力模式/高压人格更频繁 */
export function interventionChance(mode: Mode, persona: Persona): number {
  if (mode === "pressure" && persona === "tough") return 0.65;
  if (mode === "pressure") return 0.5;
  if (persona === "tough" || persona === "curious") return 0.3;
  return 0.15;
}

/** 触发时机:进入回答后 8~20 秒(压力模式更早) */
export function interventionDelay(mode: Mode): number {
  const [lo, hi] = mode === "pressure" ? [7000, 14000] : [10000, 20000];
  return lo + Math.random() * (hi - lo);
}

/** 随机抽一个干预(同轮内不重复) */
export function rollIntervention(usedKinds: Set<InterventionKind>): Intervention {
  const pool = BANK.filter((b) => !usedKinds.has(b.kind));
  const from = pool.length > 0 ? pool : BANK;
  return from[Math.floor(Math.random() * from.length)];
}
