import { ART_SIGNALS, NEG_SIGNALS } from "./words";

export { ART_SIGNALS, NEG_SIGNALS };

const countMatches = (text: string, re: RegExp) =>
  (text.match(new RegExp(re.source, "gi")) ?? []).length;

export function illustratorScore(author: any, hashtags: string[], tweetText: string): number {
  const desc: string = author?.description ?? "";
  const loc: string = author?.location ?? "";
  const name: string = author?.name ?? "";
  const siteUrl: string = (author?.website?.url ?? "").toLowerCase();
  const bioAll = (desc + " " + loc + " " + name).toLowerCase();
  const allText = bioAll + " " + siteUrl;
  let score = 0;

  score += countMatches(allText, ART_SIGNALS) * 200;
  score += countMatches(tweetText, ART_SIGNALS) * 400;

  const tagText = hashtags.map((t: any) => (typeof t === "string" ? t : t?.text ?? "")).join(" ");
  score += countMatches(tagText, ART_SIGNALS) * 250;

  score -= countMatches(bioAll, NEG_SIGNALS) * 200;
  score -= countMatches(tweetText, NEG_SIGNALS) * 150;

  return Math.round(score);
}

export function isIllustrator(author: any, tweetText?: string): boolean {
  const desc: string = author?.description ?? "";
  const loc: string = author?.location ?? "";
  const name: string = author?.name ?? "";
  const siteUrl: string = (author?.website?.url ?? "").toLowerCase();
  const bioAll = (desc + " " + loc + " " + name).toLowerCase();
  const allText = bioAll + " " + siteUrl;
  const text: string = tweetText ?? "";

  if (!ART_SIGNALS.test(allText)) return false;

  const posCount = countMatches(allText, ART_SIGNALS) + (ART_SIGNALS.test(text) ? 1 : 0);
  const negCount = countMatches(bioAll, NEG_SIGNALS) + countMatches(text, NEG_SIGNALS);

  return posCount > negCount;
}
