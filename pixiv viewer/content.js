// Pixivのイラストページでの追加機能をここに実装

// オリジナル画質のURLを取得
function getOriginalImageUrl(targetImage) {
    const currentSrc = targetImage.src || targetImage.dataset.src || targetImage.currentSrc;
    if (!currentSrc) return null;

    // イラストIDとページ番号を抽出
    const illustIdMatch = currentSrc.match(/(\d{8,})_p(\d+)/);
    if (!illustIdMatch) return null;
    const illustId = illustIdMatch[1];
    const pageNum = illustIdMatch[2];

    // 1. 現在のページのメタデータをチェック
    const metaContent = document.querySelector('meta[name="preload-data"]')?.content;
    if (metaContent) {
        try {
            const preloadData = JSON.parse(metaContent);
            if (preloadData.illust?.[illustId]?.urls?.original) {
                const originalUrl = preloadData.illust[illustId].urls.original;
                return [originalUrl.replace(/_p\d+/, `_p${pageNum}`)];
            }
        } catch (e) {
            console.log('Failed to parse preload data:', e);
        }
    }

    // 2. URLから日付パスを抽出してオリジナルURLを構築
    const datePathMatch = currentSrc.match(/(\d{4}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/\d{2})/);
    if (datePathMatch) {
        const datePath = datePathMatch[1];
        const baseOriginal = `https://i.pximg.net/img-original/img/${datePath}/${illustId}_p${pageNum}`;
        return [
            `${baseOriginal}.jpg`,
            `${baseOriginal}.png`,
            `${baseOriginal}.gif`,
            currentSrc
        ];
    }

    // 3. 直接URLを変換
    let convertedUrl = currentSrc
        .replace(/\/c\/\d+x\d+(_\w+)?\//, '/')
        .replace(/\/img-master\//, '/img-original/')
        .replace(/_master\d+/, '')
        .replace(/_square\d+/, '')
        .replace(/_custom\d+/, '');
    
    // 拡張子を除去してベースURLを作成
    const baseUrl = convertedUrl.replace(/\.\w+$/, '');
    
    return [
        `${baseUrl}.jpg`,
        `${baseUrl}.png`,
        `${baseUrl}.gif`,
        currentSrc
    ];
}

// 作品詳細ページのメイン画像かどうかを判定
function isArtworkMainImage(img) {
    // URLが /artworks/ を含む場合のみ
    if (!location.pathname.includes('/artworks/')) return false;
    
    // 画像サイズが大きい（サムネイルではない）
    const rect = img.getBoundingClientRect();
    if (rect.width < 400 || rect.height < 400) return false;
    
    // img-masterを含む（メイン表示用の画像）
    if (!img.src.includes('img-master')) return false;
    
    return true;
}

// いいねやブックマークなどのUIボタン、リンク、テキスト要素かどうかを判定
function isUIButtonOrLink(element) {
    let current = element;
    while (current && current !== document.body) {
        // リンク（ハッシュタグ、ユーザーリンク等）
        if (current.tagName === 'A') {
            return true;
        }
        // テキストを含むdiv/span（「すべて見る」等のボタン）
        if ((current.tagName === 'DIV' || current.tagName === 'SPAN') && 
            current.textContent?.trim() && 
            !current.querySelector('img[src*="pximg.net"]')) {
            return true;
        }
        // SVGアイコン（ハートやブックマーク）を含むボタン
        if (current.tagName === 'BUTTON') {
            // 小さいボタンはUIボタン（いいね、ブックマーク等）
            const rect = current.getBoundingClientRect();
            if (rect.width < 100 && rect.height < 100) {
                return true;
            }
            // aria-labelがあるボタンはUIボタン
            if (current.getAttribute('aria-label')) {
                return true;
            }
        }
        // SVG直接クリック
        if (current.tagName === 'SVG' || current.tagName === 'svg') {
            return true;
        }
        // data-click-labelがあるのはトラッキング用のUIボタン
        if (current.hasAttribute('data-click-label')) {
            return true;
        }
        current = current.parentElement;
    }
    return false;
}

// クリックでビューアを開く（作品詳細ページのメイン画像のみ）
document.addEventListener('click', (e) => {
    // pximg画像を直接クリックした場合
    if (e.target.tagName === 'IMG' && e.target.src.includes('pximg.net')) {
        const img = e.target;
        if (!img.src.match(/\d{8,}_p\d+/)) return;
        if (!isArtworkMainImage(img)) return;
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const urls = getOriginalImageUrl(img);
        if (urls) {
            chrome.runtime.sendMessage({
                action: 'openViewer',
                urls: urls
            });
        }
        return;
    }
    
    // UIボタンやリンクのクリックは無視
    if (isUIButtonOrLink(e.target)) return;
    
    // 親要素を辿って画像を探す（ズームカーソルの要素をクリックした場合）
    let target = e.target;
    let foundImg = null;
    while (target && target !== document.body) {
        const imgInside = target.querySelector('img[src*="pximg.net"]');
        if (imgInside && imgInside.src.match(/\d{8,}_p\d+/)) {
            foundImg = imgInside;
            break;
        }
        target = target.parentElement;
    }
    
    if (foundImg && isArtworkMainImage(foundImg)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const urls = getOriginalImageUrl(foundImg);
        if (urls) {
            chrome.runtime.sendMessage({
                action: 'openViewer',
                urls: urls
            });
        }
    }
}, true);

// コンテキストメニュー時にオリジナルURLを設定（右クリックも維持）
document.addEventListener('contextmenu', (e) => {
    const target = e.target;
    if (target.tagName === 'IMG' && target.src.includes('pximg.net')) {
        const urls = getOriginalImageUrl(target);
        if (urls) {
            target.dataset.originalUrls = JSON.stringify(urls);
        }
    }
}, true);

// ページ読み込み時にpreload-dataがあれば全画像にURLを設定
function setOriginalUrlsFromPreload() {
    const metaContent = document.querySelector('meta[name="preload-data"]')?.content;
    if (!metaContent) return;

    try {
        const preloadData = JSON.parse(metaContent);
        const illusts = preloadData.illust || {};
        
        document.querySelectorAll('img[src*="pximg.net"]').forEach(img => {
            const match = img.src.match(/(\d{8,})_p(\d+)/);
            if (match) {
                const illustId = match[1];
                const pageNum = match[2];
                if (illusts[illustId]?.urls?.original) {
                    const originalUrl = illusts[illustId].urls.original.replace(/_p\d+/, `_p${pageNum}`);
                    img.dataset.originalUrls = JSON.stringify([originalUrl]);
                }
            }
        });
    } catch (e) {
        console.log('Failed to set original URLs from preload:', e);
    }
}

// DOMの変更を監視して新しい画像にもURLを設定
const observer = new MutationObserver(() => {
    setOriginalUrlsFromPreload();
});

observer.observe(document.body, { childList: true, subtree: true });
setOriginalUrlsFromPreload();

// Pixiv APIからイラスト情報を取得
async function fetchIllustInfo(illustId) {
    try {
        const response = await fetch(`https://www.pixiv.net/ajax/illust/${illustId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.error) {
            console.error('Pixiv API error:', data.message);
            return null;
        }
        return data.body;
    } catch (e) {
        console.error('Failed to fetch illust info:', e);
        return null;
    }
}

// いいねボタンのクリックを監視して自動保存
function setupLikeButtonWatcher() {
    document.addEventListener('click', async (e) => {
        const target = e.target;
        
        // いいねボタンを検出（aタグまたはbutton）
        const likeLink = target.closest('a[href*="bookmark_add.php"]');
        const likeButton = target.closest('button[data-click-label="like"]');
        
        // SVGのハートパスを含む親要素をチェック
        const svgParent = target.closest('svg')?.parentElement?.closest('a, button');
        const hasHeartPath = target.closest('svg')?.innerHTML?.includes('M21,5.5') ||
                            target.closest('a, button')?.querySelector('svg')?.innerHTML?.includes('M21,5.5');
        
        const isLikeButton = likeLink || likeButton || (svgParent && hasHeartPath);
        
        if (!isLikeButton) return;
        
        // 作品ページでのみ動作
        const illustIdMatch = location.pathname.match(/\/artworks\/(\d+)/);
        if (!illustIdMatch) return;
        
        const illustId = illustIdMatch[1];
        
        console.log(`Pixiv Viewer: いいねボタンクリック検出 - ${illustId}`);
        
        // 少し待ってから保存（いいね処理完了を待つ）
        setTimeout(async () => {
            try {
                // まずpreload-dataを試す
                let illust = null;
                const metaContent = document.querySelector('meta[name="preload-data"]')?.content;
                if (metaContent) {
                    try {
                        const preloadData = JSON.parse(metaContent);
                        illust = preloadData.illust?.[illustId];
                    } catch (e) {
                        console.log('Failed to parse preload-data');
                    }
                }
                
                // preload-dataがなければAPIから取得
                if (!illust?.urls?.original) {
                    console.log('Pixiv Viewer: preload-data not found, fetching from API...');
                    illust = await fetchIllustInfo(illustId);
                }
                
                if (!illust?.urls?.original) {
                    console.log('Pixiv Viewer: original URL not found');
                    return;
                }
                
                const urls = [illust.urls.original];
                const title = illust.title || '';
                const author = illust.userName || '';
                
                console.log(`Pixiv Viewer: 保存リクエスト送信 - ${title} by ${author}`);
                
                chrome.runtime.sendMessage({
                    action: 'saveImage',
                    illustId: illustId,
                    urls: urls,
                    title: title,
                    author: author
                });
            } catch (e) {
                console.error('Failed to save on like:', e);
            }
        }, 500);
    }, true);
}

setupLikeButtonWatcher();
