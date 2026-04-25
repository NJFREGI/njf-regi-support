"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

function renderMarkdown(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const stepMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (stepMatch) {
        const title = stepMatch[2].replace(/\*\*(.+?)\*\*/g, '$1').replace(/:$/, '');
        return `<div class="md-step"><span class="md-step-num">${stepMatch[1]}</span><span class="md-step-title">${title}</span></div>`;
      }
      if (line.match(/^[-•]\s/)) {
        const content = line.replace(/^[-•]\s+/, '').replace(/\*\*(.+?)\*\*/g, '<span class="md-bold">$1</span>');
        return `<div class="md-bullet"><span class="md-dot"></span><span class="md-step-text">${content}</span></div>`;
      }
      return line.replace(/\*\*(.+?)\*\*/g, '<span class="md-bold">$1</span>');
    })
    .join('<br/>');
}

function getGreeting(lang: string): { main: string; sub: string } {
  const h = new Date().getHours();
  if (lang === "zh") {
    if (h >= 5 && h < 12) return { main: "早上好，老板！", sub: "美好的一天又开始了，有什么可以帮到您的吗？" };
    if (h >= 12 && h < 14) return { main: "中午好，老板！", sub: "记得好好休息一下，有什么问题尽管问我！" };
    if (h >= 14 && h < 18) return { main: "下午好，老板！", sub: "下午继续加油，有什么可以帮到您的吗？" };
    if (h >= 18 && h < 22) return { main: "晚上好，老板！", sub: "坚守到现在真辛苦了，有什么可以帮到您的吗？" };
    return { main: "夜深了，老板！", sub: "注意休息哦，有什么问题我来帮您解答！" };
  } else {
    if (h >= 5 && h < 12) return { main: "おはようございます！", sub: "素晴らしい一日の始まりです。何かお手伝いできることはありますか？" };
    if (h >= 12 && h < 14) return { main: "こんにちは！", sub: "お昼休みはしっかり取れていますか？何かご質問があればどうぞ！" };
    if (h >= 14 && h < 18) return { main: "こんにちは！", sub: "午後も頑張りましょう。何かお手伝いできることはありますか？" };
    if (h >= 18 && h < 22) return { main: "お疲れ様です！", sub: "遅くまでお仕事お疲れ様です。何かお手伝いできることはありますか？" };
    return { main: "夜遅くまでお疲れ様です！", sub: "しっかり休んでくださいね。ご質問があればいつでもどうぞ！" };
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
  couldNotAnswer?: boolean;
  timestamp: Date;
}

type Lang = "ja" | "zh";

const QUESTIONS = {
  ja: [
    ["レジの電源を入れる方法を教えてください", "領収書を再発行するには？", "商品の登録・編集方法は？", "日次締め処理の手順を教えてください"],
    ["エラーコード一覧はどこで確認できますか？", "売上レポートの出力方法は？", "麻辣烫の計量・会計の流れは？", "店内飲食と持ち帰りの切替方法は？"],
    ["反会計の操作方法を教えてください", "利用できる支払方法は何ですか？", "領収書の印刷方法は？", "準備金の入力方法は？"],
  ],
  zh: [
    ["如何开机启动收银机？", "如何补打领收书？", "如何注册或编辑商品？", "日结交班流程是什么？"],
    ["在哪里查看错误代码列表？", "如何导出销售报表？", "麻辣烫称重结账流程？", "如何切换堂食和外带？"],
    ["如何进行反结账操作？", "支付方式有哪些？", "如何打印领收书？", "准备金怎么输入？"],
  ],
};

const I18N = {
  ja: {
    title: "NJF REGI AIサポート",
    subtitle: "マニュアルに基づいてお答えします",
    navLabel: "よくある質問",
    contactLabel: "人工サポート",
    contactHours: "平日 9:00〜18:00",
    placeholder: "操作方法について質問してください…",
    inputHint: "Enter で送信・Shift+Enter で改行",
    contactCardTitle: "サポートへのご連絡",
    contactEmail: "✉ メール",
    contactPhone: "☎ 電話",
    humanSupportBtn: "📞 人工サポートに電話",
    tryBtn: "試してみる",
    faqLabel: "よくある質問",
    poweredBy: "NJF REGI · DeepSeek",
  },
  zh: {
    title: "NJF REGI AI客服",
    subtitle: "根据操作手册为您解答",
    navLabel: "常见问题",
    contactLabel: "人工客服",
    contactHours: "工作日 9:00〜18:00",
    placeholder: "请输入您的操作问题…",
    inputHint: "Enter 发送・Shift+Enter 换行",
    contactCardTitle: "联系人工客服",
    contactEmail: "✉ 邮箱",
    contactPhone: "☎ 电话",
    humanSupportBtn: "📞 联系人工客服",
    tryBtn: "去试试",
    faqLabel: "常见问题",
    poweredBy: "NJF REGI · DeepSeek",
  },
};

const CONTACT_INFO = {
  email: "support@njfregi.jp",
  phone: "03-XXXX-XXXX",
  url: "https://support.njfregi.jp/contact",
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("ja");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [carouselPage, setCarouselPage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const t = I18N[lang];
  const greeting = getGreeting(lang);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length > 0) return;
    const timer = setInterval(() => {
      setCarouselPage(p => (p + 1) % 3);
    }, 3500);
    return () => clearInterval(timer);
  }, [messages.length]);

  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;
    setSidebarOpen(false);

    const userMsg: Message = { role: "user", content: userText, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          lang,
        }),
      });
      const data = await res.json();
      if (data.error && !data.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error, couldNotAnswer: true, timestamp: new Date() }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer, couldNotAnswer: data.couldNotAnswer, timestamp: new Date() }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: lang === "ja" ? "接続エラーが発生しました。" : "连接失败，请检查网络后重试。",
        couldNotAnswer: true,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  const switchLang = () => {
    setLang(lang === "ja" ? "zh" : "ja");
    setMessages([]);
    setCarouselPage(0);
  };

  const questions = QUESTIONS[lang];

  return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoMark}><span>NJF</span></div>
          <div className={styles.logoText}>
            <span className={styles.logoMain}>REGI</span>
            <span className={styles.logoSub}>{lang === "ja" ? "AIサポート" : "AI客服"}</span>
          </div>
          <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className={styles.sidebarNav}>
          <p className={styles.navLabel}>{t.navLabel}</p>
          {questions.flat().map((q, i) => (
            <button key={i} className={styles.quickBtn} onClick={() => sendMessage(q)} disabled={loading}>
              <span className={styles.quickIcon}>?</span>
              <span className={styles.quickText}>{q}</span>
            </button>
          ))}
        </nav>
        <div className={styles.sidebarContact}>
          <p className={styles.contactLabel}>{t.contactLabel}</p>
          <div className={styles.contactItem}>
            <span className={styles.contactIcon}>✉</span>
            <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
          </div>
          <div className={styles.contactItem}>
            <span className={styles.contactIcon}>☎</span>
            <span>{CONTACT_INFO.phone}</span>
          </div>
          <div className={styles.contactHours}>{t.contactHours}</div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
              <span /><span /><span />
            </button>
            <div className={styles.headerTitle}>
              <div className={styles.statusDot} />
              <span>{t.title}</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.headerSub}>{t.subtitle}</span>
            <button className={styles.langBtn} onClick={switchLang}>
              {lang === "ja" ? "中文" : "日本語"}
            </button>
          </div>
        </header>

        <div className={styles.chatArea}>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              {/* Hero 问候区 */}
              <div className={styles.heroSection}>
                <div className={styles.avatarFloat}>
                  <img src="/avatar.png" alt="AI助手" className={styles.avatarImg} />
                </div>
                <div className={styles.greetingBox}>
                  <div className={styles.greetingMain}>{greeting.main}</div>
                  <div className={styles.greetingSub}>{greeting.sub}</div>
                </div>
              </div>

              {/* 轮播常见问题 */}
              <div className={styles.carouselSection}>
                <p className={styles.faqLabel}>{t.faqLabel}</p>
                <div className={styles.carouselViewport}>
                  <div
                    className={styles.carouselTrack}
                    style={{ transform: `translateX(-${carouselPage * 100}%)` }}
                  >
                    {questions.map((page, pi) => (
                      <div key={pi} className={styles.carouselPage}>
                        {page.map((q, qi) => (
                          <button key={qi} className={styles.qCard} onClick={() => sendMessage(q)}>
                            <span className={styles.qText}>{q}</span>
                            <span className={styles.qBtn}>{t.tryBtn}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.dots}>
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      className={`${styles.dot} ${carouselPage === i ? styles.dotActive : ""}`}
                      onClick={() => setCarouselPage(i)}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.poweredBy}>{t.poweredBy}</div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.assistantRow}`}>
              {msg.role === "assistant" && <div className={styles.avatar}><span>AI</span></div>}
              <div className={styles.messageBubbleWrap}>
                <div className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble}`}>
                  {msg.role === "assistant" ? (
                    <div className={styles.bubbleText} dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : (
                    <p className={styles.bubbleText}>{msg.content}</p>
                  )}
                  {msg.couldNotAnswer && msg.role === "assistant" && (
                    <div className={styles.contactCard}>
                      <p className={styles.contactCardTitle}>{t.contactCardTitle}</p>
                      <div className={styles.contactCardRow}>
                        <span>{t.contactEmail}</span>
                        <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
                      </div>
                      <div className={styles.contactCardRow}>
                        <span>{t.contactPhone}</span>
                        <span>{CONTACT_INFO.phone}</span>
                      </div>
                      <a href={`tel:${CONTACT_INFO.phone}`} className={styles.humanSupportBtn}>
                        {t.humanSupportBtn}
                      </a>
                    </div>
                  )}
                </div>
                <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
              </div>
              {msg.role === "user" && <div className={`${styles.avatar} ${styles.userAvatar}`}><span>YOU</span></div>}
            </div>
          ))}

          {loading && (
            <div className={`${styles.messageRow} ${styles.assistantRow}`}>
              <div className={styles.avatar}><span>AI</span></div>
              <div className={styles.typingIndicator}><span /><span /><span /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputWrap}>
            <textarea
              ref={inputRef}
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              rows={1}
              disabled={loading}
            />
            <button className={styles.sendBtn} onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9L16 2L9 16L8 10L2 9Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <p className={styles.inputHint}>{t.inputHint}</p>
        </div>
      </main>
    </div>
  );
}
