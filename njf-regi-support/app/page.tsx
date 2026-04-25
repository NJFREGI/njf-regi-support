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
    contactCardTitle: "サポートへのご連絡",
    contactEmail: "✉ メール",
    contactPhone: "☎ 電話",
    humanSupportBtn: "📞 人工サポートに電話",
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
    humanSupportBtn: "📞 联系人工客服",
    questions: [
      "如何开机启动收银机？",
      "如
