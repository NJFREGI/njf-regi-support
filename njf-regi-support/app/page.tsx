"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  couldNotAnswer?: boolean;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "レジの電源を入れる方法を教えてください",
  "領収書を再発行するには？",
  "商品の登録・編集方法は？",
  "日次締め処理の手順を教えてください",
  "エラーコード一覧はどこで確認できますか？",
  "売上レポートの出力方法は？",
];

const CONTACT_INFO = {
  email: "support@njfregi.jp",
  phone: "03-XXXX-XXXX",
  hours: "平日 9:00〜18:00",
  url: "https://support.njfregi.jp/contact",
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;

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
        }),
      });

      const data = await res.json();

      if (data.error && !data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error,
            couldNotAnswer: true,
            timestamp: new Date(),
          },
        ]);
      } else {
        if (data.responseId) setPreviousResponseId(data.responseId);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            couldNotAnswer: data.couldNotAnswer,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "接続エラーが発生しました。ネットワークを確認してください。",
          couldNotAnswer: true,
          timestamp: new Date(),
        },
      ]);
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
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoMark}>
            <span>NJF</span>
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoMain}>REGI</span>
            <span className={styles.logoSub}>AIサポート</span>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <p className={styles.navLabel}>よくある質問</p>
          {QUICK_QUESTIONS.map((q, i) => (
            <button
              key={i}
              className={styles.quickBtn}
              onClick={() => sendMessage(q)}
              disabled={loading}
            >
              <span className={styles.quickIcon}>?</span>
              <span className={styles.quickText}>{q}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarContact}>
          <p className={styles.contactLabel}>人工サポート</p>
          <div className={styles.contactItem}>
            <span className={styles.contactIcon}>✉</span>
            <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
          </div>
          <div className={styles.contactItem}>
            <span className={styles.contactIcon}>☎</span>
            <span>{CONTACT_INFO.phone}</span>
          </div>
          <div className={styles.contactHours}>{CONTACT_INFO.hours}</div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.statusDot} />
            <span>NJF REGI AIサポート</span>
          </div>
          <span className={styles.headerSub}>マニュアルに基づいてお答えします</span>
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
              <h2 className={styles.welcomeTitle}>何かお手伝いできることはありますか？</h2>
              <p className={styles.welcomeSub}>
                NJF REGIの操作方法について、マニュアルをもとにご案内します。<br />
                左側のよくある質問から選ぶか、下のテキストボックスに質問を入力してください。
              </p>
              <div className={styles.welcomeQuickGrid}>
                {QUICK_QUESTIONS.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    className={styles.welcomeQuickBtn}
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.assistantRow}`}>
              {msg.role === "assistant" && (
                <div className={styles.avatar}>
                  <span>AI</span>
                </div>
              )}
              <div className={styles.messageBubbleWrap}>
                <div className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble}`}>
                  <p className={styles.bubbleText}>{msg.content}</p>

                  {msg.couldNotAnswer && msg.role === "assistant" && (
                    <div className={styles.contactCard}>
                      <p className={styles.contactCardTitle}>人工サポートへのご連絡</p>
                      <div className={styles.contactCardRow}>
                        <span>✉ メール</span>
                        <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
                      </div>
                      <div className={styles.contactCardRow}>
                        <span>☎ 電話</span>
                        <span>{CONTACT_INFO.phone}（{CONTACT_INFO.hours}）</span>
                      </div>
                      <a href={CONTACT_INFO.url} target="_blank" rel="noopener noreferrer" className={styles.contactCardLink}>
                        チャットで相談する →
                      </a>
                    </div>
                  )}
                </div>
                <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
              </div>
              {msg.role === "user" && (
                <div className={`${styles.avatar} ${styles.userAvatar}`}>
                  <span>YOU</span>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className={`${styles.messageRow} ${styles.assistantRow}`}>
              <div className={styles.avatar}><span>AI</span></div>
              <div className={styles.typingIndicator}>
                <span /><span /><span />
              </div>
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
              placeholder="操作方法について質問してください…"
              rows={1}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label="送信"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9L16 2L9 16L8 10L2 9Z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <p className={styles.inputHint}>Enter で送信・Shift+Enter で改行</p>
        </div>
      </main>
    </div>
  );
}
