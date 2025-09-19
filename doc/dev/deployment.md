# デプロイメントガイド

## 概要

Comfort Movie Chrome拡張機能の開発からデプロイまでの手順を説明します。

## 前提条件

- Node.js (v16以上推奨)
- TypeScript
- Chrome拡張機能の開発に関する基本的な知識

## プロジェクト構造

```
comfortable-movie/
├── src/                    # TypeScriptソースファイル
│   ├── content.ts         # コンテンツスクリプト
│   ├── background.ts      # バックグラウンドスクリプト（サービスワーカー）
│   ├── options.ts         # オプションページ
│   ├── options.html       # オプションページHTML
│   └── content.css        # コンテンツスクリプト用CSS
├── _locales/              # 多言語対応メッセージファイル
│   ├── ja/messages.json   # 日本語
│   ├── en/messages.json   # 英語
│   └── zh/messages.json   # 中国語
├── icons/                 # アイコンファイル
├── dist/                  # ビルド出力ディレクトリ
├── build/                 # パッケージ出力ディレクトリ
├── manifest.json          # 拡張機能マニフェスト
├── build-and-deploy.sh    # ビルド・デプロイスクリプト
└── package.json           # npm設定ファイル
```

## 開発環境セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. TypeScript設定

プロジェクトには以下のTypeScript設定が含まれています：

- `tsconfig.json`: TypeScriptコンパイラ設定
- 出力先: `dist/` ディレクトリ
- ターゲット: ES2020

## ビルドプロセス

### 利用可能なnpmスクリプト

```bash
# TypeScriptコンパイル + アセットコピー
npm run build

# アセットファイルのコピー
npm run copy-assets

# TypeScriptの監視モード
npm run watch

# distディレクトリのクリーンアップ
npm run clean

# クリーンアップ + ビルド
npm run rebuild
```

### 手動ビルド手順

1. **TypeScriptコンパイル**
   ```bash
   tsc
   ```

2. **アセットファイルのコピー**
   ```bash
   npm run copy-assets
   ```

3. **多言語ファイルのコピー**
   ```bash
   cp -r _locales dist/
   ```

## デプロイメント

### 自動デプロイ（推奨）

プロジェクトルートの `build-and-deploy.sh` スクリプトを使用：

```bash
./build-and-deploy.sh
```

このスクリプトは以下を実行します：

1. **ビルド**: TypeScriptコンパイル + アセットコピー
2. **デプロイ**: `~/user/Mine/_chex/src_comfortMovie/` へのrsync
3. **パッケージング**: `build/comfort-movie-extension.zip` の作成

### 手動デプロイ

1. **ビルド実行**
   ```bash
   npm run build
   cp -r _locales dist/
   ```

2. **デプロイ先への同期**
   ```bash
   rsync -av --delete dist/ ~/user/Mine/_chex/src_comfortMovie/
   ```

3. **拡張機能パッケージの作成**
   ```bash
   cd ~/user/Mine/_chex/src_comfortMovie/
   zip -r comfort-movie-extension.zip .
   ```

## デプロイ先ディレクトリ

### 開発環境デプロイ先

- **パス**: `~/user/Mine/_chex/src_comfortMovie/`
- **用途**: 開発・テスト用の拡張機能ファイル配置
- **同期方式**: rsync（--deleteオプションで差分同期）

### パッケージ出力

- **パス**: `build/comfort-movie-extension.zip`
- **用途**: Chromeウェブストアへの提出やユーザー配布用
- **内容**: 実行可能な拡張機能の全ファイル

## Chrome拡張機能のインストール・テスト

### 開発者モードでの読み込み

1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `~/user/Mine/_chex/src_comfortMovie/` ディレクトリを選択

### パッケージからのインストール

1. `build/comfort-movie-extension.zip` をChromeにドラッグ&ドロップ
2. インストール確認ダイアログで「拡張機能を追加」をクリック

## 多言語対応について

### サポート言語

- **日本語** (ja): デフォルト言語
- **英語** (en): 国際対応
- **中国語** (zh): アジア圏対応

### メッセージファイルの編集

新しいテキストを追加する場合：

1. `_locales/ja/messages.json` に日本語メッセージを追加
2. `_locales/en/messages.json` に英語訳を追加
3. `_locales/zh/messages.json` に中国語訳を追加
4. HTMLでは `data-i18n="キー名"` 属性を使用
5. JavaScriptでは `chrome.i18n.getMessage('キー名')` を使用

## トラブルシューティング

### よくある問題

1. **ビルドエラー**
   - `npm run clean` でdistディレクトリをクリーンアップ
   - `npm install` で依存関係を再インストール

2. **権限エラー**
   - `manifest.json` の permissions セクションを確認
   - 必要に応じて新しい権限を追加

3. **多言語表示されない**
   - `_locales/` ディレクトリが正しくコピーされているか確認
   - メッセージキーの拼写を確認

4. **デプロイ先にファイルがない**
   - `build-and-deploy.sh` の実行権限を確認: `chmod +x build-and-deploy.sh`
   - rsyncコマンドのパスを確認

### ログの確認

- **バックグラウンドスクリプト**: `chrome://extensions/` → 拡張機能の「詳細」→「バックグラウンドページ」
- **コンテンツスクリプト**: 対象ページでF12開発者ツール → Console
- **オプションページ**: オプションページでF12開発者ツール → Console

## リリース手順

1. **コードの最終確認**
   - 機能テスト
   - 多言語表示確認
   - 各種ブラウザでの動作確認

2. **バージョン更新**
   - `manifest.json` の version フィールドを更新
   - `package.json` の version フィールドを更新

3. **最終ビルド・デプロイ**
   ```bash
   ./build-and-deploy.sh
   ```

4. **パッケージの配布**
   - `build/comfort-movie-extension.zip` をGitHubリリースに添付
   - Chromeウェブストアに提出（必要に応じて）

## セキュリティ考慮事項

- **最小権限原則**: 必要最小限のpermissionsのみを使用
- **CSP (Content Security Policy)**: インラインスクリプトを避ける
- **XSS対策**: ユーザー入力の適切なサニタイズ
- **秘密情報**: APIキーやパスワードをコードに含めない

## パフォーマンス最適化

- **リソースサイズ**: 不要なファイルを除外
- **読み込み速度**: 必要な時のみスクリプト実行
- **メモリ使用量**: イベントリスナーの適切な管理
- **CPU使用率**: 頻繁な DOM 操作を避ける