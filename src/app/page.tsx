"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TweetResult } from "./api/search/route";

function ViewerImage({ tweet, mediaIndex, onClose, onPrev, onNext, hasPrev, hasNext }: {
  tweet: TweetResult; mediaIndex: number; onClose: () => void;
  onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const state = useRef({ x: 0, y: 0, scale: 1, mx: 0, my: 0, down: false, lastTap: 0, pinchDist: 0 });
  const m = tweet.media[mediaIndex];

  useEffect(() => {
    const img = imgRef.current!;
    const s = state.current;
    s.x = 0; s.y = 0; s.scale = 1;
    img.style.transform = "translate(-50%, -50%) scale(1)";
    const apply = () => { img.style.transform = `translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px)) scale(${s.scale})`; };
    const reset = () => { s.x = 0; s.y = 0; s.scale = 1; apply(); };

    // マウス
    const onWheel = (e: WheelEvent) => { e.preventDefault(); s.scale = Math.min(10, Math.max(0.2, s.scale - e.deltaY * 0.001)); apply(); };
    const onDown = (e: MouseEvent) => { e.preventDefault(); s.down = true; s.mx = e.clientX; s.my = e.clientY; img.style.cursor = "grabbing"; };
    const onMove = (e: MouseEvent) => { if (!s.down) return; s.x += e.clientX - s.mx; s.y += e.clientY - s.my; s.mx = e.clientX; s.my = e.clientY; apply(); };
    const onUp = () => { s.down = false; img.style.cursor = "grab"; };
    const onDblClick = (e: MouseEvent) => { e.stopPropagation(); reset(); };

    // タッチ
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        s.pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - s.lastTap < 300) { reset(); }
        s.lastTap = now;
        s.mx = e.touches[0].clientX; s.my = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        s.scale = Math.min(10, Math.max(0.2, s.scale * (dist / s.pinchDist)));
        s.pinchDist = dist;
        apply();
      } else if (e.touches.length === 1) {
        s.x += e.touches[0].clientX - s.mx; s.y += e.touches[0].clientY - s.my;
        s.mx = e.touches[0].clientX; s.my = e.touches[0].clientY;
        apply();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0 && s.scale <= 1.1) {
        const dx = s.x; const dy = s.y;
        if (Math.abs(dx) > 50 && Math.abs(dy) < 80) { dx < 0 ? onNext() : onPrev(); reset(); }
      }
    };

    img.addEventListener("wheel", onWheel, { passive: false });
    img.addEventListener("mousedown", onDown);
    img.addEventListener("dblclick", onDblClick);
    img.addEventListener("touchstart", onTouchStart, { passive: true });
    img.addEventListener("touchmove", onTouchMove, { passive: false });
    img.addEventListener("touchend", onTouchEnd);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      img.removeEventListener("wheel", onWheel); img.removeEventListener("mousedown", onDown);
      img.removeEventListener("dblclick", onDblClick);
      img.removeEventListener("touchstart", onTouchStart); img.removeEventListener("touchmove", onTouchMove); img.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
    };
  }, [mediaIndex, onPrev, onNext]);

  const download = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = `/api/download?url=${encodeURIComponent(m.mediaUrl)}`;
    a.download = m.mediaUrl.split("/").pop()?.split("?")[0] ?? "image";
    a.click();
  };

  const copyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(m.mediaUrl);
  };

  return (
    <div className="absolute inset-0 overflow-hidden" onClick={onClose}>
      {m.type === "video" ? (
        <video src={m.mediaUrl} controls autoPlay loop
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxWidth: "90vw", maxHeight: "90vh" }}
          onClick={e => e.stopPropagation()} />
      ) : (
        <img ref={imgRef} src={m.mediaUrl} alt={tweet.text} draggable={false}
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", cursor: "grab", userSelect: "none" }}
          onClick={e => e.stopPropagation()} />
      )}

      {hasPrev && <button onClick={e => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-xl">‹</button>}
      {hasNext && <button onClick={e => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-xl">›</button>}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 rounded-full px-4 py-2" onClick={e => e.stopPropagation()}>
        <a href={`https://x.com/${tweet.screenName}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-sm whitespace-nowrap">@{tweet.screenName}</a>
        <p className="text-gray-400 text-sm line-clamp-1 max-w-xs">{tweet.text}</p>
        {tweet.media.length > 1 && <span className="text-gray-500 text-xs">{mediaIndex + 1}/{tweet.media.length}</span>}
        <a href={tweet.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm whitespace-nowrap">ツイート →</a>
        <button onClick={copyUrl} className="text-gray-400 hover:text-white text-sm whitespace-nowrap">🔗</button>
        <button onClick={download} className="text-green-400 hover:text-green-300 text-sm whitespace-nowrap">↓ DL</button>
      </div>
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-8 h-8 flex items-center justify-center text-lg">×</button>
    </div>
  );
}

const cache = new Map<string, TweetResult[]>();

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<TweetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [r18, setR18] = useState(false);
  const [noAI, setNoAI] = useState(false);
  const [panic, setPanic] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [selected, setSelected] = useState<{ tweet: TweetResult; mediaIndex: number } | null>(null);
  const [sortBy, setSortBy] = useState<"popularity" | "newest">("popularity");
  const [failedTweets, setFailedTweets] = useState<{ id: string; screenName: string; text: string; url: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selected) { history.back(); return; }
        setPanic(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected]);

  useEffect(() => {
    if (selected) history.pushState({ viewer: true }, "");
  }, [selected]);
  useEffect(() => {
    const handler = (e: PopStateEvent) => { if (!e.state?.viewer) setSelected(null); };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const search = useCallback(async (q: string, mtype: "image" | "video" = "image") => {
    if (!q.trim()) return;
    const cacheKey = `${q}:${mtype}`;
    if (cache.has(cacheKey)) { setResults(cache.get(cacheKey)!); return; }
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setLoading(true);
    setError("");
    setResults([]);
    setFailedTweets([]);

    const accumulated: TweetResult[] = [];
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&mtype=${mtype}`, { signal: abort.signal });
      if (!res.ok || !res.body) throw new Error("検索に失敗しました");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const eventMatch = part.match(/^event: (\w+)/m);
          const dataMatch = part.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);
          if (event === "result") { accumulated.push(data as TweetResult); setResults(prev => [...prev, data as TweetResult]); }
          if (event === "error") setFailedTweets(prev => [...prev, data]);
          if (event === "blocked") setError("Yahoo APIにブロックされました。しばらく待ってから再試行してください。");
        }
      }
      cache.set(cacheKey, accumulated);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  // fxtwitter失敗ツイートを自動リトライ（5秒後）
  useEffect(() => {
    if (failedTweets.length === 0) return;
    const timer = setTimeout(async () => {
      const toRetry = [...failedTweets];
      setFailedTweets([]);
      const results = await Promise.all(
        toRetry.map(item => fetch(`/api/tweet?screenName=${item.screenName}&id=${item.id}`).then(r => r.ok ? r.json() : null).catch(() => null))
      );
      const succeeded = results.filter(Boolean) as TweetResult[];
      const failed = toRetry.filter((_, i) => !results[i]);
      if (succeeded.length) setResults(prev => [...prev, ...succeeded]);
      if (failed.length) setFailedTweets(failed);
    }, 5000);
    return () => clearTimeout(timer);
  }, [failedTweets]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setQuery(q); search(q, mediaType); }
  }, [searchParams, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/?q=${encodeURIComponent(query.trim())}`);
  };

  const filtered = useMemo(() => results
    .filter(t => r18 ? t.sensitive : true)
    .filter(t => noAI ? !t.isAI : true)
    .sort((a, b) => sortBy === "popularity" ? b.popularity - a.popularity : b.createdAt - a.createdAt),
  [results, r18, noAI, sortBy]);

  // ビューワーの前後ナビ用フラットリスト
  const flatItems = useMemo(() => filtered.flatMap(t => t.media.map((_, i) => ({ tweet: t, mediaIndex: i }))), [filtered]);
  const selectedFlatIndex = selected ? flatItems.findIndex(x => x.tweet.id === selected.tweet.id && x.mediaIndex === selected.mediaIndex) : -1;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {panic && <div className="fixed inset-0 z-[9999] bg-white" onClick={() => setPanic(false)} />}

      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2 items-center">
          <button type="button" onClick={() => { abortRef.current?.abort(); setResults([]); setQuery(""); router.push("/"); }}
            className="text-gray-400 hover:text-white text-lg px-2" title="トップに戻る">🎨</button>
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="イラストを検索... (例: 魔法少女, 風景画)"
              className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500" />
            <button type="submit" disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              {loading ? "検索中..." : "検索"}
            </button>
            <button type="button" onClick={() => setR18(v => !v)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${r18 ? "bg-red-600 hover:bg-red-500" : "bg-gray-700 hover:bg-gray-600"}`}>R18</button>
            <button type="button" onClick={() => setNoAI(v => !v)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${noAI ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 hover:bg-gray-600"}`}>AI除外</button>
            <button type="button" onClick={() => { const next = mediaType === "image" ? "video" : "image"; setMediaType(next); if (query.trim()) search(query.trim(), next); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mediaType === "video" ? "bg-purple-600 hover:bg-purple-500" : "bg-gray-700 hover:bg-gray-600"}`}>
              {mediaType === "image" ? "🖼️" : "🎬"}
            </button>
            <button type="button" onClick={() => setSortBy(v => v === "popularity" ? "newest" : "popularity")}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-700 hover:bg-gray-600">
              {sortBy === "popularity" ? "人気順" : "最新順"}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && <p className="text-red-400 text-center mb-4">{error}</p>}

        {failedTweets.length > 0 && (
          <p className="text-yellow-400 text-sm text-center mb-4">取得失敗 {failedTweets.length}件 — 5秒後に自動リトライ...</p>
        )}

        {loading && filtered.length === 0 && (
          <div className="flex items-center justify-center mt-32">
            <p className="text-gray-300 text-sm">検索中...</p>
          </div>
        )}

        {filtered.length > 0 && (() => {
          const cols = 5;
          const items = filtered.flatMap((tweet) =>
            tweet.media.map((m, j) => ({ tweet, m, j, key: `${tweet.id}-${j}` }))
          );
          const columns: typeof items[] = Array.from({ length: cols }, () => []);
          items.forEach((item, i) => columns[i % cols].push(item));
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-2">
                  {col.map(({ tweet, m, j, key }) => (
                    <div key={key} className="group relative cursor-pointer overflow-hidden rounded-lg bg-gray-800"
                      onClick={() => setSelected({ tweet, mediaIndex: j })}>
                      <img src={m.thumbnailImageUrl} alt={tweet.text} width={m.width || 400} height={m.height || 300}
                        className="w-full h-auto group-hover:opacity-80 transition-opacity" loading="lazy" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 text-xs text-white">
                        <span>❤️ {tweet.likesCount.toLocaleString()}</span>
                        <span>🔁 {tweet.rtCount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })()}

        {!loading && results.length === 0 && !error && searchParams.get("q") && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-4xl mb-3">🔍</p>
            <p>「{searchParams.get("q")}」の結果は見つかりませんでした</p>
          </div>
        )}

        {!loading && results.length === 0 && !error && !searchParams.get("q") && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-4xl mb-3">🎨</p>
            <p>キーワードを入力してイラストを検索</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-gray-500 text-xs text-right mb-2">{filtered.length}件 / {results.length}件</p>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/90" onClick={() => history.back()}>
          <ViewerImage
            tweet={selected.tweet} mediaIndex={selected.mediaIndex}
            onClose={() => history.back()}
            hasPrev={selectedFlatIndex > 0}
            hasNext={selectedFlatIndex < flatItems.length - 1}
            onPrev={() => selectedFlatIndex > 0 && setSelected(flatItems[selectedFlatIndex - 1])}
            onNext={() => selectedFlatIndex < flatItems.length - 1 && setSelected(flatItems[selectedFlatIndex + 1])}
          />
        </div>
      )}
    </div>
  );
}
