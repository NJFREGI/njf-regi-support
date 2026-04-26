import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const FALLBACK_CONTENT = `
【麻辣湯の計量・会計フロー / 麻辣烫称重结账流程】
手順1/步骤1：風袋引き後、前払モードで麻辣湯/100gを選択 / 去皮后进入前払モード选择商品
手順2/步骤2：辛さ選択後「計量」クリック / 选辣度后点击"计量"
手順3/步骤3：重量入力→「確定」/ 输入重量→"确定"
手順4/步骤4：注文確認→「会計」/ 确认订单→"会計"
手順5/步骤5：支払方法選択→受取金額入力 / 选支付方式→输入金额
手順6/步骤6：お釣り確認→「確定」/ 确认找零→"确定"
手順7/步骤7：レシート/領収書印刷 / 打印小票或领收书

【精算フロー / 交班流程】
手順1/步骤1：「精算」クリック / 点击"精算"
手順2/步骤2：集計データ確認 / 核对汇总数据
手順3/步骤3：現金確認→紙幣枚数入力 / 现金确认→输入张数
手順4/步骤4：「精算」クリック完了 / 点击"精算"完成
手順5/步骤5：準備金確認後シャットダウン可 / 出现准备金确认后可关机

【返会計・再印刷 / 反结账补打】
再印刷/补打：注文履歴→前払注文履歴→注文選択→印刷
返会計/反结账：注文履歴→前払注文履歴→編集→返金確認→取消
`;

const FORMAT_RULE = `
Format rules:
- Number each step: 1. 2. 3.
- Step title max 8 characters, short and clear
- Put details as bullet points on next line
- Example:
  1. 短い題名
     - 詳細説明
- Never put long text as step title`;

async function getManualContent(lang: string): Promise<string> {
  try {
    const bothFiles = await redis.get<string[]>("manual:files:both") || [];
    const langFiles = await redis.get<string[]>(`manual:files:${lang}`) || [];
    const allFiles = [...bothFiles, ...langFiles];

    if (allFiles.length === 0) return FALLBACK_CONTENT;

    const contents: string[] = [];
    for (const filename of allFiles) {
      const bothContent = await redis.get<string>(`manual:both:${filename}`);
      const langContent = await redis.get<string>(`manual:${lang}:${filename}`);
      if (bothContent) contents.push(bothContent);
      if (langContent) contents.push(langContent);
    }

    return contents.length > 0 ? contents.join("\n\n") : FALLBACK_CONTENT;
  } catch {
    return FALLBACK_CONTENT;
  }
}

export async function POST(req: NextRequest) {
  let lang = "ja";
  try {
    const body = await req.json();
    const { messages } = body;
    lang = body.lang || "ja";

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const manualContent = await getManualContent(lang);

    const systemPrompt = lang === "zh"
      ? `你是NJF REGI收银系统的AI客服。必须只用简体中文回答，禁止日语。参考以下手册内容：\n${manualContent}\n${FORMAT_RULE}`
      : `あなたはNJF REGIシステムのAIサポートです。必ず日本語のみで回答してください。英語・中国語禁止。以下のマニュアルを参照してください：\n${manualContent}\n${FORMAT_RULE}`;

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
    console.error("API error:", error);
    return NextResponse.json(
      { error: lang === "zh" ? "AI服务连接失败，请稍后重试。" : "AIサービスに接続できませんでした。", couldNotAnswer: true },
      { status: 500 }
    );
  }
}
