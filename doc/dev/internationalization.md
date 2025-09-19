# 多言語対応（i18n）実装ガイド

## 概要

Comfort Movie Chrome拡張機能の多言語対応（国際化：Internationalization）の実装方法と運用について説明します。

## サポート言語

| 言語コード | 言語名 | 地域 | 状態 |
|------------|--------|------|------|
| `ja` | 日本語 | 日本 | デフォルト言語 |
| `en` | English | 世界共通 | 完全対応 |
| `zh` | 中文 | 中国・台湾 | 完全対応 |

## アーキテクチャ

### ディレクトリ構造

```
_locales/
├── ja/
│   └── messages.json      # 日本語（デフォルト）
├── en/
│   └── messages.json      # 英語
└── zh/
    └── messages.json      # 中国語
```

### manifest.json設定

```json
{
  "default_locale": "ja",
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__"
}
```

## メッセージファイル形式

### 基本構造

```json
{
  "メッセージキー": {
    "message": "表示するテキスト",
    "description": "開発者向けの説明（オプション）"
  }
}
```

### 実装例

```json
{
  "extensionName": {
    "message": "Comfort Movie",
    "description": "拡張機能の名前"
  },
  "hoverDetectionTime": {
    "message": "ホバー検出時間",
    "description": "設定項目のラベル"
  },
  "settingsSaved": {
    "message": "設定を保存しました",
    "description": "保存完了時のメッセージ"
  }
}
```

## 実装方法

### 1. HTMLでの多言語対応

#### data-i18n属性の使用

```html
<!-- 静的テキストの多言語化 -->
<h2 data-i18n="basicSettings">基本設定</h2>
<span data-i18n="hoverDetectionTime">ホバー検出時間</span>
<button data-i18n="saveButton">設定を保存</button>

<!-- 複数の要素タイプに対応 -->
<input type="button" data-i18n="resetButton" value="デフォルトに戻す">
<title data-i18n="optionsTitle">設定</title>
```

#### JavaScript側の処理

```typescript
function localizeUI(): void {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const message = chrome.i18n.getMessage(key);
      if (message) {
        // input要素のvalueプロパティに対応
        if (element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'button') {
          (element as HTMLInputElement).value = message;
        } else {
          element.textContent = message;
        }
      }
    }
  });

  // ページタイトルの更新
  document.title = chrome.i18n.getMessage('optionsTitle') || 'Comfort Movie - Options';
}
```

### 2. JavaScriptでの多言語対応

#### 基本的な使用方法

```typescript
// 単純なメッセージ取得
const message = chrome.i18n.getMessage('settingsSaved');

// フォールバック付きメッセージ取得
const message = chrome.i18n.getMessage('settingsSaved') || 'Settings saved';

// 動的なテキスト生成
const showToast = (messageKey: string) => {
  const message = chrome.i18n.getMessage(messageKey);
  displayNotification(message);
};
```

#### 動的コンテンツの多言語化

```typescript
// スライダー値の表示
function updateSliderValue(value: number): void {
  const unit = chrome.i18n.getMessage('secondsUnit') || '秒';
  elements.sliderValue.textContent = `${value}${unit}`;
}

// 確認ダイアログ
function confirmReset(): boolean {
  const confirmMessage = chrome.i18n.getMessage('resetConfirm') || '設定をリセットしますか？';
  return confirm(confirmMessage);
}

// エラーメッセージ
function handleError(errorType: string): void {
  const errorMessage = chrome.i18n.getMessage(`${errorType}Error`);
  showToast(errorMessage, 'error');
}
```

### 3. 特殊なケース

#### 単位表示の対応

```typescript
// 各言語での単位表示
// ja: "2.0秒", "20%"
// en: "2.0s", "20%"
// zh: "2.0秒", "20%"

const formatTime = (seconds: number): string => {
  const unit = chrome.i18n.getMessage('secondsUnit') || '秒';
  return `${seconds.toFixed(1)}${unit}`;
};

const formatPercent = (percent: number): string => {
  const unit = chrome.i18n.getMessage('percentUnit') || '%';
  return `${percent}${unit}`;
};
```

#### 複数形対応（英語）

```json
{
  "itemCount": {
    "message": "$COUNT$ item(s)",
    "description": "アイテム数の表示"
  }
}
```

```typescript
// 置換パラメータの使用
const count = 5;
const message = chrome.i18n.getMessage('itemCount', [count.toString()]);
```

## メッセージキー管理

### 命名規則

#### カテゴリ別プレフィックス

- **settings**: 設定関連 (`settingsSaved`, `settingsLoadError`)
- **shortcut**: ショートカット説明 (`shortcutEsc`, `shortcutRightClick`)
- **context**: コンテキストメニュー (`contextMenuToggle`)
- **tooltip**: ツールチップ (`comfortModeTooltip`)

#### 形容詞サフィックス

- **Desc**: 説明文 (`hoverDetectionTimeDesc`)
- **Error**: エラーメッセージ (`settingsSaveError`)
- **Confirm**: 確認メッセージ (`resetConfirm`)
- **Unit**: 単位 (`secondsUnit`, `percentUnit`)

### メッセージの一覧

#### 基本情報
- `extensionName`: 拡張機能名
- `extensionDescription`: 拡張機能の説明
- `optionsTitle`: オプションページタイトル
- `subtitle`: サブタイトル

#### 設定項目
- `basicSettings`: 基本設定
- `menuSettings`: メニュー設定
- `siteSettings`: サイト別設定
- `displaySettings`: 表示設定
- `shortcuts`: ショートカット

#### 設定内容
- `hoverDetectionTime`: ホバー検出時間
- `hoverDetectionTimeDesc`: ホバー検出時間の説明
- `controlsDisableTime`: コントロール無効化時間
- `controlsDisableTimeDesc`: コントロール無効化時間の説明
- `showInlineButton`: プレーヤー内ボタン表示
- `pausedControlsEnabled`: 一時停止時の即座制御

#### ユーザーフィードバック
- `settingsSaved`: 設定保存完了
- `settingsReset`: 設定リセット完了
- `settingsLoadError`: 設定読み込みエラー
- `settingsSaveError`: 設定保存エラー
- `resetConfirm`: リセット確認

#### 単位・その他
- `secondsUnit`: 秒の単位表示
- `percentUnit`: パーセントの単位表示
- `saveButton`: 保存ボタン
- `resetButton`: リセットボタン

## 翻訳ガイドライン

### 日本語（デフォルト）

- **敬語**: 丁寧語を基本とする
- **カタカナ**: 外来語は適切にカタカナ表記
- **漢字**: 常用漢字を優先使用
- **句読点**: 「、」「。」を適切に使用

### 英語

- **簡潔性**: 明確で簡潔な表現
- **一般的な用語**: 技術用語は一般的なものを使用
- **大文字**: タイトルケースを適切に使用
- **文法**: 正しい文法構造

### 中国語

- **簡体字**: 簡体字中国語を使用
- **現代用語**: 現代的で自然な表現
- **統一性**: 用語の一貫性を保持

## 新しい言語の追加

### 手順

1. **ディレクトリ作成**
   ```bash
   mkdir _locales/[言語コード]
   ```

2. **メッセージファイル作成**
   ```bash
   cp _locales/ja/messages.json _locales/[言語コード]/messages.json
   ```

3. **翻訳作業**
   - すべての "message" フィールドを翻訳
   - "description" フィールドは英語で記述（開発者向け）

4. **テスト**
   - ブラウザの言語設定を変更
   - すべてのUI要素の表示確認

### 対応言語候補

- **fr**: フランス語
- **de**: ドイツ語
- **es**: スペイン語
- **ko**: 韓国語
- **pt**: ポルトガル語
- **ru**: ロシア語

## 品質保証

### チェック項目

1. **完全性**: すべてのメッセージキーが翻訳されている
2. **一貫性**: 同じ概念に同じ用語を使用
3. **長さ**: UI要素に収まる適切な長さ
4. **文脈**: 使用場面に適した表現
5. **エンコーディング**: UTF-8エンコーディング

### テスト手順

1. **言語切り替えテスト**
   ```bash
   # Chromeの言語設定変更
   chrome://settings/languages
   ```

2. **全画面確認**
   - オプションページ
   - コンテキストメニュー
   - トースト通知
   - ツールチップ

3. **動的コンテンツ確認**
   - スライダー値表示
   - エラーメッセージ
   - 確認ダイアログ

## 保守・運用

### 翻訳の更新

1. **新機能追加時**: 対応する翻訳を全言語に追加
2. **文言修正時**: 該当する翻訳を全言語で更新
3. **定期レビュー**: 翻訳の正確性・自然性の確認

### バージョン管理

- **Git**: 翻訳変更もコミット対象
- **レビュー**: ネイティブスピーカーによるレビュー推奨
- **バックアップ**: 翻訳ファイルの定期バックアップ

### 自動化の可能性

```bash
# 翻訳キーの一致確認スクリプト例
#!/bin/bash
for lang in ja en zh; do
  echo "Checking $lang..."
  jq -r 'keys[]' _locales/$lang/messages.json | sort > /tmp/$lang.keys
done

diff /tmp/ja.keys /tmp/en.keys
diff /tmp/ja.keys /tmp/zh.keys
```

## トラブルシューティング

### よくある問題

1. **翻訳が表示されない**
   - メッセージキーの拼写確認
   - _localesディレクトリの配置確認
   - ブラウザの言語設定確認

2. **デフォルト言語が表示される**
   - 対象言語のメッセージファイル存在確認
   - JSONの形式エラー確認

3. **一部のテキストが英語のまま**
   - data-i18n属性の設定確認
   - localizeUI()の実行確認

### デバッグ方法

```typescript
// 現在の言語確認
console.log('Current locale:', chrome.i18n.getUILanguage());

// メッセージ取得確認
console.log('Message:', chrome.i18n.getMessage('extensionName'));

// 利用可能な言語確認
console.log('Accept languages:', chrome.i18n.getAcceptLanguages());
```