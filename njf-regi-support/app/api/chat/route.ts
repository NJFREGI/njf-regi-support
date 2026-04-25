import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID || "";

const SYSTEM_PROMPT_JA = `You are a support AI for the NJF REGI system.
CRITICAL: You MUST respond in Japanese ONLY. Never use Chinese or English in your response.

Rules:
1. Reference the attached manual documents to answer
2. Respond in Japanese only - this is mandatory
3. Show operation steps as numbered lists
4. If information is not found in the manual, provide this contact info in Japanese:
   メール: support@njfregi.jp
   電話: 03-XXXX-XXXX（平日 9:00〜18:00）
5. Do not guess`;

const SYSTEM_PROMPT_ZH = `You are a support AI for the NJF REGI system.
CRITICAL: You MUST respond in Simplified Chinese ONLY. Never use Japanese (hiragana, katakana, or kanji with Japanese readings) or English in your response. All text must be Chinese.

Rules:
1. Reference the attached manual documents to answer
2. Respond in Simplified Chinese only - this is absolutely mandatory, no Japanese characters allowed
3. Show operation steps as numbered lists
4. If information is not found in the manual, provide this contact info in Chinese:
   邮箱：support@njfregi.jp
   电话：03-XXXX-XXXX（工作日 9:00〜18:00）
5. Do not guess`;

export async function POST(req: NextRequest) {
  try {
    const { messages, lang } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const systemPrompt = lang === "zh" ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_JA;

    const input = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const tools: OpenAI.Responses.Tool[] = [];
    if (VECTOR_STORE_ID) {
      tools.push({
        type: "file_search",
        vector_store_ids: [VECTOR_STORE_ID],
      } as OpenAI.Responses.FileSearchTool);
    }

    // Never use previous_response_id - always send full conversation to ensure language consistency
    const params: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: "gpt-4o",
      instructions: systemPrompt,
      input,
      ...(tools.length > 0 && { tools }),
    };

    const response = await openai.responses.create(params);

    const outputText = response.output
      .filter((item) => item.type === "message")
      .map((item) => {
        if (item.type === "message") {
          return item.content
            .filter((c) => c.type === "output_text")
            .map((c) => (c.type === "output_text" ? c.text : ""))
            .join("");
        }
        return "";
      })
      .join("");

    const cannotAnswerJa = outputText.includes("わかりません") || outputText.includes("情報が見つかりません");
    const cannotAnswerZh = outputText.includes("无法回答") || outputText.includes("找不到相关信息") || outputText.includes("手册中没有");
    const couldNotAnswer = lang === "zh" ? cannotAnswerZh : cannotAnswerJa;

    return NextResponse.json({ answer: outputText, responseId: response.id, couldNotAnswer });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: lang === "zh" ? "AI服务连接失败，请稍后重试。" : "AIサービスに接続できませんでした。", couldNotAnswer: true },
      { status: 500 }
    );
  }
}
