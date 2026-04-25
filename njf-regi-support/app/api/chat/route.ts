import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID || "";

const SYSTEM_PROMPT = `You are a support AI for the NJF REGI cashier system.
Reference the attached manual documents to answer questions.
Show operation steps as numbered lists.
Do not guess if information is not in the manual.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, lang } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // Force language by injecting instruction into user's message
    const langInstruction = lang === "zh"
      ? "【重要指示】以下の質問に必ず簡体字中国語のみで回答してください。日本語・英語は使用禁止。回答は全て中国語で。\n\n"
      : "【重要指示】Please respond in Japanese only.\n\n";

    const input = messages.map((m: { role: string; content: string }, i: number) => {
      // Inject language instruction into every user message
      if (m.role === "user") {
        return {
          role: "user" as const,
          content: langInstruction + m.content,
        };
      }
      return { role: m.role as "user" | "assistant", content: m.content };
    });

    const tools: OpenAI.Responses.Tool[] = [];
    if (VECTOR_STORE_ID) {
      tools.push({
        type: "file_search",
        vector_store_ids: [VECTOR_STORE_ID],
      } as OpenAI.Responses.FileSearchTool);
    }

    const contactZh = "邮箱：support@njfregi.jp / 电话：03-XXXX-XXXX（工作日 9:00〜18:00）";
    const contactJa = "メール: support@njfregi.jp / 電話: 03-XXXX-XXXX（平日 9:00〜18:00）";

    const fullSystem = SYSTEM_PROMPT + (lang === "zh"
      ? `\nIf you cannot find the answer, say so in Chinese and provide: ${contactZh}`
      : `\nIf you cannot find the answer, say so in Japanese and provide: ${contactJa}`);

    const params: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: "gpt-4o",
      instructions: fullSystem,
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
    const cannotAnswerZh = outputText.includes("无法回答") || outputText.includes("找不到") || outputText.includes("没有相关");
    const couldNotAnswer = lang === "zh" ? cannotAnswerZh : cannotAnswerJa;

    return NextResponse.json({ answer: outputText, couldNotAnswer });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: lang === "zh" ? "AI服务连接失败，请稍后重试。" : "AIサービスに接続できませんでした。", couldNotAnswer: true },
      { status: 500 }
    );
  }
}
