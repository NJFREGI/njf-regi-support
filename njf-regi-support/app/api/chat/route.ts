import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID || "";

const SYSTEM_PROMPT_JA = `あなたはNJF REGIシステムのサポートAIです。
【必須】回答は必ず日本語のみで行ってください。中国語・英語は一切使わないでください。

回答ルール:
1. 添付マニュアルを参照して回答する
2. 日本語のみで簡潔・丁寧に答える
3. 操作手順は番号付きリストで示す
4. マニュアルに情報がない場合は以下を案内:
   メール: support@njfregi.jp
   電話: 03-XXXX-XXXX（平日 9:00〜18:00）
5. 推測で回答しない`;

const SYSTEM_PROMPT_ZH = `你是NJF REGI收银系统的AI客服。
【必须】只能用简体中文回答，严禁出现任何日文字符（包括平假名、片假名、汉字日文读音）。

回答规则：
1. 参考上传的操作手册进行回答
2. 只用简体中文，步骤用编号列表
3. 联系方式只能写成以下格式（中文）：
   邮箱：support@njfregi.jp
   电话：03-XXXX-XXXX（工作日 9:00〜18:00）
4. 不确定时如实说明，不要猜测`;

export async function POST(req: NextRequest) {
  try {
    const { messages, previousResponseId, lang } = await req.json();

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

    const params: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: "gpt-4o",
      instructions: systemPrompt,
      input,
      ...(tools.length > 0 && { tools }),
      ...(previousResponseId && { previous_response_id: previousResponseId }),
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

    // Only show contact card if AI explicitly says it can't answer
    // Don't trigger just because contact info appears in the answer
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
