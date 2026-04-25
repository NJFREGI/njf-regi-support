import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID || "";

const SYSTEM_PROMPT = `あなたはNJF REGIシステムの日本語サポートAIです。
お客様のシステム操作に関する質問に、わかりやすく丁寧に答えてください。

回答のルール:
1. 添付されたマニュアル・FAQドキュメントを必ず参照して回答する
2. 日本語で簡潔かつ丁寧に答える
3. 操作手順は番号付きリストで示す
4. ドキュメントに情報が見つからない場合は「この件はサポートスタッフにお問い合わせください」と伝え、人工サポートの連絡先を案内する
5. 推測で回答しない。不明な場合は正直に伝える

人工サポートの連絡先（わからない場合に必ず案内）:
- メール: support@njfregi.jp
- 電話: 03-XXXX-XXXX（平日 9:00〜18:00）
- チャット: https://support.njfregi.jp/contact`;

export async function POST(req: NextRequest) {
  try {
    const { messages, previousResponseId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content;
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message" }, { status: 400 });
    }

    // Build input for Responses API
    const input = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Configure tools
    const tools: OpenAI.Responses.Tool[] = [];
    if (VECTOR_STORE_ID) {
      tools.push({
        type: "file_search",
        vector_store_ids: [VECTOR_STORE_ID],
      } as OpenAI.Responses.FileSearchTool);
    }

    // Call OpenAI Responses API
    const params: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: "gpt-4o",
      instructions: SYSTEM_PROMPT,
      input,
      ...(tools.length > 0 && { tools }),
      ...(previousResponseId && { previous_response_id: previousResponseId }),
    };

    const response = await openai.responses.create(params);

    // Extract text output
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

    // Check if answer could not be found
    const couldNotAnswer =
      outputText.includes("サポートスタッフ") ||
      outputText.includes("お問い合わせ") ||
      outputText.includes("わかりません") ||
      outputText.includes("見つかりません");

    return NextResponse.json({
      answer: outputText,
      responseId: response.id,
      couldNotAnswer,
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      {
        error: "AIサービスに接続できませんでした。しばらく後でお試しください。",
        couldNotAnswer: true,
      },
      { status: 500 }
    );
  }
}
