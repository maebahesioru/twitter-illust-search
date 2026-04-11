# イラスト検索

Yahoo リアルタイム検索APIを使ってTwitter上のイラストを検索するサイト。

## セットアップ

### 1. Yahoo App IDを取得

[Yahoo! JAPAN Developer Network](https://developer.yahoo.co.jp/) でアプリを登録し、App IDを取得。

### 2. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して `YAHOO_APP_ID` に取得したApp IDを設定。

### 3. 起動

```bash
pnpm install
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開く。

## 使い方

検索バーにキーワードを入力して検索。画像をクリックすると拡大表示。

## 技術スタック

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- pnpm
