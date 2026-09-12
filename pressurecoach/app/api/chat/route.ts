import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, buildInterviewerRequest } from "@/lib/prompts";
import { TOTAL_ROUNDS, Turn } from "@/lib/types";

/**
 * LLM 面试官代理:兼容 OpenAI 格式的接口(豆包 / DeepSeek 等)。
 * 未配置环境变量时返回 503,前端自动降级为内置离线模式。
 */

function inferTag(round: number): string {
  if (round === 1) return "自我介绍";
  if (round <= 3) return "项目经历";
  return "压力追问";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scenario,
      mode,
      resume,
      turns,
      round,
    }: {
      scenario: string;
      mode: string;
      resume: string;
      turns: Turn[];
      round: number;
    } = body;

    const base = process.env.LLM_BASE_URL;
    const key = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    if (!base || !key || !model) {
      return NextResponse.json({ error: "no_key" }, { status: 503 });
    }

    const messages: { role: string; content: string }[] = [
      { role: "system", content: buildSystemPrompt(scenario as any, mode as any, resume) },
    ];
    for (const t of turns) {
      messages.push({ role: "user", content: t.answer });
      messages.push({ role: "assistant", content: t.question });
    }
    messages.push({ role: "user", content: buildInterviewerRequest(round, TOTAL_ROUNDS) });

    let res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: mode === "pressure" ? 0.75 : 0.5,
        response_format: { type: "json_object" },
      }),
    });

    // 部分模型不支持 response_format,去掉后重试一次
    if (res.status === 400) {
      res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: mode === "pressure" ? 0.75 : 0.5,
        }),
      });
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return NextResponse.json(
        { error: "llm_error", detail },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed.question !== "string") {
      parsed = {
        question: content.trim().slice(0, 120) || "请继续。",
        logicScore: 5,
        note: "",
      };
    }

    return NextResponse.json({
      question: String(parsed.question).slice(0, 200),
      logicScore: Number(parsed.logicScore) || 5,
      note: String(parsed.note || "").slice(0, 30),
      tag: inferTag(round),
      challenge: round >= 4,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", detail: String(e?.message ?? e).slice(0, 300) },
      { status: 500 }
    );
  }
}
