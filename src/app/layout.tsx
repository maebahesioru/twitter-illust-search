import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { HkmProBanner } from "./HkmPro";

export const metadata: Metadata = {
  title: "イラスト検索 — Twitterのイラストをまとめて探す",
  description: "Yahooリアルタイム検索を使ってTwitter(X)上のイラストを高速検索。キャラクター名・作品名・画風などで絞り込めます。",
  keywords: ["イラスト", "Twitter", "X", "イラスト検索", "絵師", "ファンアート"],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "イラスト検索",
    description: "Twitter(X)のイラストをまとめて探せる検索サイト",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    title: "イラスト検索",
    description: "Twitter(X)のイラストをまとめて探せる検索サイト",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Suspense>{children}</Suspense>
        <HkmProBanner />
              <script src="https://hikakinmaniacoin.hikamer.f5.si/ad.js" async></script>
      </body>
    </html>
  );
}
