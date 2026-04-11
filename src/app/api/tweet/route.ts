import { NextRequest } from "next/server";
import { isIllustrator } from "@/lib/filter";
import { AI_SIGNALS } from "@/lib/words";
import type { MediaItem, TweetResult } from "../search/route";

export async function GET(req: NextRequest) {
  const screenName = req.nextUrl.searchParams.get("screenName");
  const id = req.nextUrl.searchParams.get("id");
  if (!screenName || !id) return new Response("missing params", { status: 400 });

  const d = await fetch(`https://api.fxtwitter.com/${screenName}/status/${id}`, { next: { revalidate: 3600 } })
    .then((r) => r.ok ? r.json() : null).catch(() => null);
  const tweet = d?.tweet;
  const author = tweet?.author;
  if (!author) return new Response("not found", { status: 404 });

  const fxPhotos: MediaItem[] = (tweet?.media?.photos ?? []).map((p: any) => ({
    type: "image" as const, mediaUrl: p.url, thumbnailImageUrl: p.url, width: p.width ?? 0, height: p.height ?? 0,
  }));
  const fxVideos: MediaItem[] = (tweet?.media?.videos ?? []).map((v: any) => ({
    type: "video" as const, mediaUrl: v.url, thumbnailImageUrl: v.thumbnail_url ?? "", width: v.width ?? 0, height: v.height ?? 0,
  }));
  const media = [...fxPhotos, ...fxVideos];
  if (media.length === 0) return new Response("no media", { status: 404 });

  return Response.json({
    id, url: `https://x.com/${screenName}/status/${id}`,
    text: tweet.text ?? "",
    screenName, name: author.name ?? "", profileImage: author.avatar_url ?? "",
    createdAt: tweet.created_timestamp ?? 0,
    likesCount: tweet.likes ?? 0, rtCount: tweet.retweets ?? 0,
    replyCount: tweet.replies ?? 0, qtCount: 0, views: tweet.views ?? 0,
    popularity: (tweet.likes ?? 0) + (tweet.retweets ?? 0) * 3 + (tweet.replies ?? 0) + Math.floor((tweet.views ?? 0) / 100),
    sensitive: tweet.possibly_sensitive === true,
    isAI: AI_SIGNALS.test((author.description ?? "") + " " + (author.name ?? "") + " " + (tweet.text ?? "")),
    media,
  } satisfies TweetResult);
}
