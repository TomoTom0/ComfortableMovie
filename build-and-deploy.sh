#!/bin/bash

# Comfort Movie - Build and Deploy Script

set -e  # スクリプトがエラーで停止するように設定

# .envファイルから設定を読み込み
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

echo "=== Comfort Movie - Build and Deploy ==="
echo ""

# ビルド実行
echo "🔨 Building TypeScript project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# デプロイ先の確認
if [ -z "$DEPLOY_DESTINATION" ]; then
    echo "❌ Error: DEPLOY_DESTINATION not set in .env file"
    exit 1
fi

echo "📦 Deploying to: $DEPLOY_DESTINATION"

# rsync実行
rsync -av --delete dist/ "$DEPLOY_DESTINATION"

if [ $? -ne 0 ]; then
    echo "❌ Deploy failed"
    exit 1
fi

echo "✅ Deploy completed successfully"
echo ""
echo "🎉 Build and deploy process finished!"
echo "Extension files are now available at: $DEPLOY_DESTINATION"