// Chrome拡張機能のサービスワーカー (バックグラウンドスクリプト)

// デフォルト設定（コンテキストメニュー用）
const defaultMenuSettings = {
  showContextMenu: true,
  showVideoContextMenu: true
};

// コンテキストメニューを作成する関数
async function createContextMenus(): Promise<void> {
  try {
    // 既存のメニューを削除
    await chrome.contextMenus.removeAll();

    // 設定を読み込み
    const result = await chrome.storage.sync.get(defaultMenuSettings);
    const settings = result;

    // 全体向けのメニューアイテム
    if (settings.showContextMenu) {
      chrome.contextMenus.create({
        id: 'comfort-mode-toggle',
        title: chrome.i18n.getMessage('contextMenuToggle'),
        contexts: ['all']
      });
    }

    // video要素専用のメニューアイテム
    if (settings.showVideoContextMenu) {
      chrome.contextMenus.create({
        id: 'comfort-mode-video-toggle',
        title: chrome.i18n.getMessage('contextMenuVideoToggle'),
        contexts: ['video']
      });
    }
  } catch (error) {
    console.error('コンテキストメニューの作成に失敗しました:', error);
  }
}

// 拡張機能のインストール時にコンテキストメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

// コンテキストメニューがクリックされた時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if ((info.menuItemId === 'comfort-mode-toggle' || info.menuItemId === 'comfort-mode-video-toggle') && tab?.id) {
    // video要素専用メニューの場合は、クリックされた動画要素の情報も送信
    const message = {
      action: 'toggleComfortMode',
      isVideoContext: info.menuItemId === 'comfort-mode-video-toggle',
      clickedElementInfo: info.menuItemId === 'comfort-mode-video-toggle' ? {
        srcUrl: info.srcUrl,
        pageUrl: info.pageUrl
      } : undefined
    };

    // アクティブなタブのコンテンツスクリプトにメッセージを送信
    chrome.tabs.sendMessage(tab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('コンテンツスクリプトとの通信に失敗しました:', chrome.runtime.lastError);
      } else if (response?.success) {
        const context = info.menuItemId === 'comfort-mode-video-toggle' ? '(動画から)' : '';
        console.log(`快適モードが切り替えられました ${context}`);
      }
    });
  }
});

// 拡張機能のアイコンがクリックされた時の処理
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // アクティブなタブのコンテンツスクリプトにメッセージを送信
    chrome.tabs.sendMessage(tab.id, { action: 'toggleComfortMode' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('コンテンツスクリプトとの通信に失敗しました:', chrome.runtime.lastError);
      } else if (response?.success) {
        console.log('快適モードが切り替えられました');
      }
    });
  }
});

// オプションページからのメッセージを受信（コンテキストメニュー更新）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateContextMenus') {
    createContextMenus();
    sendResponse({ success: true });
  }
});