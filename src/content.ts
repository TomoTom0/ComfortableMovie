// 快適モードの状態管理
let isComfortModeActive = false;
let originalVideoStyles: Map<HTMLVideoElement, {
  position: string;
  top: string;
  left: string;
  width: string;
  height: string;
  zIndex: string;
  transform: string;
}> = new Map();

// 解除ボタンの要素
let exitButton: HTMLElement | null = null;

// z-index制御用のスタイル要素
let zIndexStyle: HTMLStyleElement | null = null;

// カーソル検出用の変数
let cursorTimer: number | null = null;
let controlsDisableTimer: number | null = null;
let isVideoControlsEnabled = false;
let lastIsInVideoArea = false; // 前回の動画エリア状態を記録
const HOVER_DETECTION_TIME = 2000; // 2秒間カーソルが下部にあると検出
const CONTROLS_DISABLE_TIME = 3000; // 3秒間動画から離れるとコントロール無効化

// 動画要素を検出し、快適モードを適用する関数
function enableComfortMode(): void {
  const videos = document.querySelectorAll('video') as NodeListOf<HTMLVideoElement>;

  if (videos.length === 0) {
    alert('動画が見つかりません');
    return;
  }

  isComfortModeActive = true;

  videos.forEach(video => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
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

  // z-index制御を適用
  applyZIndexControl();

  // マウスイベントを無効化（改良版）
  disableMouseEvents();

  // カーソル検出を開始
  startCursorDetection();

  // 解除ボタンを表示
  showExitButton();
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

// カーソル検出を開始する関数
function startCursorDetection(): void {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick);
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

// マウス移動時の処理
function handleMouseMove(event: MouseEvent): void {
  if (!isComfortModeActive) return;

  // 最後のマウスイベントを保存（解除ボタンのホバー効果で使用）
  (window as any).lastMouseEvent = event;

  const videos = document.querySelectorAll('video.comfort-mode-video') as NodeListOf<HTMLVideoElement>;
  if (videos.length === 0) return;

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

  // コントロール無効化タイマーの処理
  if (isInVideoArea) {
    // 動画内にいる場合は無効化タイマーをキャンセル
    if (controlsDisableTimer) {
      clearTimeout(controlsDisableTimer);
      controlsDisableTimer = null;
    }
  } else {
    // 動画から離れた場合
    if (isVideoControlsEnabled && !controlsDisableTimer) {
      // コントロールが有効で、まだタイマーが設定されていない場合
      controlsDisableTimer = setTimeout(() => {
        disableVideoControls();
        controlsDisableTimer = null;
      }, CONTROLS_DISABLE_TIME);
    }
  }

  // コントロール有効化タイマーの処理
  if (isInVideoBottomArea) {
    // 動画下部にカーソルがある場合、タイマーを開始
    if (!isVideoControlsEnabled) {
      if (cursorTimer) {
        clearTimeout(cursorTimer);
      }

      cursorTimer = setTimeout(() => {
        enableVideoControls();
        cursorTimer = null;
      }, HOVER_DETECTION_TIME);
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

// 動画コントロールを無効化
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
  exitButton.title = '快適モード解除'; // ツールチップで説明
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
}

// バックグラウンドスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleComfortMode') {
    if (isComfortModeActive) {
      disableComfortMode();
    } else {
      enableComfortMode();
    }
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