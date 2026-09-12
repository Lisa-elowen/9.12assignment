import { Mode, Scenario } from "./types";
import { analyzeAnswer } from "./analysis";

/**
 * 离线演示模式:未配置 LLM API Key 时的内置面试脚本。
 * 保证产品在任何情况下都能完整跑通闭环。
 */

interface ScriptedQ {
  q: string;
  tag: string;
  challenge: boolean;
}

const SCRIPT: Record<Scenario, { normal: ScriptedQ[]; pressure: ScriptedQ[] }> = {
  intern: {
    normal: [
      { q: "先做个自我介绍吧,重点说说你的技术方向和最擅长的部分。", tag: "自我介绍", challenge: false },
      { q: "挑一个你最有代表性的项目,讲讲你在里面具体做了什么。", tag: "项目经历", challenge: false },
      { q: "这个项目里遇到的最大困难是什么?你是怎么解决的?", tag: "项目经历", challenge: false },
      { q: "你刚才说的成果有具体数据支撑吗?是怎么衡量出来的?", tag: "数据追问", challenge: true },
      { q: "如果让你重做这个项目,你最想改哪里?为什么?", tag: "方案追问", challenge: true },
      { q: "你认为自己相比其他候选人,最大的优势是什么?", tag: "收尾", challenge: false },
    ],
    pressure: [
      { q: "自我介绍,限90秒,不要念简历,说重点。", tag: "自我介绍", challenge: true },
      { q: "挑一个你简历上最重要的项目,讲清楚你个人做了什么。", tag: "项目经历", challenge: false },
      { q: "你说遇到了困难——具体是什么困难?你的方案和别人有什么不同?", tag: "项目追问", challenge: true },
      { q: "你刚才提到提升30%,这个数字怎么测出来的?口径是什么?不要用「大概」。", tag: "数据质疑", challenge: true },
      { q: "听起来这更像是团队成果。你个人的具体贡献,用三个点说清楚。", tag: "贡献质疑", challenge: true },
      { q: "为什么不用更成熟的方案?你的技术选型是不是只是因为顺手?", tag: "选型挑战", challenge: true },
    ],
  },
  grad: {
    normal: [
      { q: "先介绍一下你的学术背景和你感兴趣的研究方向。", tag: "自我介绍", challenge: false },
      { q: "为什么对这个研究方向感兴趣?是什么契机让你确定下来的?", tag: "研究兴趣", challenge: false },
      { q: "讲讲你印象最深的一段科研或课程项目经历。", tag: "学术经历", challenge: false },
      { q: "这段经历里,哪些工作是你独立完成的?方法是谁选的?", tag: "贡献追问", challenge: true },
      { q: "这个方向最近有什么重要的前沿进展?挑一个说说你的理解。", tag: "专业追问", challenge: true },
      { q: "如果读研,你未来三年的研究规划是什么?", tag: "收尾", challenge: false },
    ],
    pressure: [
      { q: "自我介绍,重点讲学术背景,不要说兴趣爱好。", tag: "自我介绍", challenge: true },
      { q: "你刚才说对这个方向感兴趣——读过几篇该领域的重要论文?挑一篇说清楚核心方法。", tag: "研究兴趣", challenge: true },
      { q: "讲你做过的一段研究,说清楚:问题、方法、结果,各一句话。", tag: "学术经历", challenge: true },
      { q: "你用的这个方法,真的理解它的原理吗?用大白话给我解释一遍。", tag: "原理质疑", challenge: true },
      { q: "这个实验设计有什么缺陷?如果你是审稿人,会怎么攻击它?", tag: "实验挑战", challenge: true },
      { q: "如果你心仪的导师让你换方向,你怎么办?", tag: "压力收尾", challenge: true },
    ],
  },
  deepdive: {
    normal: [
      { q: "用一句话介绍你的项目:它解决什么问题?", tag: "项目概述", challenge: false },
      { q: "你在项目里担任什么角色?具体负责哪部分?", tag: "角色定位", challenge: false },
      { q: "技术方案为什么这么选?当时对比过哪些方案?", tag: "技术选型", challenge: false },
      { q: "这个项目的效果是怎么验证的?有没有对照组?", tag: "数据追问", challenge: true },
      { q: "你觉得这个项目最大的风险或隐患在哪里?", tag: "风险追问", challenge: true },
      { q: "如果现在给你一周时间,你会优先改进什么?", tag: "收尾", challenge: false },
    ],
    pressure: [
      { q: "一句话说清楚:你的项目解决什么问题?说不清楚就说明没想清楚。", tag: "项目概述", challenge: true },
      { q: "你在项目里的角色?说清楚哪些代码是你写的,哪些是别人的。", tag: "角色定位", challenge: true },
      { q: "为什么选这个技术方案?说两个你对比过的方案,以及你否决它们的理由。", tag: "技术选型", challenge: true },
      { q: "你的效果指标怎么测的?基线是什么?有对照组吗?没有就直说。", tag: "数据质疑", challenge: true },
      { q: "如果线上环境你的方案失效了,你第一反应是什么?", tag: "应急挑战", challenge: true },
      { q: "诚实一点:这个项目里哪部分是包装的?哪部分是真实做的?", tag: "真实性质疑", challenge: true },
    ],
  },
};

export interface OfflineQ {
  question: string;
  tag: string;
  challenge: boolean;
  logicScore: number;
  note: string;
}

/** 取离线脚本的下一题,并根据上一轮回答做启发式评分 */
export function offlineNextQuestion(
  scenario: Scenario,
  mode: Mode,
  round: number, // 1-based,表示即将提出的第几题
  lastAnswer: string
): OfflineQ {
  const list = SCRIPT[scenario][mode];
  const item = list[Math.min(round - 1, list.length - 1)];
  const metrics = analyzeAnswer(lastAnswer);
  return {
    question: item.q,
    tag: item.tag,
    challenge: item.challenge,
    logicScore: metrics.logicScore,
    note: metrics.note,
  };
}
