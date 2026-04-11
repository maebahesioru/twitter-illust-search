#!/usr/bin/env tsx
/**
 * 使い方: npx tsx filter_debug.ts [クエリ] [件数=40]
 */
import { illustratorScore, isIllustrator, NEG_PHRASES_BIO, POS_PHRASES_BIO, ART_KEYWORDS_JP, ART_KEYWORDS_EN, ART_SITES } from "./src/lib/filter";

const QUERY = process.argv[2] ?? "イラスト";
const RESULTS = parseInt(process.argv[3] ?? "40");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function reason(author: any): string {
  const desc: string = author?.description ?? "";
  const loc: string = author?.location ?? "";
  const name: string = author?.name ?? "";
  const site: string = (author?.website?.url ?? "").toLowerCase();
  const bioAll = desc + " " + loc + " " + name;
  const bioAllLower = bioAll.toLowerCase();
  const allUrls = bioAllLower + " " + site;

  const negPhrase = NEG_PHRASES_BIO.find((p) => bioAll.includes(p));
  if (negPhrase) return `NEG_PHRASE: ${negPhrase}`;

  const posPhrase = POS_PHRASES_BIO.find((p) => bioAll.includes(p));
  const jpMatches = ART_KEYWORDS_JP.filter((k) => bioAll.includes(k));
  const enMatch = ART_KEYWORDS_EN.test(bioAllLower);
  const siteMatches = ART_SITES.filter((s) => allUrls.includes(s));

  if (!posPhrase && !jpMatches.length && !enMatch && !siteMatches.length) return "NO_SIGNAL";

  const NON_ART = ["公式", "official", "情報発信", "グッズ", "フィギュア", "コスプレ", "cosplay", "ダンス", "dance", "singer", "vtuber", "料理", "レシピ", "グルメ"];
  const negCount = NON_ART.filter((k) => bioAllLower.includes(k)).length;
  const posCount = (posPhrase ? 3 : 0) + jpMatches.length + (enMatch ? 1 : 0) + (siteMatches.length ? 2 : 0);

  if (posCount <= negCount) return `NEG_WIN pos=${posCount} neg=${negCount}`;
  return `pass pos=${posCount} neg=${negCount} jp=${JSON.stringify(jpMatches)} en=${enMatch} site=${JSON.stringify(siteMatches)}${posPhrase ? ` phrase="${posPhrase}"` : ""}`;
}

async function main() {
  const yahooUrl = `https://search.yahoo.co.jp/realtime/api/v1/pagination?p=${encodeURIComponent(QUERY)}&md=h&results=${RESULTS}&mtype=image`;
  const data = await fetch(yahooUrl, {
    headers: { "User-Agent": UA, "Accept": "application/json", "Referer": "https://search.yahoo.co.jp/realtime/search" },
  }).then((r) => r.json());

  const entries: any[] = (data?.timeline?.entry ?? []).filter((e: any) => e.media?.length > 0);
  console.log(`クエリ: ${QUERY}  メディアあり: ${entries.length}件\n`);

  const fxResults = await Promise.all(
    entries.map((e) =>
      fetch(`https://api.fxtwitter.com/${e.screenName}/status/${e.id}`, { headers: { "User-Agent": "bot" } })
        .then((r) => r.ok ? r.json() : null).catch(() => null)
    )
  );

  const passed: any[] = [], rejected: any[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const author = fxResults[i]?.tweet?.author;
    const r = reason(author);
    const ok = author && isIllustrator(author, e.displayTextBody ?? "");
    (ok ? passed : rejected).push({ e, author, r });
  }

  function show({ e, author, r }: any) {
    const desc = (author?.description ?? "").slice(0, 60).replace(/\n/g, " ");
    const loc = (author?.location ?? "").slice(0, 30);
    const site = (author?.website?.url ?? "").slice(0, 40);
    const bioUrls = (author?.description ?? "").match(/https?:\/\/\S+/g)?.join(" ").slice(0, 60) ?? "";
    const text = (e.displayTextBody ?? "").replace(/\tSTART\t|\tEND\t/g, "").slice(0, 60).replace(/\n/g, " ");
    const score = author ? illustratorScore(author, e.hashtags ?? [], e.displayTextBody ?? "") : 0;
    console.log(`  @${e.screenName} (${author?.name ?? "?"}) score=${score}`);
    console.log(`    bio : ${desc}`);
    console.log(`    loc : ${loc}`);
    if (site) console.log(`    site: ${site}`);
    if (bioUrls) console.log(`    urls: ${bioUrls}`);
    console.log(`    text: ${text}`);
    console.log(`    → ${r}\n`);
  }

  console.log(`✅ 通過: ${passed.length}件`);
  passed.forEach(show);
  console.log(`\n❌ 除外: ${rejected.length}件`);
  rejected.forEach(show);
}

main();
