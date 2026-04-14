import { NextRequest } from "next/server";
import { isIllustrator } from "@/lib/filter";
import { AI_SIGNALS } from "@/lib/words";

const YAHOO_API = "https://search.yahoo.co.jp/realtime/api/v1/pagination";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface MediaItem {
  type: "image" | "animatedGif" | "video";
  mediaUrl: string;
  thumbnailImageUrl: string;
  width: number;
  height: number;
}

export interface TweetResult {
  id: string;
  url: string;
  text: string;
  screenName: string;
  name: string;
  profileImage: string;
  createdAt: number;
  likesCount: number;
  rtCount: number;
  replyCount: number;
  qtCount: number;
  views: number;
  popularity: number;
  sensitive: boolean;
  isAI: boolean;
  media: MediaItem[];
}

export const dynamic = "force-dynamic";

const sse = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const mtype = req.nextUrl.searchParams.get("mtype") ?? "image";
  if (!query) return new Response("query required", { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        try { controller.enqueue(enc.encode(sse(event, data))); } catch {}
      };

      const seenIds = new Set<string>();
      const pipeline: Promise<void>[] = [];

      const processEntries = async (entries: any[]) => {
        const mediaEntries = entries.filter((e) => e.media?.length > 0);

        await Promise.all(mediaEntries.map(async (e) => {
          if (seenIds.has(e.id)) return;
          seenIds.add(e.id);

          const fetchTweet = (base: string) => fetch(`${base}/${e.screenName}/status/${e.id}`, {
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(5000),
          }).then((r) => r.ok ? r.json() : null).catch(() => null);

          // fxtwitter → vxtwitter → Yahooデータのみ の順でフォールバック
          let d = await fetchTweet("https://api.fxtwitter.com");
          if (!d) d = await fetchTweet("https://api.vxtwitter.com");

          const tweet = d?.tweet;
          const author = tweet?.author;

          // fxtwitter/vxtwitterが全滅した場合はYahooデータだけで判定・表示
          if (!author) {
            const yahooMedia: MediaItem[] = e.media
              .filter((m: any) => m.type === "image" || m.type === "animatedGif" || m.type === "video")
              .map((m: any) => ({
                type: m.type as MediaItem["type"],
                mediaUrl: m.item.mediaUrl,
                thumbnailImageUrl: m.item.thumbnailImageUrl,
                width: m.item.sizes?.viewer?.width ?? 0,
                height: m.item.sizes?.viewer?.height ?? 0,
              }));
            if (yahooMedia.length === 0) return;
            // Yahooデータのみの場合はisIllustrator判定をスキップして表示
            send("result", {
              id: e.id, url: e.url,
              text: e.displayTextBody?.replace(/\tSTART\t|\tEND\t/g, "") ?? "",
              screenName: e.screenName, name: e.name, profileImage: e.profileImage,
              createdAt: e.createdAt,
              likesCount: e.likesCount ?? 0, rtCount: e.rtCount ?? 0,
              replyCount: e.replyCount ?? 0, qtCount: e.qtCount ?? 0, views: 0,
              popularity: (e.likesCount ?? 0) + (e.rtCount ?? 0) * 3 + (e.replyCount ?? 0),
              sensitive: e.possiblySensitive === true, isAI: false, media: yahooMedia,
            } satisfies TweetResult);
            return;
          }

          if (!isIllustrator(author, e.displayTextBody ?? "")) return;

          // fxtwitterの高画質メディアを優先、なければYahooのURLを使用
          const fxPhotos: MediaItem[] = (tweet?.media?.photos ?? []).map((p: any) => ({
            type: "image" as const,
            mediaUrl: p.url.replace(/name=\w+/, "name=orig"),
            thumbnailImageUrl: p.url.replace(/name=\w+/, "name=small"),
            width: p.width ?? 0,
            height: p.height ?? 0,
          }));
          const fxVideos: MediaItem[] = (tweet?.media?.videos ?? []).map((v: any) => ({
            type: "video" as const,
            mediaUrl: v.url,
            thumbnailImageUrl: v.thumbnail_url ?? "",
            width: v.width ?? 0,
            height: v.height ?? 0,
          }));
          const fxMedia = [...fxPhotos, ...fxVideos];

          const media: MediaItem[] = fxMedia.length > 0 ? fxMedia : e.media
            .filter((m: any) => m.type === "image" || m.type === "animatedGif" || m.type === "video")
            .map((m: any) => ({
              type: m.type,
              mediaUrl: m.item.mediaUrl,
              thumbnailImageUrl: m.item.thumbnailImageUrl,
              width: m.item.sizes?.viewer?.width ?? 0,
              height: m.item.sizes?.viewer?.height ?? 0,
            }));
          if (media.length === 0) return;

          send("result", {
            id: e.id, url: e.url,
            text: e.displayTextBody?.replace(/\tSTART\t|\tEND\t/g, "") ?? "",
            screenName: e.screenName, name: e.name, profileImage: e.profileImage,
            createdAt: e.createdAt,
            likesCount: tweet.likes ?? 0,
            rtCount: tweet.retweets ?? 0,
            replyCount: tweet.replies ?? 0,
            qtCount: e.qtCount ?? 0,
            views: tweet.views ?? 0,
            popularity: (tweet.likes ?? 0) + (tweet.retweets ?? 0) * 3 + (tweet.replies ?? 0) + Math.floor((tweet.views ?? 0) / 100),
            sensitive: tweet.possibly_sensitive === true,
            isAI: AI_SIGNALS.test((author.description ?? "") + " " + (author.name ?? "") + " " + (e.displayTextBody ?? "")),
            media,
          } satisfies TweetResult);
        }));
      };

      const headers = {
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Referer": "https://search.yahoo.co.jp/realtime/search",
        "Origin": "https://search.yahoo.co.jp",
      };

      // フェーズ1: 1ページ目で totalResultsAvailable を取得してから並列取得
      const firstParams = new URLSearchParams({ p: query, results: "40", mtype, start: "1" });
      const firstRes = await fetch(`${YAHOO_API}?${firstParams}`, { headers, next: { revalidate: 0 } });
      if (!firstRes.ok) {
        if (firstRes.status === 403 || firstRes.status === 429) send("blocked", {});
        send("done", {}); controller.close(); return;
      }
      const firstData = await firstRes.json();
      const total: number = firstData?.timeline?.head?.totalResultsAvailable ?? 0;
      pipeline.push(processEntries(firstData?.timeline?.entry ?? []));

      const pageCount = Math.min(Math.ceil(total / 40), 250);
      const starts = Array.from({ length: pageCount - 1 }, (_, i) => (i + 1) * 40 + 1);
      await Promise.all(
        starts.map(async (start) => {
          if (seenIds.size >= total) return; // 早期終了
          const params = new URLSearchParams({ p: query, results: "40", mtype, start: String(start) });
          const res = await fetch(`${YAHOO_API}?${params}`, { headers, next: { revalidate: 0 } }).catch(() => null);
          if (!res?.ok) return;
          const data = await res.json();
          pipeline.push(processEntries(data?.timeline?.entry ?? []));
        })
      );

      // フェーズ2: 最後のIDからカーソルで続きを逐次取得
      const allIds = [...seenIds];
      let cursor = allIds.at(-1) ?? null;
      while (cursor) {
        const params = new URLSearchParams({ p: query, results: "40", mtype, oldestTweetId: cursor });
        const res = await fetch(`${YAHOO_API}?${params}`, { headers, next: { revalidate: 0 } });
        if (!res.ok) break;
        const data = await res.json();
        const entries: any[] = data?.timeline?.entry ?? [];
        if (!entries.length) break;
        await processEntries(entries);
        cursor = entries.at(-1)?.id ?? null;
      }

      await Promise.all(pipeline);
      send("done", {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
