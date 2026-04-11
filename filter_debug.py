#!/usr/bin/env python3
"""
実際のYahoo API + fxtwitter結果でフィルタ通過/除外を調査するスクリプト
使い方: python3 filter_debug.py [クエリ] [件数=40]
"""
import sys, urllib.request, json, re, concurrent.futures

QUERY = sys.argv[1] if len(sys.argv) > 1 else "イラスト"
RESULTS = int(sys.argv[2]) if len(sys.argv) > 2 else 40

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
YAHOO_HEADERS = {"User-Agent": UA, "Accept": "application/json", "Referer": "https://search.yahoo.co.jp/realtime/search"}

ART_KEYWORDS_JP = ["イラスト", "絵師", "描き", "描いて", "お絵描", "創作", "漫画家", "fanbox", "skeb", "pixiv", "イラストレーター"]
ART_KEYWORDS_EN = re.compile(r'\b(artist|illustration|illustrator|drawing|fanart|manga|comic)\b|digital\s+art|fan\s+art|pixel\s+art', re.I)
ART_SITES = ["pixiv", "skeb", "fanbox", "deviantart", "artstation", "nijie", "chichi-pui", "aipictors", "patreon"]
NEG_PHRASES_BIO = ["イラスト好き", "イラストまとめ", "イラストメディア", "イラスト収集", "イラスト垢", "絵が好き", "絵を集め", "fanart好き", "fan art好き", "描いてもらった", "描いていただ"]
POS_PHRASES_BIO = ["絵を描", "イラストを描", "描いてます", "描いています", "お絵描きしてます", "絵描きです", "イラスト描いてます", "漫画描いてます"]
NON_ART_BIO = ["公式", "official", "情報発信", "ニュース", "news", "グッズ", "フィギュア", "コスプレ", "cosplay", "ダンス", "dance", "歌", "singer", "vtuber", "配信", "料理", "レシピ", "グルメ", "食べ", "メディア欄", "まとめ", "推し活", "写真", "photo", "photographer", "カメラ", "撮影"]

def is_illustrator(author):
    desc = author.get("description", "") or ""
    loc = author.get("location", "") or ""
    name = author.get("name", "") or ""
    site = (author.get("website", {}) or {}).get("url", "") or ""
    bio_all = desc + " " + loc + " " + name
    bio_lower = bio_all.lower()

    if any(p in bio_all for p in NEG_PHRASES_BIO):
        return False, "NEG_PHRASE: " + next(p for p in NEG_PHRASES_BIO if p in bio_all)

    pos_phrase = any(p in bio_all for p in POS_PHRASES_BIO)
    jp_match = [k for k in ART_KEYWORDS_JP if k in bio_all]
    en_match = bool(ART_KEYWORDS_EN.search(bio_lower))
    site_match = [s for s in ART_SITES if s in site.lower()]

    if not (pos_phrase or jp_match or en_match or site_match):
        return False, "NO_SIGNAL"

    NON_ART = ["公式", "official", "情報発信", "グッズ", "フィギュア", "コスプレ", "cosplay", "ダンス", "dance", "singer", "vtuber", "料理", "レシピ", "グルメ"]
    neg_count = sum(1 for k in NON_ART if k.lower() in bio_lower)
    pos_count = (3 if pos_phrase else 0) + len(jp_match) + (1 if en_match else 0) + (2 if site_match else 0)

    if pos_count <= neg_count:
        return False, f"NEG_WIN pos={pos_count} neg={neg_count}"
    return True, f"pos={pos_count} neg={neg_count} jp={jp_match} en={en_match} site={site_match}"

def fetch_fx(entry):
    url = f"https://api.fxtwitter.com/{entry['screenName']}/status/{entry['id']}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "bot"})
        with urllib.request.urlopen(req, timeout=5) as r:
            return entry, json.loads(r.read()).get("tweet", {}).get("author")
    except:
        return entry, None

# Yahoo API取得
import urllib.parse
url = f"https://search.yahoo.co.jp/realtime/api/v1/pagination?p={urllib.parse.quote(QUERY)}&md=h&results={RESULTS}&mtype=image"
req = urllib.request.Request(url, headers=YAHOO_HEADERS)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read())

entries = [e for e in data["timeline"]["entry"] if e.get("media")]
print(f"クエリ: {QUERY}  メディアあり: {len(entries)}件\n")

# fxtwitter並列取得
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
    fx_results = list(ex.map(fetch_fx, entries))

passed, rejected = [], []
for entry, author in fx_results:
    if not author:
        rejected.append((entry, author, "FX_FAIL"))
        continue
    ok, reason = is_illustrator(author)
    (passed if ok else rejected).append((entry, author, reason))

def show(entry, author, reason):
    name = author.get("name", "?") if author else "?"
    screen = entry["screenName"]
    desc = (author.get("description", "") or "")[:60].replace("\n", " ") if author else ""
    loc = (author.get("location", "") or "")[:30] if author else ""
    site = ((author.get("website", {}) or {}).get("url", "") or "")[:40] if author else ""
    text = (entry.get("displayTextBody", "") or "")[:60].replace("\n", " ")
    print(f"  @{screen} ({name})")
    print(f"    bio : {desc}")
    print(f"    loc : {loc}  site: {site}")
    print(f"    text: {text}")
    print(f"    → {reason}\n")

print(f"✅ 通過: {len(passed)}件")
for e, a, r in passed:
    show(e, a, r)

print(f"\n❌ 除外: {len(rejected)}件")
for e, a, r in rejected:
    show(e, a, r)
