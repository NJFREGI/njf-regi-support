import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const MANUAL_CONTENT = `
以下はNJF REGIシステムの操作マニュアルの内容です：

【麻辣烫称重与结账流程】
标准流程：选商品 → 选辣度 → 计量 → 输入重量 → 选择堂食/外带 → 会计 → 选择支付方式 → 输入实收金额 → 确认 → 打印
重要提示：称重前一定要先去皮，再进行计量与结账操作。

步骤1：先去皮，进入前払モード，在右侧分类中选择麻辣湯/100g等称重商品
步骤2：点击商品后弹出规格选择窗口，选择辣度（不辣、少辣、辣、激辣），确认后点击"计量"
步骤3：在重量输入窗口中输入实际称重克数，点击"确定"
步骤4：重量确认后商品加入订单列表，核对无误后点击右下角"会計"
步骤5：选择支付方式（現金払い/STORES/クレジット/電子マネー/ポイント/スマート支払/組合決済），输入实收金额
步骤6：确认找零后点击"确定"完成收款
步骤7：可选择"レシート印刷"打印小票或"領収書印刷"打印领收书

【交班流程】
步骤1：桌面点击"精算"进入交班页面
步骤2：核对当班汇总数据（支付方式统计、已精算金额、未精算金额、合计金额、人数、客单价）
步骤3：点击"现金確認"，按实际点钞结果输入各面额张数，确认后点击"确定"
步骤4：点击右下角"精算"完成交班
步骤5：出现"準備金確認"页面后可直接关机，第二天开机后再输入准备金

【反结账与补打单据流程】
补打流程：注文履歴 → 前払注文履歴 → 找到订单 → 进入详情 → 打印结账单/领收书
反结账流程：注文履歴 → 前払注文履歴 → 找到订单 → 编辑 → 确认退款 → 退菜/整单取消 → 回订单履历核对

补打说明：
- 补打只是再次打印单据，不会改动原订单金额
- 打印前请先核对订单编号和金额

反结账步骤：
步骤1：在前払モード页面点击右上角【注文履歴】
步骤2：进入【前払注文履歴】，找到需要处理的已结账订单
步骤3：点击右上角【編集】
步骤4：系统弹出【会計を取消し、返金を行いますか？】时，点击【確定】
步骤5：反结账完成后，勾选需要取消的商品，部分退菜点击【確定】，整单取消点击【戻る】确认
`;

const formatRule = `
Format rules (MUST follow):
- For numbered steps, use this exact format (title and detail on SEPARATE lines):
  1. Step title
     - detail description
  2. Step title  
     - detail description
- Never put detail on the same line as the number
- Use - for bullet points under each step
- Do NOT use ** bold markers inside step titles`;

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
      ? `你是NJF REGI收银系统的AI客服。只用简体中文回答，禁止日语和繁体中文。参考以下手册内容回答问题。找不到答案时告知联系人工客服：邮箱 support@njfregi.jp / 电话 03-XXXX-XXXX（工作日9:00〜18:00）${formatRule}\n\n手册内容：\n${MANUAL_CONTENT}`
      : `あなたはNJF REGIシステムのAIサポートです。必ず日本語のみで回答してください。以下のマニュアルを参照して回答してください。わからない場合はサポートに連絡するよう案内してください：メール support@njfregi.jp / 電話 03-XXXX-XXXX（平日9:00〜18:00）${formatRule}\n\nマニュアル内容：\n${MANUAL_CONTENT}`;

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

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

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
