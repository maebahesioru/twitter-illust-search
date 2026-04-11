// AI生成コンテンツ判定
export const AI_SIGNALS = /ai\s*(art|illust|image|generated|画像|イラスト|アニメ|漫画|絵)|novel\s*ai|\bNai\b|stable\s*diffusion|midjourney|生成ai|aiイラスト|ai生成|毎日ai/i;

// 英語は単語境界あり、日本語はそのまま
export const ART_SIGNALS = new RegExp([
  // 日本語
  "イラスト", "絵師", "絵描き", "漫画家", "イラストレーター", "創作",
  "描き", "描いて", "描いた", "描きました", "描いてます", "描いています",
  "お絵描", "お絵描きしてます", "絵描きです",
  "イラストを描", "絵を描", "イラスト描いてます", "漫画描いてます",
  "らくがき", "落書き", "塗り", "漫画",
  "AI学習禁止", "無断学習禁止", "ai学習禁止",
  "pixivフォロワー", "skebオープン", "skeb open",
  // 英語（単語境界）
  "\\bartist\\b", "\\billustrator\\b", "\\billust", "\\billustration\\b",
  "\\bfanart\\b", "\\bdrawing\\b", "\\bartwork\\b", "\\bmanga\\b", "\\bcomic\\b",
  "\\bpixiv\\b", "\\bskeb\\b", "\\bfanbox\\b", "\\bdeviantart\\b", "\\bartstation\\b",
  "\\bnijie\\b", "\\baipictors\\b", "\\bpatreon\\b",
  "\\bdigital art\\b", "\\bfan art\\b", "\\bpixel art\\b",
].join("|"), "i");

// ネガティブシグナル（bio・ツイート共通）
export const NEG_SIGNALS = new RegExp([
  // 絵師ではなくファン・依頼者を示すフレーズ
  "イラスト好き", "イラストまとめ", "イラストメディア", "イラスト収集", "イラスト垢",
  "絵が好き", "絵を集め", "fanart好き", "fan art好き",
  "描いてもらった", "描いていただ", "描いてくださ",
  // 非アート属性（日本語）
  "公式", "情報発信", "ニュース", "グッズ", "フィギュア",
  "コスプレ", "ダンス", "歌", "配信",
  "料理", "レシピ", "グルメ", "食べ", "メディア欄", "まとめ", "推し活",
  "写真", "カメラ", "撮影",
  "ゲーム発売", "プレゼント", "キャンペーン", "美味し", "買っちゃった",
  // 非アート属性（英語・単語境界）
  "\\bofficial\\b", "\\bnews\\b", "\\bcosplay\\b", "\\bdance\\b", "\\bsinger\\b",
  "\\bvtuber\\b", "\\bphoto\\b", "\\bphotographer\\b",
].join("|"), "i");
