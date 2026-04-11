document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const imageUrl = params.get('url');
  const fallbackUrls = params.get('fallbacks') ? JSON.parse(decodeURIComponent(params.get('fallbacks'))) : [];
  const image = document.getElementById('image');
  const viewer = document.getElementById('viewer');
  
  if (imageUrl) {
    let urls = [imageUrl, ...fallbackUrls];

    // 順番に画像の読み込みを試みる
    function tryLoadImage(index) {
      if (index >= urls.length) {
        console.error('All image formats failed to load');
        return;
      }

      image.src = urls[index];
      image.onerror = () => {
        console.log(`Failed to load image: ${urls[index]}`);
        tryLoadImage(index + 1);
      };
    }

    tryLoadImage(0);
  }

  let scale = 1;
  const ZOOM_SPEED = 0.1;
  const MAX_ZOOM = 10;
  const MIN_ZOOM = 0.1;
  let isDragging = false;
  let startX, startY;
  let translateX = 0;
  let translateY = 0;
  
  // 移動範囲を制限する関数
  function constrainTranslation() {
    const viewerRect = viewer.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const PADDING = 100; // 画面端に100pxの余白を確保
    
    // 画像が表示領域より小さい場合は中央に配置
    if (imageRect.width <= viewerRect.width - PADDING * 2) {
      translateX = 0;
    } else {
      // 左右の制限（余白を含む）
      const maxX = (imageRect.width - viewerRect.width) / 2 + PADDING;
      translateX = Math.max(-maxX, Math.min(maxX, translateX));
    }
    
    if (imageRect.height <= viewerRect.height - PADDING * 2) {
      translateY = 0;
    } else {
      // 上下の制限（余白を含む）
      const maxY = (imageRect.height - viewerRect.height) / 2 + PADDING;
      translateY = Math.max(-maxY, Math.min(maxY, translateY));
    }
  }
  
  // ズーム処理
  document.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newScale = scale + (delta * ZOOM_SPEED * scale);
    scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    
    // スケール変更後に移動範囲を制限
    updateTransform();
    constrainTranslation();
    updateTransform();
  }, { passive: false });

  // パン操作の開始
  image.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    image.style.transition = 'none';
  });

  // パン操作中
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    
    // ドラッグ中も移動範囲を制限
    constrainTranslation();
    updateTransform();
  });

  // パン操作の終了
  document.addEventListener('mouseup', () => {
    isDragging = false;
    image.style.transition = 'transform 0.1s ease-out';
  });

  // transform更新
  function updateTransform() {
    image.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  // 動くイラスト（GIF/APNG）のサポート
  image.addEventListener('load', () => {
    image.style.display = 'block';
    // 画像読み込み後に初期位置を設定
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  });

  // 追加のドラッグ防止
  image.addEventListener('dragstart', (e) => e.preventDefault());
  image.addEventListener('drop', (e) => e.preventDefault());
  document.addEventListener('dragover', (e) => e.preventDefault());
});
