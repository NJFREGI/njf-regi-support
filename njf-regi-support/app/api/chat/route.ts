import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID || "";

export async function POST(req: NextRequest) {
  let lang = "ja";
  try {
    const body = await req.json();
    const { messages } = body;
    lang = body.lang || "ja";

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const formatRule = `
Format rules (MUST follow):
- For numbered steps, use this exact format (title and detail on separate lines):
  1. Step title
     - detail description
  2. Step title
     - detail description
- Never put the detail on the same line as the number
- Use - for bullet points under each step
- Do NOT use ** bold markers inside step titles`;

    const systemPrompt = lang === "zh"
      ? `You are a support AI for NJF REGI. Reply in Simplified Chinese (简体中文) ONLY. No Japanese. No Traditional Chinese. Reference the attached manuals.${formatRule}`
      : `You are a support AI for NJF REGI. Reply in Japanese ONLY. Reference the attached manuals.${formatRule}`;

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

    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions: systemPrompt,
      input,
      ...(tools.length > 0 && { tools }),
    });

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

    return NextResponse.json({ answer: outputText, couldNotAnswer: false });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: lang === "zh" ? "AI服务连接失败，请稍后重试。" : "AIサービスに接続できませんでした。", couldNotAnswer: true },
      { status: 500 }
    );
  }
}
