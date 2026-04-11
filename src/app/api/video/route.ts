import { NextRequest } from "next/server";

const HEADERS = { "Referer": "https://x.com/", "User-Agent": "Mozilla/5.0" };

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("missing url", { status: 400 });

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return new Response("fetch failed", { status: 502 });

  const contentType = res.headers.get("content-type") ?? "";

  // m3u8の場合：URIを全て /api/video?url=... に書き換え
  if (url.includes(".m3u8") || contentType.includes("mpegurl")) {
    const text = await res.text();
    const base = new URL(url);
    const rewritten = text.split("\n").map(line => {
      // タグ内のURI属性を書き換え
      line = line.replace(/URI="([^"]+)"/g, (_, u) => {
        const abs = new URL(u, base).href;
        return `URI="/api/video?url=${encodeURIComponent(abs)}"`;
      });
      // 通常のURIライン（#で始まらない非空行）
      if (line.trim() && !line.startsWith("#")) {
        const abs = new URL(line.trim(), base).href;
        return `/api/video?url=${encodeURIComponent(abs)}`;
      }
      return line;
    }).join("\n");
    return new Response(rewritten, { headers: { "Content-Type": "application/vnd.apple.mpegurl", "Access-Control-Allow-Origin": "*" } });
  }

  // セグメントの場合：そのままプロキシ
  return new Response(res.body, {
    headers: {
      "Content-Type": contentType || "video/mp2t",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
