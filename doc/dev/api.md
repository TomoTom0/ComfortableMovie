# Comfort Movie API リファレンス

## 主要関数

### コア機能

#### `enableComfortMode(): void`
快適モードを有効化する。

**処理内容:**
1. 動画要素の検出
2. 元スタイルの保存
3. 動画の最大化
4. z-index制御の適用
5. カーソル検出開始
6. 解除ボタン表示

#### `disableComfortMode(): void`
快適モードを無効化し、全ての変更を復元する。

**処理内容:**
1. 元スタイルの復元
2. カーソル検出停止
3. z-index制御解除
4. マウスイベント復元
5. 解除ボタン削除

### 動画制御

#### `maximizeVideo(video: HTMLVideoElement): void`
指定された動画要素を画面全体に最大化する。

**パラメータ:**
- `video`: HTMLVideoElement - 対象の動画要素

**アルゴリズム:**
```typescript
const videoAspectRatio = video.videoWidth / video.videoHeight;
const windowAspectRatio = window.innerWidth / window.innerHeight;

if (videoAspectRatio > windowAspectRatio) {
  // 横長: 幅基準で高さを計算
  newWidth = windowWidth;
  newHeight = windowWidth / videoAspectRatio;
} else {
  // 縦長: 高さ基準で幅を計算
  newHeight = windowHeight;
  newWidth = windowHeight * videoAspectRatio;
}
```

### z-index制御

#### `applyZIndexControl(): void`
動画を最前面に表示するためのz-index制御を適用する。

**z-index値:**
- 動画: `2147483647` (32bit整数最大値)
- 他要素: `999998` (制限値)
- 解除ボタン: `2147483648` (最大値+1)

#### `removeZIndexControl(): void`
z-index制御を解除し、元の状態に復元する。

### カーソル検出

#### `startCursorDetection(): void`
マウス移動イベントを監視開始する。

#### `stopCursorDetection(): void`
マウス移動イベントの監視を停止し、全タイマーをクリアする。

#### `handleMouseMove(event: MouseEvent): void`
マウス移動イベントのハンドラー。

**検出ロジック:**
1. 動画領域内判定
2. 動画下部20%領域判定
3. タイマー管理（有効化・無効化）

#### `handleClick(event: MouseEvent): void`
クリックイベントのハンドラー（新機能）。

**処理内容:**
1. 動画下部20%エリアのクリック検出
2. 即座にコントロール有効化（ホバー待機なし）
3. 既存のホバータイマーをクリア

**領域判定:**
```typescript
// 動画全体
const isInVideoArea = (
  event.clientX >= rect.left && event.clientX <= rect.right &&
  event.clientY >= rect.top && event.clientY <= rect.bottom
);

// 下部20%
const bottomAreaTop = rect.bottom - (rect.height * 0.2);
const isInVideoBottomArea = isInVideoArea && (event.clientY >= bottomAreaTop);
```

### コントロール制御

#### `enableVideoControls(): void`
動画コントロールを有効化する。

**処理:**
- `isVideoControlsEnabled = true`
- `document.body.classList.add('video-controls-enabled')`

#### `disableVideoControls(): void`
動画コントロールを無効化する。

**処理:**
- `isVideoControlsEnabled = false`
- `document.body.classList.remove('video-controls-enabled')`

### UI制御

#### `showExitButton(): void`
解除ボタンを作成・表示する。

**ボタン仕様:**
- 位置: 右下 (bottom: 15px, right: 15px)
- サイズ: 28×28px
- デザイン: 円形、半透明
- 内容: '×' 記号

#### `disableMouseEvents(): void`
マウスイベントを無効化するCSSを適用する（改良版）。

**実装方式:**
- `:not(.video-controls-enabled)` セレクタで条件分岐
- コントロール有効時は自然に元の状態に戻る
- CSSの詳細度問題を回避

## 状態変数

### グローバル変数

```typescript
// 快適モードの状態
let isComfortModeActive: boolean = false;

// 動画コントロールの状態
let isVideoControlsEnabled: boolean = false;

// タイマー管理
let cursorTimer: number | null = null;
let controlsDisableTimer: number | null = null;

// DOM要素参照
let exitButton: HTMLElement | null = null;
let zIndexStyle: HTMLStyleElement | null = null;

// 元スタイル保存
let originalVideoStyles: Map<HTMLVideoElement, StyleInfo> = new Map();
```

### 設定値

```typescript
// タイミング設定
const HOVER_DETECTION_TIME = 2000; // 2秒: コントロール有効化
const CONTROLS_DISABLE_TIME = 3000; // 3秒: コントロール無効化

// 領域設定
const BOTTOM_AREA_RATIO = 0.2; // 20%: 下部検出エリア
```

## イベントハンドラー

### Chrome Extension API

#### `chrome.runtime.onMessage`
バックグラウンドスクリプトからのメッセージ受信。

```typescript
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
```

### DOM イベント

#### `mousemove`
マウス移動を監視してカーソル位置を追跡。

#### `keydown`
ESCキーでの解除を処理。

```typescript
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isComfortModeActive) {
    disableComfortMode();
  }
});
```

#### `resize`
ウィンドウサイズ変更時の動画サイズ調整。

```typescript
window.addEventListener('resize', () => {
  if (isComfortModeActive) {
    const videos = document.querySelectorAll('video.comfort-mode-video');
    videos.forEach(video => maximizeVideo(video));
  }
});
```

## CSS クラス

### 状態管理クラス

#### `.comfort-mode-active`
body要素に適用される快適モード状態クラス。

#### `.comfort-mode-video`
快適モード中の動画要素に適用。

#### `.video-controls-enabled`
動画コントロールが有効な時にbody要素に適用。

### セレクタ優先度

```css
/* 最高優先度 */
body.comfort-mode-active * { /* ... */ }

/* 動画コントロール有効時 */
body.comfort-mode-active.video-controls-enabled video { /* ... */ }

/* 除外対象 */
body.comfort-mode-active *:not(.comfort-mode-video):not(#comfort-mode-exit-button) { /* ... */ }
```

## エラーハンドリング

### 一般的なエラー

1. **動画が見つからない場合**
   ```typescript
   if (videos.length === 0) {
     alert('動画が見つかりません');
     return;
   }
   ```

2. **Chrome API エラー**
   ```typescript
   if (chrome.runtime.lastError) {
     console.error('通信エラー:', chrome.runtime.lastError);
   }
   ```

3. **タイマークリーンアップ**
   ```typescript
   if (cursorTimer) {
     clearTimeout(cursorTimer);
     cursorTimer = null;
   }
   ```

## 拡張性

### 新機能追加のパターン

1. **新しい検出エリア追加**
   ```typescript
   const isInCustomArea = (/* カスタムロジック */);
   ```

2. **新しいタイマー追加**
   ```typescript
   let customTimer: number | null = null;
   ```

3. **新しいCSS制御**
   ```typescript
   function applyCustomControl(): void {
     // カスタムCSS適用
   }
   ```