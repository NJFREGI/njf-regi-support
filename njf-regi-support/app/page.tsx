"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  couldNotAnswer?: boolean;
  timestamp: Date;
}

type Lang = "ja" | "zh";

const I18N = {
  ja: {
    title: "NJF REGI AIサポート",
    subtitle: "マニュアルに基づいてお答えします",
    navLabel: "よくある質問",
    contactLabel: "人工サポート",
    contactHours: "平日 9:00〜18:00",
    welcomeTitle: "何かお手伝いできることはありますか？",
    welcomeSub: "NJF REGIの操作方法について、マニュアルをもとにご案内します。\nよくある質問から選ぶか、下のテキストボックスに質問を入力してください。",
    placeholder: "操作方法について質問してください…",
    inputHint: "Enter で送信・Shift+Enter で改行",
    contactCardTitle: "人工サポートへのご連絡",
    contactEmail: "✉ メール",
    contactPhone: "☎ 電話",
    contactChat: "チャットで相談する →",
    questions: [
      "レジの電源を入れる方法を教えてください",
      "領収書を再発行するには？",
      "商品の登録・編集方法は？",
      "日次締め処理の手順を教えてください",
      "エラーコード一覧はどこで確認できますか？",
      "売上レポートの出力方法は？",
    ],
  },
  zh: {
    title: "NJF REGI AI客服",
    subtitle: "根据操作手册为您解答",
    navLabel: "常见问题",
    contactLabel: "人工客服",
    contactHours: "工作日 9:00〜18:00",
    welcomeTitle: "有什么可以帮助您的吗？",
    welcomeSub: "我们将根据 NJF REGI 操作手册为您提供指导。\n请从常见问题中选择，或在下方输入您的问题。",
    placeholder: "请输入您的操作问题…",
    inputHint: "Enter 发送・Shift+Enter 换行",
    contactCardTitle: "联系人工客服",
    contactEmail: "✉ 邮箱",
    contactPhone: "☎ 电话",
    contactChat: "在线咨询 →",
    questions: [
      "如何开机启动收银机？",
      "如何补打领收书？",
      "如何注册或编辑商品？",
      "日结交班流程是什么？",
      "在哪里查看错误代码列表？",
      "如何导出销售报表？",
    ],
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
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("ja");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const t = I18N[lang];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
          previousResponseId,
          lang,
        }),
      });

      const data = await res.json();

      if (data.error && !data.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error, couldNotAnswer: true, timestamp: new Date() }]);
      } else {
        if (data.responseId) setPreviousResponseId(data.responseId);
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
          {t.questions.map((q, i) => (
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
            <button className={styles.langBtn} onClick={() => setLang(lang === "ja" ? "zh" : "ja")}>
              {lang === "ja" ? "中文" : "日本語"}
            </button>
          </div>
        </header>

        <div className={styles.chatArea}>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="12" fill="#2563eb" opacity="0.12" />
                  <path d="M12 20C12 15.6 15.6 12 20 12s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z" fill="#2563eb" opacity="0.3" />
                  <path d="M17 20h6M20 17v6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className={styles.welcomeTitle}>{t.welcomeTitle}</h2>
              <p className={styles.welcomeSub}>{t.welcomeSub}</p>
              <div className={styles.welcomeQuickGrid}>
                {t.questions.slice(0, 3).map((q, i) => (
                  <button key={i} className={styles.welcomeQuickBtn} onClick={() => sendMessage(q)} disabled={loading}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.assistantRow}`}>
              {msg.role === "assistant" && <div className={styles.avatar}><span>AI</span></div>}
              <div className={styles.messageBubbleWrap}>
                <div className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble}`}>
                  <p className={styles.bubbleText}>{msg.content}</p>
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
                      <a href={CONTACT_INFO.url} target="_blank" rel="noopener noreferrer" className={styles.contactCardLink}>
                        {t.contactChat}
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
                <path d="M2 9L16 2L9 16L8 10L2 9Z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <p className={styles.inputHint}>{t.inputHint}</p>
        </div>
      </main>
    </div>
  );
}
