import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("missing url", { status: 400 });

  const res = await fetch(url, {
    headers: { "Referer": "https://x.com/" },
  });
  if (!res.ok) return new Response("fetch failed", { status: 502 });

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return new Response(res.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${url.split("/").pop()?.split("?")[0] ?? "image"}"`,
    },
  });
}
