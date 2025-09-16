# Comfort Movie 開発者ガイド

## プロジェクト概要

Comfort Movieは、TypeScriptで開発されたChrome拡張機能（Manifest V3）です。
動画視聴時の快適な環境を提供するため、スマートなコントロール機能とz-index制御を実装しています。

## 技術スタック

- **TypeScript**: 型安全な開発
- **Chrome Extension Manifest V3**: 最新の拡張機能API
- **CSS**: スタイリングとz-index制御
- **Service Worker**: バックグラウンド処理

## アーキテクチャ

### ファイル構成
```
src/
├── content.ts       # コンテンツスクリプト（メイン機能）
├── background.ts    # サービスワーカー（右クリックメニュー）
└── content.css      # スタイルシート

dist/                # ビルド出力
├── content.js
├── background.js
├── content.css
└── manifest.json

doc/
├── user/           # ユーザー向けドキュメント
└── dev/            # 開発者向けドキュメント
```

## 主要機能の実装

### 1. 動画検出と最大化

```typescript
function enableComfortMode(): void {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      maximizeVideo(video);
    }
  });
}
```

#### アスペクト比保持ロジック
```typescript
function maximizeVideo(video: HTMLVideoElement): void {
  const windowAspectRatio = window.innerWidth / window.innerHeight;
  const videoAspectRatio = video.videoWidth / video.videoHeight;

  if (videoAspectRatio > windowAspectRatio) {
    // 横長動画: 幅基準
    newWidth = windowWidth;
    newHeight = windowWidth / videoAspectRatio;
  } else {
    // 縦長動画: 高さ基準
    newHeight = windowHeight;
    newWidth = windowHeight * videoAspectRatio;
  }
}
```

### 2. z-index制御システム

#### CSSクラスベース制御
```typescript
function applyZIndexControl(): void {
  const style = document.createElement('style');
  style.textContent = `
    .comfort-mode-video {
      z-index: 2147483647 !important; /* 最大値 */
    }
    body.comfort-mode-active *:not(.comfort-mode-video):not(#comfort-mode-exit-button) {
      z-index: 999998 !important; /* 制限値 */
    }
  `;
  document.head.appendChild(style);
}
```

#### 復元機能
```typescript
function removeZIndexControl(): void {
  // CSSスタイル削除
  if (zIndexStyle) {
    zIndexStyle.remove();
  }
  // クラス削除
  document.body.classList.remove('comfort-mode-active');
  videos.forEach(video => {
    video.classList.remove('comfort-mode-video');
  });
}
```

### 3. スマートカーソル検出

#### 二段階タイマーシステム + タップサポート
```typescript
// コントロール有効化（ホバー: 下部エリア2秒）
if (isInVideoBottomArea && !isVideoControlsEnabled) {
  cursorTimer = setTimeout(() => {
    enableVideoControls();
  }, HOVER_DETECTION_TIME);
}

// コントロール有効化（クリック: 即座）
function handleClick(event: MouseEvent): void {
  if (isClickInVideoBottomArea) {
    if (cursorTimer) clearTimeout(cursorTimer);
    if (!isVideoControlsEnabled) enableVideoControls();
  }
}

// コントロール無効化（動画離脱3秒）
if (!isInVideoArea && isVideoControlsEnabled) {
  controlsDisableTimer = setTimeout(() => {
    disableVideoControls();
  }, CONTROLS_DISABLE_TIME);
}
```

#### 領域検出ロジック
```typescript
function handleMouseMove(event: MouseEvent): void {
  const rect = video.getBoundingClientRect();

  // 動画全体チェック
  const isInVideoArea = (
    event.clientX >= rect.left && event.clientX <= rect.right &&
    event.clientY >= rect.top && event.clientY <= rect.bottom
  );

  // 下部20%チェック
  const bottomAreaTop = rect.bottom - (rect.height * 0.2);
  const isInVideoBottomArea = isInVideoArea && (event.clientY >= bottomAreaTop);
}
```

### 4. マウスイベント制御

#### CSSセレクタでの動的制御
```css
/* コントロール無効時のみポインターイベント無効化 */
body.comfort-mode-active:not(.video-controls-enabled) * {
  pointer-events: none !important;
}

/* 解除ボタン: 常に有効 */
body.comfort-mode-active #comfort-mode-exit-button {
  pointer-events: auto !important;
}

/* コントロール有効時は自然に元の状態に戻る（CSSセレクタの条件分岐） */
```

## 開発フロー

### 1. 環境セットアップ
```bash
npm install
```

### 2. 開発時
```bash
npm run watch    # ファイル変更を監視
```

### 3. ビルドとデプロイ
```bash
npm run build        # 通常ビルド
npm run rebuild      # クリーンビルド
./build-and-deploy.sh # ビルドとデプロイを一括実行
```

#### 環境設定
```bash
# .envファイルでデプロイ先を設定
DEPLOY_DESTINATION=/home/tomo/user/Mine/_chex/src_comfortMovie/
```

### 4. デバッグ

#### コンソールデバッグ
```typescript
console.log('Comfort mode activated');
console.log('Video dimensions:', video.videoWidth, video.videoHeight);
```

#### Chrome DevTools
1. `chrome://extensions/` → 「デベロッパーモード」
2. 「バックグラウンドページを検査」
3. 「コンテンツスクリプトを検査」

## 設計原則

### 1. 復元性重視
- 全ての変更は可逆的
- CSSクラスベースで状態管理
- 元のスタイルを保存・復元

### 2. パフォーマンス
- タイマーの適切な管理
- イベントリスナーの登録・削除
- DOM操作の最小化

### 3. 互換性
- 各種動画サイト対応
- レスポンシブ対応
- 既存UIとの共存

## 拡張ポイント

### 1. 新しい動画サイト対応
```typescript
// サイト固有のセレクタ追加
const videoSelectors = [
  'video',
  '.video-player video',
  '[data-video] video'
];
```

### 2. カスタマイズ可能設定
```typescript
const CONFIG = {
  HOVER_DETECTION_TIME: 2000,
  CONTROLS_DISABLE_TIME: 3000,
  BOTTOM_AREA_RATIO: 0.2
};
```

### 3. 新機能追加
- 音量コントロール
- 字幕表示制御
- キーボードショートカット

## テスト

### 手動テスト項目
1. 動画検出・最大化
2. コントロール有効化・無効化
3. z-index制御
4. 解除機能
5. 複数動画対応

### 対象サイト
- YouTube
- Vimeo
- Netflix
- Amazon Prime Video
- その他HTML5動画サイト

## トラブルシューティング

### よくある問題

1. **動画が検出されない**
   - `video.videoWidth`が0の場合があるため、ロード待ちが必要

2. **z-indexが効かない**
   - サイト固有の高いz-indexに対応が必要

3. **コントロールが反応しない**
   - 座標計算の精度向上が必要

### デバッグ方法
```typescript
// 動画要素の確認
console.log('Found videos:', document.querySelectorAll('video'));

// z-index値の確認
const computedStyle = window.getComputedStyle(element);
console.log('z-index:', computedStyle.zIndex);

// マウス座標の確認
document.addEventListener('mousemove', (e) => {
  console.log('Mouse:', e.clientX, e.clientY);
});
```