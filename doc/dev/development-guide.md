# 開発ガイド

## 概要

Comfort Movie Chrome拡張機能の開発環境構築から実装、テスト、デバッグまでの包括的なガイドです。

## 開発環境構築

### 必要なソフトウェア

| ソフトウェア | バージョン | 用途 |
|-------------|-----------|------|
| Node.js | v16以上 | TypeScript実行環境 |
| npm | v8以上 | パッケージ管理 |
| TypeScript | v5.0以上 | 型安全な開発 |
| Chrome | 最新版 | テスト・デバッグ |
| Git | v2.0以上 | バージョン管理 |

### プロジェクトセットアップ

```bash
# プロジェクトのクローン
git clone [repository-url]
cd comfortable-movie

# 依存関係のインストール
npm install

# 初回ビルド
npm run build

# 開発モードでの監視開始
npm run watch
```

### 開発用設定ファイル

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["chrome"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### package.json（関連部分）
```json
{
  "scripts": {
    "build": "tsc && npm run copy-assets",
    "copy-assets": "cp manifest.json dist/ && cp src/*.css dist/ 2>/dev/null || true && cp src/*.html dist/ 2>/dev/null || true && cp -r icons dist/ 2>/dev/null || true",
    "watch": "tsc --watch",
    "clean": "rm -rf dist",
    "rebuild": "npm run clean && npm run build"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/chrome": "^0.0.246"
  }
}
```

## ファイル構造と役割

### ソースファイル (`src/`)

```
src/
├── content.ts          # コンテンツスクリプト（メイン機能）
├── content.css         # コンテンツスクリプト用スタイル
├── background.ts       # バックグラウンドスクリプト
├── options.ts          # オプションページ機能
├── options.html        # オプションページUI
└── options.css         # オプションページスタイル
```

#### content.ts
- **役割**: ウェブページ内での動画操作
- **主要クラス/関数**:
  - `ComfortModeSettings`: 設定インターフェース
  - `findVideos()`: 動画要素検出
  - `enableComfortMode()`: 快適モード有効化
  - `disableComfortMode()`: 快適モード無効化
  - `createExitButton()`: 解除ボタン作成

#### background.ts
- **役割**: 拡張機能のグローバル処理
- **主要関数**:
  - `createContextMenus()`: コンテキストメニュー作成
  - `chrome.contextMenus.onClicked`: メニュークリック処理
  - `chrome.action.onClicked`: アイコンクリック処理

#### options.ts
- **役割**: 設定画面の機能
- **主要関数**:
  - `loadSettings()`: 設定読み込み
  - `saveSettings()`: 設定保存
  - `localizeUI()`: 多言語化処理

### 設定ファイル

#### manifest.json
```json
{
  "manifest_version": 3,
  "name": "__MSG_extensionName__",
  "version": "1.0.0",
  "description": "__MSG_extensionDescription__",
  "default_locale": "ja",
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_end"
    }
  ],
  "options_page": "options.html"
}
```

## 開発ワークフロー

### 1. 機能開発

#### 新機能追加の手順

1. **要件定義**
   - 機能仕様の明確化
   - UI/UXデザイン
   - 技術的制約の確認

2. **設計**
   - アーキテクチャ設計
   - インターフェース設計
   - データ構造設計

3. **実装**
   ```typescript
   // 新機能のインターフェース定義
   interface NewFeatureSettings {
     enabled: boolean;
     customValue: number;
   }

   // 既存設定への追加
   interface ComfortModeSettings extends ExistingSettings {
     newFeature: NewFeatureSettings;
   }
   ```

4. **テスト**
   - 単体テスト
   - 統合テスト
   - ユーザビリティテスト

### 2. デバッグ手法

#### Chrome Developer Toolsの活用

**コンテンツスクリプトのデバッグ**:
1. 対象ページでF12を開く
2. Consoleタブでログ確認
3. Sourcesタブでブレークポイント設定

**バックグラウンドスクリプトのデバッグ**:
1. `chrome://extensions/` を開く
2. 該当拡張機能の「詳細」をクリック
3. 「バックグラウンドページ」のリンクをクリック

**オプションページのデバッグ**:
1. オプションページを開く
2. F12で開発者ツールを開く
3. 通常のウェブページと同様にデバッグ

#### ログ出力のベストプラクティス

```typescript
// 開発用ログ関数
const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Comfort Movie] ${message}`, data);
  }
};

// 使用例
debugLog('Video found', videoElement);
debugLog('Settings loaded', settings);
debugLog('Comfort mode activated');
```

#### エラーハンドリング

```typescript
// 非同期処理のエラーハンドリング
async function safeAsyncOperation(): Promise<void> {
  try {
    const result = await riskyOperation();
    processResult(result);
  } catch (error) {
    console.error('Operation failed:', error);
    showUserFriendlyError();
  }
}

// DOM操作のエラーハンドリング
function safeDOMOperation(): void {
  try {
    const element = document.querySelector('#target');
    if (!element) {
      throw new Error('Target element not found');
    }
    modifyElement(element);
  } catch (error) {
    console.error('DOM operation failed:', error);
  }
}
```

### 3. テスト戦略

#### 手動テスト項目

**基本機能テスト**:
- [ ] 動画の検出と最大化
- [ ] マウスホバーでのコントロール表示/非表示
- [ ] ESCキーでの快適モード解除
- [ ] 解除ボタンでの快適モード解除

**設定機能テスト**:
- [ ] 設定の保存・読み込み
- [ ] デフォルト設定への復元
- [ ] 設定変更の即座反映

**多言語テスト**:
- [ ] 各言語での表示確認
- [ ] 言語切り替え時の動作確認
- [ ] 未翻訳項目の確認

**ブラウザ互換性テスト**:
- [ ] Chrome（各バージョン）
- [ ] Chromium系ブラウザ

#### 自動テストの考慮

```typescript
// テスト用のヘルパー関数例
const createMockVideo = (): HTMLVideoElement => {
  const video = document.createElement('video');
  video.src = 'test-video.mp4';
  video.style.width = '640px';
  video.style.height = '360px';
  return video;
};

const simulateUserAction = (action: 'hover' | 'click' | 'keypress', target?: Element) => {
  // ユーザーアクションのシミュレーション
};
```

## パフォーマンス最適化

### 1. メモリ使用量の最適化

```typescript
// WeakMapを使用したメモリリーク防止
const videoDataMap = new WeakMap<HTMLVideoElement, VideoData>();

// イベントリスナーの適切な削除
class ComfortMode {
  private listeners: Array<() => void> = [];

  addListener(element: Element, event: string, handler: EventListener) {
    element.addEventListener(event, handler);
    this.listeners.push(() => element.removeEventListener(event, handler));
  }

  cleanup() {
    this.listeners.forEach(remove => remove());
    this.listeners = [];
  }
}
```

### 2. DOM操作の最適化

```typescript
// バッチDOM操作
const updateMultipleElements = (updates: Array<{element: Element, property: string, value: string}>) => {
  // ブラウザの再描画を最小化
  requestAnimationFrame(() => {
    updates.forEach(({element, property, value}) => {
      (element as any)[property] = value;
    });
  });
};

// 効率的な要素検索
const videoCache = new Map<string, HTMLVideoElement>();
const findVideoOptimized = (selector: string): HTMLVideoElement | null => {
  if (videoCache.has(selector)) {
    return videoCache.get(selector)!;
  }

  const video = document.querySelector(selector) as HTMLVideoElement;
  if (video) {
    videoCache.set(selector, video);
  }
  return video;
};
```

### 3. CSS最適化

```css
/* 高性能なCSS */
.comfort-mode-active {
  /* GPUアクセラレーションの活用 */
  transform: translateZ(0);
  will-change: transform;
}

.comfort-mode-video {
  /* 効率的なレイアウト */
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  object-fit: contain;
  /* 不要な再計算を避ける */
  transform: translateZ(0);
}
```

## セキュリティ考慮事項

### 1. Content Security Policy

```typescript
// 安全なDOM操作
const createSafeElement = (tag: string, properties: Record<string, string>): HTMLElement => {
  const element = document.createElement(tag);
  Object.entries(properties).forEach(([key, value]) => {
    if (key === 'textContent') {
      element.textContent = value; // XSS防止
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
};

// インラインスクリプトの回避
const attachEventSafely = (element: Element, event: string, handler: EventListener) => {
  element.addEventListener(event, handler); // onclick属性を使わない
};
```

### 2. 権限の最小化

```json
{
  "permissions": [
    "activeTab",        // 全タブアクセスではなくアクティブタブのみ
    "contextMenus",     // 必要な機能のみ
    "storage"          // 設定保存に必要
  ]
}
```

### 3. データ検証

```typescript
// 設定データの検証
const validateSettings = (settings: any): ComfortModeSettings => {
  const defaultSettings: ComfortModeSettings = {
    hoverDetectionTime: 2000,
    controlsDisableTime: 3000,
    // ... その他のデフォルト値
  };

  return {
    hoverDetectionTime: typeof settings.hoverDetectionTime === 'number'
      ? Math.max(500, Math.min(5000, settings.hoverDetectionTime))
      : defaultSettings.hoverDetectionTime,
    // ... その他の検証
  };
};
```

## コード品質管理

### 1. TypeScript活用

```typescript
// 厳密な型定義
interface StrictVideoElement extends HTMLVideoElement {
  readonly videoWidth: number;
  readonly videoHeight: number;
  readonly duration: number;
}

// ユニオン型での状態管理
type ComfortModeState = 'inactive' | 'activating' | 'active' | 'deactivating';

// Genericを使った型安全な関数
function getElementById<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}
```

### 2. コメントとドキュメント

```typescript
/**
 * 動画要素を快適モード用に最大化する
 * @param video 対象の動画要素
 * @param settings 快適モード設定
 * @returns 元のスタイル情報（復元用）
 */
function maximizeVideo(
  video: HTMLVideoElement,
  settings: ComfortModeSettings
): OriginalVideoStyle {
  // 実装...
}

// インライン説明
const aspectRatio = video.videoWidth / video.videoHeight; // 元の縦横比を保持
```

### 3. リファクタリング指針

```typescript
// Before: 長大な関数
function handleVideoInteraction(video, event, settings) {
  // 100行以上のコード...
}

// After: 責任の分離
class VideoInteractionHandler {
  constructor(private video: HTMLVideoElement, private settings: ComfortModeSettings) {}

  handleHover(event: MouseEvent): void { /* ... */ }
  handleClick(event: MouseEvent): void { /* ... */ }
  handleKeyPress(event: KeyboardEvent): void { /* ... */ }
}
```

## リリース準備

### 1. プリリリースチェックリスト

- [ ] **機能テスト**: すべての機能の動作確認
- [ ] **多言語テスト**: サポート言語での表示確認
- [ ] **パフォーマンステスト**: メモリ使用量・CPU使用率確認
- [ ] **セキュリティチェック**: 脆弱性スキャン
- [ ] **コードレビュー**: 品質確認
- [ ] **ドキュメント更新**: READMEや技術文書の更新

### 2. バージョン管理

```bash
# バージョン番号の更新
# manifest.json
{
  "version": "1.1.0"
}

# package.json
{
  "version": "1.1.0"
}

# Git タグの作成
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0
```

### 3. リリースノート作成

```markdown
# Comfort Movie v1.1.0

## 新機能
- 多言語対応（日本語、英語、中国語）
- Amazon Prime Video対応
- 設定のインポート/エクスポート機能

## 改善
- パフォーマンスの最適化
- UI/UXの改善
- エラーハンドリングの強化

## バグ修正
- YouTube での動画検出不具合修正
- 設定保存時のエラー処理改善

## 技術的変更
- TypeScript 5.0 対応
- Manifest V3 完全対応
```

## トラブルシューティング

### よくある開発時の問題

1. **TypeScriptコンパイルエラー**
   ```bash
   # 型定義の確認
   npm list @types/chrome

   # TypeScriptバージョン確認
   npx tsc --version

   # クリーンビルド
   npm run clean && npm run build
   ```

2. **Chrome拡張機能が動作しない**
   - manifest.jsonの構文確認
   - 権限設定の確認
   - Service Workerのエラーログ確認

3. **設定が保存されない**
   - Storage権限の確認
   - 非同期処理の適切な実装確認
   - エラーハンドリングの確認

### デバッグ支援ツール

```typescript
// 開発用デバッグヘルパー
const DebugHelper = {
  logSettings: () => {
    chrome.storage.sync.get(null, (items) => {
      console.table(items);
    });
  },

  clearSettings: () => {
    chrome.storage.sync.clear(() => {
      console.log('Settings cleared');
    });
  },

  simulateVideoLoad: () => {
    const video = createMockVideo();
    document.body.appendChild(video);
    return video;
  }
};

// グローバルスコープに追加（開発時のみ）
if (process.env.NODE_ENV === 'development') {
  (window as any).ComfortMovieDebug = DebugHelper;
}
```