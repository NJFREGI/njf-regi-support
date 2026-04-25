# NJF REGI AIサポート

NJF REGIシステムのAIカスタマーサポートチャットです。
OpenAI Responses API + File Search（知識ベース）を使用して、マニュアルに基づいた回答を提供します。

## 機能

- 💬 AIチャット（OpenAI Responses API）
- 📚 File Search 知識ベース（PDF/FAQ対応）
- ❓ 常見問題快捷按钮（よくある質問ショートカット）
- 🔒 APIキーはバックエンド環境変数のみに配置
- 📞 回答不能時に人工サポート連絡先を表示
- 📱 レスポンシブデザイン対応

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/YOUR_USERNAME/njf-regi-support.git
cd njf-regi-support
npm install
```

### 2. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして編集：

```bash
cp .env.local.example .env.local
```

```env
OPENAI_API_KEY=sk-...あなたのAPIキー...
OPENAI_VECTOR_STORE_ID=vs_...あなたのベクターストアID...（任意）
```

### 3. ローカル起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

---

## File Search 知識ベースの設定

### Vector Store の作成

1. [OpenAI Platform](https://platform.openai.com/storage/vector_stores) にアクセス
2. 「New vector store」をクリック
3. 名前を入力（例：`njf-regi-manual`）
4. PDFやFAQファイルをアップロード
5. 作成された Vector Store ID（`vs_...`）を `.env.local` に設定

### 対応ファイル形式
- PDF（マニュアル、取扱説明書）
- TXT（FAQ、Q&A）
- DOCX（Word文書）
- その他OpenAI対応形式

---

## Vercel へのデプロイ

### 方法1：Vercel CLI

```bash
npm install -g vercel
vercel login
vercel

# 本番デプロイ
vercel --prod
```

### 方法2：GitHub連携（推奨）

1. このプロジェクトを GitHub にプッシュ
2. [vercel.com](https://vercel.com) でサインイン
3. 「Add New Project」→ GitHubリポジトリを選択
4. **Environment Variables** を設定：
   - `OPENAI_API_KEY` = OpenAIのAPIキー
   - `OPENAI_VECTOR_STORE_ID` = Vector StoreのID（任意）
5. 「Deploy」をクリック

### Vercel環境変数の設定場所

```
Project Settings → Environment Variables
```

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `OPENAI_API_KEY` | OpenAI APIキー | ✅ |
| `OPENAI_VECTOR_STORE_ID` | 知識ベース ID | 任意 |

---

## カスタマイズ

### よくある質問の変更

`app/page.tsx` の `QUICK_QUESTIONS` 配列を編集：

```typescript
const QUICK_QUESTIONS = [
  "レジの電源を入れる方法を教えてください",
  "領収書を再発行するには？",
  // 追加・変更可能
];
```

### 人工サポートの連絡先変更

`app/page.tsx` の `CONTACT_INFO` を編集：

```typescript
const CONTACT_INFO = {
  email: "support@njfregi.jp",
  phone: "03-XXXX-XXXX",
  hours: "平日 9:00〜18:00",
  url: "https://support.njfregi.jp/contact",
};
```

### システムプロンプトの変更

`app/api/chat/route.ts` の `SYSTEM_PROMPT` を編集してください。

---

## 技術スタック

- **フロントエンド**: Next.js 14 / React 18 / TypeScript
- **バックエンド**: Next.js API Routes（Vercel Serverless Functions）
- **AI**: OpenAI Responses API（gpt-4o）
- **知識ベース**: OpenAI File Search（Vector Store）
- **デプロイ**: Vercel（東京リージョン nrt1）
