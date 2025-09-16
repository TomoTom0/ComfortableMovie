// Chrome拡張機能のサービスワーカー (バックグラウンドスクリプト)

// 拡張機能のインストール時にコンテキストメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'comfort-mode-toggle',
    title: '快適動画モードを切り替え',
    contexts: ['all']
  });
});

// コンテキストメニューがクリックされた時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'comfort-mode-toggle' && tab?.id) {
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