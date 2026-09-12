import { NextRequest, NextResponse } from "next/server";

/**
 * 面试官语音合成:微软 Edge 在线神经语音(免费、无需账号、跨浏览器一致)。
 * 直接走 REST 端点(不走 websocket,快且稳)。
 * 固定严肃男声「云健」;可用环境变量 TTS_VOICE 覆盖。
 * 备选:zh-CN-YunyangNeural(新闻男) zh-CN-YunxiNeural(青年男) zh-CN-YunfengNeural(大叔男)
 */
const INTERVIEWER_VOICE = process.env.TTS_VOICE || "zh-CN-YunjianNeural";

// Edge Read Aloud 的公开静态 token(与 msedge-tts 同款,无需动态获取)
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

async function synthesize(text: string): Promise<ArrayBuffer> {
  const ssml = `<speak version='1.0' xml:lang='zh-CN'><voice name='${INTERVIEWER_VOICE}'><prosody pitch='-2Hz' rate='+6%'>${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</prosody></voice></speak>`;
  const res = await fetch(
    `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      },
      body: ssml,
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`synth_failed ${res.status}`);
  return res.arrayBuffer();
}

export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 300);
  if (!text.trim()) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }
  try {
    const buf = await synthesize(text);
    if (!buf.byteLength) throw new Error("empty_audio");
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "tts_failed", detail: String(e) },
      { status: 502 }
    );
  }
}
