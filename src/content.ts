// 快適モードの状態管理
let isComfortModeActive = false;
let currentActiveVideo: HTMLVideoElement | null = null; // 現在快適モードで使用中の動画要素
let originalVideoStyles: Map<HTMLVideoElement, {
  position: string;
  top: string;
  left: string;
  width: string;
  height: string;
  zIndex: string;
  transform: string;
}> = new Map();

// 動画要素監視用のMutationObserver
let videoWatcher: MutationObserver | null = null;

// 解除ボタンの要素
let exitButton: HTMLElement | null = null;

// YouTube用コントロールボタンの要素
let youtubeControlButton: HTMLElement | null = null;

// Amazon Prime Video用コントロールボタンの要素
let primeControlButton: HTMLElement | null = null;

// z-index制御用のスタイル要素
let zIndexStyle: HTMLStyleElement | null = null;

// カーソル検出用の変数
let cursorTimer: number | null = null;
let controlsDisableTimer: number | null = null;
let isVideoControlsEnabled = false;
let lastIsInVideoArea = false; // 前回の動画エリア状態を記録
const HOVER_DETECTION_TIME = 2000; // 2秒間カーソルが下部にあると検出
const CONTROLS_DISABLE_TIME = 3000; // 3秒間動画から離れるとコントロール無効化

// YouTube用の機能
function isYouTube(): boolean {
  return window.location.hostname === 'www.youtube.com' || window.location.hostname === 'youtube.com';
}

// Amazon Prime Video用の機能
function isPrimeVideo(): boolean {
  return window.location.hostname === 'www.amazon.com' || window.location.hostname === 'amazon.com' ||
         window.location.hostname === 'www.primevideo.com' || window.location.hostname === 'primevideo.com';
}

// YouTubeボタンの状態を更新
function updateYouTubeButtonState(): void {
  if (!youtubeControlButton) return;

  if (isComfortModeActive) {
    youtubeControlButton.style.background = 'rgba(255, 255, 255, 0.2) !important';
    youtubeControlButton.style.opacity = '1 !important';
    youtubeControlButton.title = chrome.i18n.getMessage('comfortModeTooltipOn');
  } else {
    youtubeControlButton.style.background = 'transparent !important';
    youtubeControlButton.style.opacity = '0.8 !important';
    youtubeControlButton.title = chrome.i18n.getMessage('comfortModeTooltip');
  }
}

// YouTubeコントロールボタンを追加
function addYouTubeControlButton(): void {
  if (!isYouTube() || youtubeControlButton) return;

  const rightControls = document.querySelector('.ytp-right-controls');
  if (!rightControls) return;

  // ボタンを作成
  youtubeControlButton = document.createElement('button');
  youtubeControlButton.className = 'ytp-button comfort-mode-button';
  youtubeControlButton.title = chrome.i18n.getMessage('comfortModeTooltip');
  youtubeControlButton.innerHTML = `
    <svg width="36" height="36" viewBox="0 0 128 128" fill="white">
      <rect x="40" y="50" width="48" height="40" rx="8" fill="white"/>
      <rect x="52" y="35" width="6" height="20" rx="3" fill="white"/>
      <rect x="70" y="35" width="6" height="20" rx="3" fill="white"/>
      <path d="M64 65 C58 65 54 69 54 74 C54 79 58 83 64 83" stroke="#2d5aa0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <line x1="64" y1="25" x2="64" y2="35" stroke="white" stroke-width="3"/>
    </svg>
  `;

  youtubeControlButton.style.cssText = `
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    padding: 0 !important;
    margin: 0 !important;
    opacity: 0.8 !important;
    transition: all 0.2s ease !important;
    width: auto !important;
    height: auto !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  `;

  // ホバー効果
  youtubeControlButton.addEventListener('mouseenter', () => {
    if (youtubeControlButton && !isComfortModeActive) {
      youtubeControlButton.style.opacity = '1';
    }
  });

  youtubeControlButton.addEventListener('mouseleave', () => {
    if (youtubeControlButton && !isComfortModeActive) {
      youtubeControlButton.style.opacity = '0.8';
    }
  });

  // クリックイベント
  youtubeControlButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isComfortModeActive) {
      disableComfortMode();
    } else {
      enableComfortMode();
    }
  });

  // 先頭に挿入
  rightControls.insertBefore(youtubeControlButton, rightControls.firstChild);

  // 初期状態を設定
  updateYouTubeButtonState();
}

// Prime Videoボタンの状態を更新
function updatePrimeButtonState(): void {
  if (!primeControlButton) return;

  if (isComfortModeActive) {
    primeControlButton.style.background = 'rgba(255, 255, 255, 0.2) !important';
    primeControlButton.style.opacity = '1 !important';
    primeControlButton.title = chrome.i18n.getMessage('comfortModeTooltipOn');
  } else {
    primeControlButton.style.background = 'transparent !important';
    primeControlButton.style.opacity = '0.8 !important';
    primeControlButton.title = chrome.i18n.getMessage('comfortModeTooltip');
  }
}

// Prime Videoコントロールボタンを追加
function addPrimeControlButton(): void {
  if (!isPrimeVideo() || primeControlButton) return;

  const topButtons = document.querySelector('div.atvwebplayersdk-hideabletopbuttons-container');
  if (!topButtons) return;

  // ボタンを作成
  primeControlButton = document.createElement('button');
  primeControlButton.className = 'comfort-mode-button';
  primeControlButton.title = chrome.i18n.getMessage('comfortModeTooltip');
  primeControlButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 128 128" fill="white">
      <rect x="40" y="50" width="48" height="40" rx="8" fill="white"/>
      <rect x="52" y="35" width="6" height="20" rx="3" fill="white"/>
      <rect x="70" y="35" width="6" height="20" rx="3" fill="white"/>
      <path d="M64 65 C58 65 54 69 54 74 C54 79 58 83 64 83" stroke="#2d5aa0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <line x1="64" y1="25" x2="64" y2="35" stroke="white" stroke-width="3"/>
    </svg>
  `;

  primeControlButton.style.cssText = `
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    padding: 8px !important;
    margin: 0 8px !important;
    opacity: 0.8 !important;
    transition: all 0.2s ease !important;
    width: auto !important;
    height: auto !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 4px !important;
  `;

  // ホバー効果
  primeControlButton.addEventListener('mouseenter', () => {
    if (primeControlButton && !isComfortModeActive) {
      primeControlButton.style.opacity = '1';
      primeControlButton.style.background = 'rgba(255, 255, 255, 0.1) !important';
    }
  });

  primeControlButton.addEventListener('mouseleave', () => {
    if (primeControlButton && !isComfortModeActive) {
      primeControlButton.style.opacity = '0.8';
      primeControlButton.style.background = 'transparent !important';
    }
  });

  // クリックイベント
  primeControlButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isComfortModeActive) {
      disableComfortMode();
    } else {
      enableComfortMode();
    }
  });

  // 先頭に挿入
  topButtons.insertBefore(primeControlButton, topButtons.firstChild);

  // 初期状態を設定
  updatePrimeButtonState();
}

// Prime Videoコントロールボタンを削除
function removePrimeControlButton(): void {
  if (primeControlButton) {
    primeControlButton.remove();
    primeControlButton = null;
  }
}

// YouTubeコントロールボタンを削除
function removeYouTubeControlButton(): void {
  if (youtubeControlButton) {
    youtubeControlButton.remove();
    youtubeControlButton = null;
  }
}

// Prime Video用のMutationObserverを設定
function setupPrimeObserver(): void {
  if (!isPrimeVideo()) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // .atvwebplayersdk-hideabletopbuttons-containerが追加されたかチェック
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.querySelector('div.atvwebplayersdk-hideabletopbuttons-container') ||
                element.classList.contains('atvwebplayersdk-hideabletopbuttons-container')) {
              setTimeout(addPrimeControlButton, 100);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 初回チェック
  setTimeout(addPrimeControlButton, 1000);
}

// YouTube用のMutationObserverを設定
function setupYouTubeObserver(): void {
  if (!isYouTube()) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // .ytp-right-controlsが追加されたかチェック
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.querySelector('.ytp-right-controls') || element.classList.contains('ytp-right-controls')) {
              setTimeout(addYouTubeControlButton, 100);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 初回チェック
  setTimeout(addYouTubeControlButton, 1000);
}

// 動画要素を検出し、快適モードを適用する関数
function enableComfortMode(): void {
  const videos = document.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;

  if (videos.length === 0) {
    alert(chrome.i18n.getMessage('noVideoFound'));
    return;
  }

  isComfortModeActive = true;

  videos.forEach(video => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      // 最初に見つかった有効な動画をアクティブ動画として記録
      if (!currentActiveVideo) {
        currentActiveVideo = video;
      }

      // 元のスタイルを保存
      const computedStyle = window.getComputedStyle(video);
      originalVideoStyles.set(video, {
        position: computedStyle.position,
        top: computedStyle.top,
        left: computedStyle.left,
        width: computedStyle.width,
        height: computedStyle.height,
        zIndex: computedStyle.zIndex,
        transform: computedStyle.transform
      });

      // 動画を最大化
      maximizeVideo(video);

      // 動画にクラスを追加
      video.classList.add('comfort-mode-video');

      // 動画のコンテナ要素（親要素）にもクラスを追加
      let parent = video.parentElement;
      if (parent) {
        parent.classList.add('comfort-mode-video-container');
      }
    }
  });

  // 動画要素の監視を開始
  startVideoWatcher();

  // z-index制御を適用
  applyZIndexControl();

  // マウスイベントを無効化（改良版）
  disableMouseEvents();

  // カーソル検出を開始
  startCursorDetection();

  // 解除ボタンを表示
  showExitButton();

  // YouTubeボタンの状態を更新
  updateYouTubeButtonState();

  // Prime Videoボタンの状態を更新
  updatePrimeButtonState();
}

// 動画を画面いっぱいに最大化する関数
function maximizeVideo(video: HTMLVideoElement): void {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const videoAspectRatio = video.videoWidth / video.videoHeight;
  const windowAspectRatio = windowWidth / windowHeight;

  let newWidth: number;
  let newHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspectRatio > windowAspectRatio) {
    // 動画が横長の場合、幅をウィンドウに合わせる
    newWidth = windowWidth;
    newHeight = windowWidth / videoAspectRatio;
    offsetY = (windowHeight - newHeight) / 2;
  } else {
    // 動画が縦長の場合、高さをウィンドウに合わせる
    newHeight = windowHeight;
    newWidth = windowHeight * videoAspectRatio;
    offsetX = (windowWidth - newWidth) / 2;
  }

  // スタイルを適用（z-indexはCSSクラスで制御）
  video.style.cssText += `
    position: fixed !important;
    top: ${offsetY}px !important;
    left: ${offsetX}px !important;
    width: ${newWidth}px !important;
    height: ${newHeight}px !important;
    object-fit: fill !important;
    transform: none !important;
  `;
}

// マウスイベントを無効化する関数（改良版）
function disableMouseEvents(): void {
  const style = document.createElement('style');
  style.id = 'comfort-mode-style';
  style.textContent = `
    /* コントロール無効時のみpointer-eventsを無効化 */
    body.comfort-mode-active:not(.video-controls-enabled) * {
      pointer-events: none !important;
    }
    body.comfort-mode-active #comfort-mode-exit-button {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);
}

// z-index制御を適用する関数
function applyZIndexControl(): void {
  zIndexStyle = document.createElement('style');
  zIndexStyle.id = 'comfort-mode-zindex-control';
  zIndexStyle.textContent = `
    /* 動画を最前面に */
    .comfort-mode-video {
      z-index: 2147483647 !important;
    }

    /* 他の要素のz-indexを制限 */
    body.comfort-mode-active *:not(.comfort-mode-video):not(#comfort-mode-exit-button) {
      z-index: 999998 !important;
    }

    /* 解除ボタンを動画より上に */
    #comfort-mode-exit-button {
      z-index: 2147483648 !important;
    }
  `;
  document.head.appendChild(zIndexStyle);

  // body要素にクラスを追加
  document.body.classList.add('comfort-mode-active');
}

// z-index制御を解除する関数
function removeZIndexControl(): void {
  if (zIndexStyle) {
    zIndexStyle.remove();
    zIndexStyle = null;
  }

  // body要素からクラスを削除
  document.body.classList.remove('comfort-mode-active');
  document.body.classList.remove('video-area-hovered');

  // 動画とコンテナからクラスを削除
  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  videos.forEach(video => {
    video.classList.remove('comfort-mode-video');
    // コンテナのクラスも削除
    const parent = video.parentElement;
    if (parent) {
      parent.classList.remove('comfort-mode-video-container');
    }
  });
}

// 動画の再生状態監視を開始
function startVideoPlaybackMonitoring(): void {
  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;

  videos.forEach(video => {
    // 動画が再生開始されたらコントロール無効化を検討
    video.addEventListener('play', () => {
      // 動画外にマウスがある場合のみコントロール無効化タイマーを開始
      if (isVideoControlsEnabled) {
        const lastMouseEvent = (window as any).lastMouseEvent;
        if (lastMouseEvent) {
          const rect = video.getBoundingClientRect();
          const isInVideoArea = lastMouseEvent.clientX >= rect.left && lastMouseEvent.clientX <= rect.right &&
                               lastMouseEvent.clientY >= rect.top && lastMouseEvent.clientY <= rect.bottom;

          if (!isInVideoArea && !controlsDisableTimer) {
            controlsDisableTimer = setTimeout(() => {
              disableVideoControls();
              controlsDisableTimer = null;
            }, CONTROLS_DISABLE_TIME);
          }
        }
      }
    });

    // 動画が停止した場合は無効化タイマーをキャンセル
    video.addEventListener('pause', () => {
      if (controlsDisableTimer) {
        clearTimeout(controlsDisableTimer);
        controlsDisableTimer = null;
      }
    });
  });
}

// カーソル検出を開始する関数
function startCursorDetection(): void {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick);
  startVideoPlaybackMonitoring();
}

// カーソル検出を停止する関数
function stopCursorDetection(): void {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick);
  if (cursorTimer) {
    clearTimeout(cursorTimer);
    cursorTimer = null;
  }
  if (controlsDisableTimer) {
    clearTimeout(controlsDisableTimer);
    controlsDisableTimer = null;
  }
  disableVideoControls();
}

// 動画が停止中かどうかをチェック
function isVideoPaused(): boolean {
  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  let allPaused = true;

  videos.forEach(video => {
    if (!video.paused && !video.ended) {
      allPaused = false;
    }
  });

  return videos.length > 0 && allPaused;
}

// マウス移動時の処理
function handleMouseMove(event: MouseEvent): void {
  if (!isComfortModeActive) return;

  // 最後のマウスイベントを保存（解除ボタンのホバー効果で使用）
  (window as any).lastMouseEvent = event;

  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  if (videos.length === 0) return;

  // 動画停止中かチェック
  const videoPaused = isVideoPaused();

  // 動画領域内かチェック（全体）
  let isInVideoArea = false;
  let isInVideoBottomArea = false;

  videos.forEach(video => {
    const rect = video.getBoundingClientRect();

    // 動画全体の範囲内かチェック
    if (event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom) {
      isInVideoArea = true;

      // さらに下部20%の範囲内かチェック
      const bottomAreaHeight = rect.height * 0.2;
      const bottomAreaTop = rect.bottom - bottomAreaHeight;

      if (event.clientY >= bottomAreaTop) {
        isInVideoBottomArea = true;
      }
    }
  });

  // 動画停止中の場合は常にコントロールを有効化
  if (videoPaused && !isVideoControlsEnabled) {
    enableVideoControls();
  }

  // 解除ボタンの透明度制御（状態が変わった時だけ）
  if (isInVideoArea !== lastIsInVideoArea) {
    updateExitButtonOpacity(isInVideoArea);
    lastIsInVideoArea = isInVideoArea;

    // CSSクラスによる制御も追加
    if (isInVideoArea) {
      document.body.classList.add('video-area-hovered');
    } else {
      document.body.classList.remove('video-area-hovered');
    }
  }

  // この部分は削除：毎回の呼び出しは不要

  // コントロール無効化タイマーの処理（動画停止中は無効化しない）
  if (isInVideoArea) {
    // 動画内にいる場合は無効化タイマーをキャンセル
    if (controlsDisableTimer) {
      clearTimeout(controlsDisableTimer);
      controlsDisableTimer = null;
    }
  } else {
    // 動画から離れた場合（動画停止中は無効化しない）
    if (isVideoControlsEnabled && !controlsDisableTimer && !videoPaused) {
      // コントロールが有効で、まだタイマーが設定されていない場合
      controlsDisableTimer = setTimeout(() => {
        disableVideoControls();
        controlsDisableTimer = null;
      }, CONTROLS_DISABLE_TIME);
    }
  }

  // コントロール有効化タイマーの処理（動画停止中は即座に有効化）
  if (isInVideoBottomArea) {
    // 動画下部にカーソルがある場合、タイマーを開始（停止中は即座に有効化）
    if (!isVideoControlsEnabled) {
      if (videoPaused) {
        // 停止中は即座に有効化
        enableVideoControls();
      } else {
        // 再生中は2秒待つ
        if (cursorTimer) {
          clearTimeout(cursorTimer);
        }

        cursorTimer = setTimeout(() => {
          enableVideoControls();
          cursorTimer = null;
        }, HOVER_DETECTION_TIME);
      }
    }
  } else {
    // 動画下部から離れた場合、有効化タイマーをリセット
    if (cursorTimer) {
      clearTimeout(cursorTimer);
      cursorTimer = null;
    }
  }
}

// クリック時の処理
function handleClick(event: MouseEvent): void {
  if (!isComfortModeActive) return;

  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  if (videos.length === 0) return;

  // 動画下部20%エリア内でのクリックをチェック
  let isClickInVideoBottomArea = false;

  videos.forEach(video => {
    const rect = video.getBoundingClientRect();

    // 動画全体の範囲内かチェック
    const isInVideoArea = event.clientX >= rect.left && event.clientX <= rect.right &&
                         event.clientY >= rect.top && event.clientY <= rect.bottom;

    if (isInVideoArea) {
      // さらに下部20%の範囲内かチェック
      const bottomAreaHeight = rect.height * 0.2;
      const bottomAreaTop = rect.bottom - bottomAreaHeight;

      if (event.clientY >= bottomAreaTop) {
        isClickInVideoBottomArea = true;
      }
    }
  });

  // 動画下部20%をクリックした場合、即座にコントロール有効化
  if (isClickInVideoBottomArea) {
    // 既存のタイマーをクリア
    if (cursorTimer) {
      clearTimeout(cursorTimer);
      cursorTimer = null;
    }

    // コントロールを有効化
    if (!isVideoControlsEnabled) {
      enableVideoControls();
    }
  }
}

// 動画コントロールを有効化
function enableVideoControls(): void {
  if (!isVideoControlsEnabled) {
    isVideoControlsEnabled = true;
    document.body.classList.add('video-controls-enabled');

    // 解除ボタンの透明度を更新（コントロール有効状態を反映）
    const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
    let isInVideoArea = false;
    const lastMouseEvent = (window as any).lastMouseEvent;
    if (lastMouseEvent && videos.length > 0) {
      videos.forEach(video => {
        const rect = video.getBoundingClientRect();
        if (lastMouseEvent.clientX >= rect.left && lastMouseEvent.clientX <= rect.right &&
            lastMouseEvent.clientY >= rect.top && lastMouseEvent.clientY <= rect.bottom) {
          isInVideoArea = true;
        }
      });
    }
    updateExitButtonOpacity(isInVideoArea);
  }
}

// ビデオコントロールを無効化する関数
function disableVideoControls(): void {
  if (isVideoControlsEnabled) {
    isVideoControlsEnabled = false;
    document.body.classList.remove('video-controls-enabled');

    // 解除ボタンの透明度を更新（コントロール無効状態を反映）
    const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
    let isInVideoArea = false;
    const lastMouseEvent = (window as any).lastMouseEvent;
    if (lastMouseEvent && videos.length > 0) {
      videos.forEach(video => {
        const rect = video.getBoundingClientRect();
        if (lastMouseEvent.clientX >= rect.left && lastMouseEvent.clientX <= rect.right &&
            lastMouseEvent.clientY >= rect.top && lastMouseEvent.clientY <= rect.bottom) {
          isInVideoArea = true;
        }
      });
    }
    updateExitButtonOpacity(isInVideoArea);
  }
}

// 動画終了を検出して快適モードを自動終了する
function checkVideoEnded(): void {
  if (!isComfortModeActive) return;

  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  let allEnded = true;

  if (videos.length === 0) {
    disableComfortMode();
    return;
  }

  videos.forEach(video => {
    if (!video.ended) {
      allEnded = false;
    }
  });

  // すべての動画が終了した場合、快適モードを解除
  if (allEnded) {
    console.log('All videos ended, disabling comfort mode');
    disableComfortMode();
  }
}

// 解除ボタンの透明度を更新
function updateExitButtonOpacity(isInVideoArea: boolean): void {
  if (!exitButton) return;


  if (isVideoControlsEnabled) {
    // コントロール有効時: 最も濃く（操作中を示す）
    exitButton.style.background = 'rgba(255, 255, 255, 0.15) !important';
    exitButton.style.color = 'rgba(255, 255, 255, 0.6) !important';
    exitButton.style.borderColor = 'rgba(255, 255, 255, 0.15) !important';
  } else if (isInVideoArea) {
    // 動画内: 通常の透明度
    exitButton.style.background = 'rgba(255, 255, 255, 0.1) !important';
    exitButton.style.color = 'rgba(255, 255, 255, 0.4) !important';
    exitButton.style.borderColor = 'rgba(255, 255, 255, 0.1) !important';
  } else {
    // 動画外: 背景完全に透明、文字のみ表示
    exitButton.style.background = 'transparent !important';
    exitButton.style.color = 'rgba(255, 255, 255, 0.2) !important';
    exitButton.style.borderColor = 'transparent !important';
  }
}

// 解除ボタンを表示する関数
function showExitButton(): void {
  exitButton = document.createElement('div');
  exitButton.id = 'comfort-mode-exit-button';
  exitButton.innerHTML = '×'; // シンプルな×記号
  exitButton.title = chrome.i18n.getMessage('comfortModeExitTooltip'); // ツールチップで説明
  exitButton.style.cssText = `
    position: fixed !important;
    bottom: 15px !important;
    right: 15px !important;
    background: transparent !important;
    color: rgba(255, 255, 255, 0.2) !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 50% !important;
    cursor: pointer !important;
    z-index: 2147483648 !important;
    font-family: Arial, sans-serif !important;
    font-size: 18px !important;
    font-weight: bold !important;
    user-select: none !important;
    pointer-events: auto !important;
    border: 1px solid transparent !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.2s ease !important;
  `;

  exitButton.addEventListener('click', disableComfortMode);

  // ホバー効果（コントロール有効時のみ）
  exitButton.addEventListener('mouseenter', () => {
    if (exitButton && isVideoControlsEnabled) {
      exitButton.style.background = 'rgba(255, 255, 255, 0.25) !important';
      exitButton.style.color = 'rgba(255, 255, 255, 0.9) !important';
      exitButton.style.borderColor = 'rgba(255, 255, 255, 0.4) !important';
    }
  });

  exitButton.addEventListener('mouseleave', () => {
    // ホバー解除時は現在の動画エリア状態に応じて透明度を設定（コントロール有効時のみ）
    if (exitButton && isVideoControlsEnabled) {
      const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
      let isInVideoArea = false;

      // 最後のマウス位置をチェック（簡易的な実装）
      const lastMouseEvent = (window as any).lastMouseEvent;
      if (lastMouseEvent && videos.length > 0) {
        videos.forEach(video => {
          const rect = video.getBoundingClientRect();
          if (lastMouseEvent.clientX >= rect.left && lastMouseEvent.clientX <= rect.right &&
              lastMouseEvent.clientY >= rect.top && lastMouseEvent.clientY <= rect.bottom) {
            isInVideoArea = true;
          }
        });
      }

      // ホバー解除後は適切な透明度に戻す
      setTimeout(() => {
        updateExitButtonOpacity(isInVideoArea);
      }, 10); // 少し遅延させてスタイルの競合を避ける
    }
  });

  document.body.appendChild(exitButton);
}

// 快適モードを解除する関数
function disableComfortMode(): void {
  if (!isComfortModeActive) return;

  isComfortModeActive = false;
  currentActiveVideo = null; // アクティブ動画をクリア

  // 動画監視を停止
  stopVideoWatcher();

  // コントロール状態をリセット
  isVideoControlsEnabled = false;
  document.body.classList.remove('video-controls-enabled');

  // 動画の元のスタイルを復元
  originalVideoStyles.forEach((originalStyle, video) => {
    video.style.position = originalStyle.position;
    video.style.top = originalStyle.top;
    video.style.left = originalStyle.left;
    video.style.width = originalStyle.width;
    video.style.height = originalStyle.height;
    video.style.zIndex = originalStyle.zIndex;
    video.style.transform = originalStyle.transform;
    video.style.objectFit = '';
  });

  originalVideoStyles.clear();

  // カーソル検出を停止
  stopCursorDetection();

  // z-index制御を解除
  removeZIndexControl();

  // マウスイベントを有効化
  const style = document.getElementById('comfort-mode-style');
  if (style) {
    style.remove();
  }

  // 解除ボタンを削除
  if (exitButton) {
    exitButton.remove();
    exitButton = null;
  }

  // YouTubeボタンの状態を更新
  updateYouTubeButtonState();

  // Prime Videoボタンの状態を更新
  updatePrimeButtonState();
}

// バックグラウンドスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleComfortMode') {
    // video要素から直接起動された場合の特別な処理
    if (message.isVideoContext) {
      console.log('動画要素から快適モードが起動されました');

      // 既に快適モードがアクティブな場合は解除
      if (isComfortModeActive) {
        disableComfortMode();
      } else {
        // video要素の特定と優先処理は現在の実装で十分対応済み
        enableComfortMode();
      }
    } else {
      // 通常の切り替え処理
      if (isComfortModeActive) {
        disableComfortMode();
      } else {
        enableComfortMode();
      }
    }

    sendResponse({ success: true });
  }

  // オプションページからの設定更新メッセージを処理
  if (message.action === 'settingsUpdated') {
    console.log('設定が更新されました:', message.settings);
    // 必要に応じて設定を反映（現在は基本的な実装のため省略）
    sendResponse({ success: true });
  }
});

// ESCキーで快適モードを解除
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isComfortModeActive) {
    disableComfortMode();
  }
});

// ウィンドウサイズ変更時に動画サイズを調整
window.addEventListener('resize', () => {
  if (isComfortModeActive) {
    const videos = document.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;
    videos.forEach(video => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        maximizeVideo(video);
      }
    });
  }
});

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
  if (isYouTube()) {
    setupYouTubeObserver();
  } else if (isPrimeVideo()) {
    setupPrimeObserver();
  }
});

// ページが既に読み込み済みの場合の初期化
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  if (isYouTube()) {
    setupYouTubeObserver();
  } else if (isPrimeVideo()) {
    setupPrimeObserver();
  }
}

// 動画要素の監視を開始する関数
function startVideoWatcher(): void {
  if (videoWatcher) {
    videoWatcher.disconnect();
  }

  videoWatcher = new MutationObserver((mutations) => {
    // 快適モードがアクティブでない場合は何もしない
    if (!isComfortModeActive || !currentActiveVideo) {
      return;
    }

    // アクティブな動画要素がDOMから削除されたかチェック
    if (!document.contains(currentActiveVideo)) {
      console.log('Active video element removed from DOM, disabling comfort mode');
      disableComfortMode();
      return;
    }

    // 削除された要素の中にアクティブな動画要素が含まれているかチェック
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // 削除された要素がアクティブな動画要素を含んでいるかチェック
            if (element === currentActiveVideo || element.contains(currentActiveVideo)) {
              console.log('Active video element or its container removed, disabling comfort mode');
              disableComfortMode();
            }
          }
        });
      }
    });
  });

  // DOM全体を監視（subtree: true で子孫要素も監視）
  videoWatcher.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 動画終了イベントのリスナーを追加
  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  videos.forEach(video => {
    video.addEventListener('ended', checkVideoEnded);
  });
}

// 動画要素の監視を停止する関数
function stopVideoWatcher(): void {
  if (videoWatcher) {
    videoWatcher.disconnect();
    videoWatcher = null;
  }
}