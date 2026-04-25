import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const MANUAL_CONTENT = `
【麻辣烫称重与结账流程】
标准流程：选商品 → 选辣度 → 计量 → 输入重量 → 选择堂食/外带 → 会计 → 选择支付方式 → 输入实收金额 → 确认 → 打印
重要提示：称重前一定要先去皮。

步骤1：先去皮，进入前払モード，选择麻辣湯/100g等称重商品
步骤2：选择辣度（不辣、少辣、辣、激辣），点击"计量"
步骤3：输入实际克数，点击"确定"
步骤4：核对订单，点击"会計"
步骤5：选择支付方式，输入实收金额
步骤6：确认找零，点击"确定"
步骤7：打印小票或领收书

【交班流程】
步骤1：点击"精算"进入交班页面
步骤2：核对当班汇总数据
步骤3：点击"现金確認"，输入各面额张数
步骤4：点击"精算"完成交班
步骤5：出现"準備金確認"后可直接关机

【补打与反结账流程】
补打：注文履歴 → 前払注文履歴 → 找订单 → 打印结账单/领收书
反结账：注文履歴 → 前払注文履歴 → 找订单 → 编辑 → 确认退款 → 退菜/整单取消
`;

const FORMAT_RULE = `
Format rules (MUST follow strictly):
- Number each step: 1. 2. 3.
- Step title MUST be SHORT (max 8 characters). Put details on the next line as bullet points.
- Format:
  1. 简短标题
     - 详细说明不超过20字
  2. 简短标题
     - 详细说明
- Never put long sentences as step titles
- Use - for bullet points under each step`;

export async function POST(req: NextRequest) {
  let lang = "ja";
  try {
    const body = await req.json();
    const { messages } = body;
    lang = body.lang || "ja";

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const systemPrompt = lang === "zh"
      ? `你是NJF REGI收银系统的AI客服。必须只用简体中文回答，禁止日语。参考以下手册内容：\n${MANUAL_CONTENT}\n${FORMAT_RULE}`
      : `あなたはNJF REGIシステムのAIサポートです。必ず日本語のみで回答してください。英語・中国語禁止。以下のマニュアルを参照してください：\n${MANUAL_CONTENT}\n${FORMAT_RULE}`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);

    const data = await response.json();
    const outputText = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ answer: outputText, couldNotAnswer: false });
  } catch (error) {
    console.error("DeepSeek API error:", error);
    return NextResponse.json(
      { error: lang === "zh" ? "AI服务连接失败，请稍后重试。" : "AIサービスに接続できませんでした。", couldNotAnswer: true },
      { status: 500 }
    );
  }
}
