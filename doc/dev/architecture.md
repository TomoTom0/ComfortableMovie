# アーキテクチャ設計書

## 概要

Comfort Movie Chrome拡張機能の技術アーキテクチャと実装詳細について説明します。

## システム構成

### Chrome拡張機能の構成要素

```
┌─────────────────────────────────────────────┐
│              Comfort Movie                  │
├─────────────────────────────────────────────┤
│  Background Script (Service Worker)        │
│  - コンテキストメニュー管理                    │
│  - 拡張機能アイコンクリック処理                │
│  - 設定変更通知                             │
├─────────────────────────────────────────────┤
│  Content Script                            │
│  - 動画要素の検出・操作                      │
│  - 快適モードの制御                         │
│  - ユーザーインタラクション処理               │
├─────────────────────────────────────────────┤
│  Options Page                              │
│  - 設定UI提供                              │
│  - 設定の保存・読み込み                      │
│  - 多言語対応                              │
├─────────────────────────────────────────────┤
│  Storage (chrome.storage.sync)             │
│  - ユーザー設定の永続化                      │
│  - ブラウザ間での設定同期                    │
└─────────────────────────────────────────────┘
```

## 各コンポーネントの詳細

### 1. Background Script (`background.ts`)

**役割**: 拡張機能のグローバル処理を担当

**主な機能**:
- **コンテキストメニュー管理**
  - ページ用メニュー（全要素対象）
  - 動画専用メニュー（video要素対象）
  - 設定に基づく動的メニュー更新

- **拡張機能アイコン処理**
  - ツールバーアイコンクリックでの快適モード切り替え

- **設定変更通知**
  - オプションページからの設定変更を受信
  - コンテキストメニューの再構築

**実装方式**: Manifest V3のService Worker

```typescript
// コンテキストメニュー作成例
chrome.contextMenus.create({
  id: 'comfort-mode-toggle',
  title: chrome.i18n.getMessage('contextMenuToggle'),
  contexts: ['all']
});
```

### 2. Content Script (`content.ts`)

**役割**: ウェブページ内での動画操作とUIインタラクション

**主な機能**:

#### 動画検出システム
- **自動検出**: ページ読み込み時の動画要素スキャン
- **動的検出**: MutationObserverによる動画要素の追加監視
- **対象要素**: `<video>` タグおよび埋め込み動画プレーヤー

#### 快適モード制御
- **動画最大化**: アスペクト比を維持したウィンドウサイズ内最大化
- **z-index制御**: 他要素の前面表示 (`z-index: 2147483647`)
- **ポインターイベント制御**: 条件付きマウスインタラクション無効化

#### スマートコントロールシステム
```typescript
// デュアルタイマーシステム
let hoverActivationTimer: number = 0;
let controlsDeactivationTimer: number = 0;

// ホバー検出
const startHoverDetection = () => {
  hoverActivationTimer = window.setTimeout(() => {
    enableVideoControls();
  }, settings.hoverDetectionTime);
};

// 自動無効化
const startControlsDeactivation = () => {
  controlsDeactivationTimer = window.setTimeout(() => {
    disableVideoControls();
  }, settings.controlsDisableTime);
};
```

#### CSS制御システム
```typescript
// 条件付きポインターイベント制御
const style = document.createElement('style');
style.textContent = `
  body.comfort-mode-active:not(.video-controls-enabled) * {
    pointer-events: none !important;
  }
  body.comfort-mode-active #comfort-mode-exit-button {
    pointer-events: auto !important;
  }
`;
```

#### サイト別対応
- **YouTube**: `.ytp-right-controls` への快適モードボタン追加
- **Amazon Prime Video**: `.atvwebplayersdk-hideabletopbuttons-container` への対応
- **汎用サイト**: 標準的な動画プレーヤー対応

### 3. Options Page (`options.ts`, `options.html`)

**役割**: ユーザー設定の管理インターフェース

**設定項目**:
```typescript
interface ComfortModeSettings {
  hoverDetectionTime: number;        // ホバー検出時間 (ms)
  controlsDisableTime: number;       // コントロール無効化時間 (ms)
  showInlineButton: boolean;         // プレーヤー内ボタン表示
  pausedControlsEnabled: boolean;    // 一時停止時の即座制御
  showContextMenu: boolean;          // 右クリックメニュー表示
  showVideoContextMenu: boolean;     // 動画専用メニュー表示
  enableYoutube: boolean;           // YouTube対応
  enablePrimeVideo: boolean;        // Amazon Prime Video対応
  enableAllSites: boolean;          // 全サイト対応
  exitButtonOpacity: number;        // 解除ボタン透明度 (%)
}
```

**多言語対応システム**:
```typescript
// HTML側: data-i18n属性
<span data-i18n="hoverDetectionTime">ホバー検出時間</span>

// JavaScript側: 動的テキスト置換
function localizeUI(): void {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });
}
```

### 4. Storage System

**使用API**: `chrome.storage.sync`

**利点**:
- ブラウザ間での設定同期
- オフライン対応
- 自動バックアップ

**データ構造**:
```json
{
  "hoverDetectionTime": 2000,
  "controlsDisableTime": 3000,
  "showInlineButton": true,
  "pausedControlsEnabled": true,
  "showContextMenu": true,
  "showVideoContextMenu": true,
  "enableYoutube": true,
  "enablePrimeVideo": true,
  "enableAllSites": true,
  "exitButtonOpacity": 20
}
```

## 技術的な設計決定

### 1. CSS制御方式の選択

**問題**: ポインターイベントの条件付き無効化

**解決策**: `:not()` セレクターによる状態制御
```css
body.comfort-mode-active:not(.video-controls-enabled) * {
  pointer-events: none !important;
}
```

**利点**:
- CSS specificity問題の回避
- JavaScriptによる細かい制御の維持
- パフォーマンスの最適化

### 2. タイマーシステム

**デュアルタイマー設計**:
- **アクティベーションタイマー**: ホバー検出用
- **ディアクティベーションタイマー**: 自動無効化用

**利点**:
- 独立した制御
- キャンセル可能
- ユーザー体験の向上

### 3. 動画検出システム

**マルチレイヤー検出**:
1. **初期スキャン**: DOM ready時の全動画要素検出
2. **動的監視**: MutationObserverによる追加検出
3. **サイト別対応**: 特定サイトの特殊な動画プレーヤー対応

### 4. 多言語対応アーキテクチャ

**階層構造**:
```
_locales/
├── ja/messages.json    (デフォルト)
├── en/messages.json    (英語)
└── zh/messages.json    (中国語)
```

**フォールバック戦略**:
```typescript
const message = chrome.i18n.getMessage(key) || defaultText;
```

## パフォーマンス最適化

### 1. DOM操作の最小化

- **バッチ更新**: 複数のDOM変更を一度に実行
- **イベント委譲**: 親要素でのイベントハンドリング
- **条件付き処理**: 必要な時のみスクリプト実行

### 2. メモリ管理

```typescript
// イベントリスナーのクリーンアップ
const cleanup = () => {
  if (hoverActivationTimer) {
    clearTimeout(hoverActivationTimer);
  }
  if (controlsDeactivationTimer) {
    clearTimeout(controlsDeactivationTimer);
  }
  // その他のリソース解放
};
```

### 3. CSS最適化

- **効率的なセレクター**: 具体的で高速なセレクター使用
- **!important最小化**: 必要最小限の使用
- **アニメーション最適化**: CSS transitionの活用

## セキュリティ考慮事項

### 1. Content Security Policy (CSP)

- **インラインスクリプト禁止**: 外部ファイルによる実装
- **eval()使用禁止**: 安全なコード実行
- **動的コード生成回避**: 静的な実装方式

### 2. 権限管理

```json
{
  "permissions": [
    "activeTab",        // アクティブタブのみアクセス
    "contextMenus",     // コンテキストメニュー
    "storage"          // 設定保存
  ]
}
```

**最小権限原則**: 必要最小限の権限のみ要求

### 3. XSS対策

```typescript
// 安全なDOM操作
element.textContent = userInput;  // innerHTML回避
```

## エラーハンドリング

### 1. Graceful Degradation

```typescript
try {
  const result = await chrome.storage.sync.get(defaultSettings);
  // 設定読み込み処理
} catch (error) {
  console.error('設定の読み込みに失敗しました:', error);
  // デフォルト設定で続行
  useDefaultSettings();
}
```

### 2. ユーザーフィードバック

```typescript
// トースト通知システム
function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  // アニメーション表示・自動削除
}
```

## 拡張性への配慮

### 1. 設定システムの拡張

新しい設定項目の追加が容易な構造:
```typescript
// 新しい設定の追加例
interface ComfortModeSettings {
  // 既存設定...
  newFeatureEnabled: boolean;  // 新機能
}
```

### 2. サイト別対応の拡張

```typescript
// 新しいサイト対応の追加例
const siteHandlers = {
  'youtube.com': handleYoutube,
  'amazon.com': handlePrimeVideo,
  'netflix.com': handleNetflix,  // 新規追加
};
```

### 3. 多言語対応の拡張

新しい言語の追加は `_locales/[言語コード]/messages.json` の追加のみで対応可能。