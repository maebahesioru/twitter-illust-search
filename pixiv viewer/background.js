// URLキャッシュを保持
const urlCache = new Map();

// コンテキストメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-pixiv-viewer",
    title: "Pixiv Viewerで開く",
    contexts: ["image"],
    targetUrlPatterns: ["*://*.pximg.net/*"]
  });
});

// content scriptからのメッセージを受信
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'openViewer') {
    const urls = message.urls;
    const viewerUrl = chrome.runtime.getURL(`viewer.html?url=${encodeURIComponent(urls[0])}&fallbacks=${encodeURIComponent(JSON.stringify(urls.slice(1)))}`);
    chrome.tabs.create({ url: viewerUrl });
  }
  
  if (message.action === 'saveImage') {
    handleSaveImage(message.illustId, message.urls, message.title, message.author);
    sendResponse({ success: true });
  }
  
  return true;
});

// 画像をfetchしてData URLに変換してダウンロード
async function downloadImageWithReferer(imageUrl, filename) {
  try {
    console.log(`Fetching image: ${imageUrl}`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://www.pixiv.net/',
        'Origin': 'https://www.pixiv.net'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    
    // BlobをData URLに変換
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    console.log(`Downloading: ${filename}`);
    
    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });
    
    console.log(`Downloaded: ${filename}`);
    return true;
  } catch (e) {
    console.error('Download failed:', e);
    return false;
  }
}

// 画像保存処理
async function handleSaveImage(illustId, urls, title, author) {
  const settings = await chrome.storage.sync.get({
    enableAutoSave: false,
    saveLocal: true,
    saveArchive: false
  });
  
  if (!settings.enableAutoSave) {
    console.log('Auto save is disabled');
    return;
  }
  
  console.log(`Saving image: ${illustId} - ${title} by ${author}`);
  
  const imageUrl = urls[0];
  const ext = imageUrl.match(/\.(\w+)$/)?.[1] || 'jpg';
  const safeTitle = (title || illustId).replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
  const safeAuthor = (author || 'unknown').replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);
  const filename = `pixiv/${safeAuthor}/${illustId}_${safeTitle}.${ext}`;
  
  // ローカルダウンロード
  if (settings.saveLocal) {
    await downloadImageWithReferer(imageUrl, filename);
  }
  
  // Internet Archiveに保存
  if (settings.saveArchive) {
    try {
      const artworkUrl = `https://www.pixiv.net/artworks/${illustId}`;
      const archiveUrl = `https://web.archive.org/save/${artworkUrl}`;
      
      fetch(archiveUrl, { method: 'GET', mode: 'no-cors' })
        .then(() => console.log(`Archived: ${artworkUrl}`))
        .catch(e => console.error('Archive failed:', e));
    } catch (e) {
      console.error('Archive request failed:', e);
    }
  }
}

// イラストIDとページ番号からキャッシュキーを生成
function getCacheKey(url) {
  const match = url.match(/(\d+)_p(\d+)/);
  return match ? `${match[1]}_${match[2]}` : url;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "open-pixiv-viewer") {
    try {
      const cacheKey = getCacheKey(info.srcUrl);
      let urls;

      if (urlCache.has(cacheKey)) {
        urls = urlCache.get(cacheKey);
      } else {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (srcUrl) => {
            const img = document.querySelector(`img[src="${srcUrl}"]`);
            return img ? img.dataset.originalUrls || JSON.stringify([img.src]) : JSON.stringify([srcUrl]);
          },
          args: [info.srcUrl]
        });
        
        urls = JSON.parse(results[0].result);
        urlCache.set(cacheKey, urls);

        if (urlCache.size > 100) {
          const firstKey = urlCache.keys().next().value;
          urlCache.delete(firstKey);
        }
      }

      const viewerUrl = chrome.runtime.getURL(`viewer.html?url=${encodeURIComponent(urls[0])}&fallbacks=${encodeURIComponent(JSON.stringify(urls.slice(1)))}`);
      chrome.tabs.create({ url: viewerUrl });
    } catch (error) {
      console.error('Error getting original URLs:', error);
      const viewerUrl = chrome.runtime.getURL(`viewer.html?url=${encodeURIComponent(info.srcUrl)}`);
      chrome.tabs.create({ url: viewerUrl });
    }
  }
});
