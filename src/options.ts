// Comfort Movie Options Page

interface ComfortModeSettings {
  hoverDetectionTime: number;
  controlsDisableTime: number;
  showInlineButton: boolean;
  pausedControlsEnabled: boolean;
  showContextMenu: boolean;
  showVideoContextMenu: boolean;
  enableYoutube: boolean;
  enablePrimeVideo: boolean;
  enableAllSites: boolean;
  exitButtonOpacity: number;
}

// デフォルト設定
const defaultSettings: ComfortModeSettings = {
  hoverDetectionTime: 2000,
  controlsDisableTime: 3000,
  showInlineButton: true,
  pausedControlsEnabled: true,
  showContextMenu: true,
  showVideoContextMenu: true,
  enableYoutube: true,
  enablePrimeVideo: true,
  enableAllSites: true,
  exitButtonOpacity: 20
};

// DOM要素の取得
const elements = {
  hoverTime: document.getElementById('hoverTime') as HTMLInputElement,
  hoverTimeValue: document.getElementById('hoverTimeValue') as HTMLSpanElement,
  disableTime: document.getElementById('disableTime') as HTMLInputElement,
  disableTimeValue: document.getElementById('disableTimeValue') as HTMLSpanElement,
  showInlineButton: document.getElementById('showInlineButton') as HTMLInputElement,
  pausedControlsEnabled: document.getElementById('pausedControlsEnabled') as HTMLInputElement,
  showContextMenu: document.getElementById('showContextMenu') as HTMLInputElement,
  showVideoContextMenu: document.getElementById('showVideoContextMenu') as HTMLInputElement,
  enableYoutube: document.getElementById('enableYoutube') as HTMLInputElement,
  enablePrimeVideo: document.getElementById('enablePrimeVideo') as HTMLInputElement,
  enableAllSites: document.getElementById('enableAllSites') as HTMLInputElement,
  exitButtonOpacity: document.getElementById('exitButtonOpacity') as HTMLInputElement,
  exitButtonOpacityValue: document.getElementById('exitButtonOpacityValue') as HTMLSpanElement,
  saveButton: document.getElementById('saveButton') as HTMLButtonElement,
  resetButton: document.getElementById('resetButton') as HTMLButtonElement
};

// 設定を読み込み
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(defaultSettings);
    const settings = result as ComfortModeSettings;

    // フォームに値を設定
    elements.hoverTime.value = settings.hoverDetectionTime.toString();
    const secondsUnit = chrome.i18n.getMessage('secondsUnit') || '秒';
    elements.hoverTimeValue.textContent = `${(settings.hoverDetectionTime / 1000).toFixed(1)}${secondsUnit}`;

    elements.disableTime.value = settings.controlsDisableTime.toString();
    elements.disableTimeValue.textContent = `${(settings.controlsDisableTime / 1000).toFixed(1)}${secondsUnit}`;

    elements.showInlineButton.checked = settings.showInlineButton;
    elements.pausedControlsEnabled.checked = settings.pausedControlsEnabled;
    elements.showContextMenu.checked = settings.showContextMenu;
    elements.showVideoContextMenu.checked = settings.showVideoContextMenu;
    elements.enableYoutube.checked = settings.enableYoutube;
    elements.enablePrimeVideo.checked = settings.enablePrimeVideo;
    elements.enableAllSites.checked = settings.enableAllSites;

    elements.exitButtonOpacity.value = settings.exitButtonOpacity.toString();
    const percentUnit = chrome.i18n.getMessage('percentUnit') || '%';
    elements.exitButtonOpacityValue.textContent = `${settings.exitButtonOpacity}${percentUnit}`;

  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    showToast(chrome.i18n.getMessage('settingsLoadError'), 'error');
  }
}

// 設定を保存
async function saveSettings(): Promise<void> {
  try {
    const settings: ComfortModeSettings = {
      hoverDetectionTime: parseInt(elements.hoverTime.value),
      controlsDisableTime: parseInt(elements.disableTime.value),
      showInlineButton: elements.showInlineButton.checked,
      pausedControlsEnabled: elements.pausedControlsEnabled.checked,
      showContextMenu: elements.showContextMenu.checked,
      showVideoContextMenu: elements.showVideoContextMenu.checked,
      enableYoutube: elements.enableYoutube.checked,
      enablePrimeVideo: elements.enablePrimeVideo.checked,
      enableAllSites: elements.enableAllSites.checked,
      exitButtonOpacity: parseInt(elements.exitButtonOpacity.value)
    };

    await chrome.storage.sync.set(settings);
    showToast(chrome.i18n.getMessage('settingsSaved'), 'success');

    // バックグラウンドスクリプトに設定変更を通知（コンテキストメニュー更新のため）
    try {
      chrome.runtime.sendMessage({
        action: 'updateContextMenus',
        settings
      });
    } catch (error) {
      console.error('バックグラウンドスクリプトへの通信に失敗しました:', error);
    }

    // アクティブなタブに設定変更を通知
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'settingsUpdated',
          settings
        });
      }
    } catch (error) {
      // タブへの通信に失敗した場合は無視（コンテンツスクリプトがない場合など）
    }

  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    showToast(chrome.i18n.getMessage('settingsSaveError'), 'error');
  }
}

// デフォルト設定に戻す
async function resetSettings(): Promise<void> {
  try {
    await chrome.storage.sync.set(defaultSettings);
    await loadSettings();
    showToast(chrome.i18n.getMessage('settingsReset'), 'success');
  } catch (error) {
    console.error('設定のリセットに失敗しました:', error);
    showToast(chrome.i18n.getMessage('settingsResetError'), 'error');
  }
}

// トースト通知を表示
function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // アニメーション表示
  setTimeout(() => toast.classList.add('show'), 100);

  // 3秒後に削除
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// スライダーの値表示を更新
function updateSliderValues(): void {
  elements.hoverTime.addEventListener('input', () => {
    const value = parseInt(elements.hoverTime.value) / 1000;
    const unit = chrome.i18n.getMessage('secondsUnit') || '秒';
    elements.hoverTimeValue.textContent = `${value.toFixed(1)}${unit}`;
  });

  elements.disableTime.addEventListener('input', () => {
    const value = parseInt(elements.disableTime.value) / 1000;
    const unit = chrome.i18n.getMessage('secondsUnit') || '秒';
    elements.disableTimeValue.textContent = `${value.toFixed(1)}${unit}`;
  });

  elements.exitButtonOpacity.addEventListener('input', () => {
    const value = parseInt(elements.exitButtonOpacity.value);
    const unit = chrome.i18n.getMessage('percentUnit') || '%';
    elements.exitButtonOpacityValue.textContent = `${value}${unit}`;
  });
}

// イベントリスナーの設定
function setupEventListeners(): void {
  elements.saveButton.addEventListener('click', saveSettings);
  elements.resetButton.addEventListener('click', () => {
    if (confirm(chrome.i18n.getMessage('resetConfirm'))) {
      resetSettings();
    }
  });

  updateSliderValues();
}

// 多言語化のためのテキスト置換
function localizeUI(): void {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const message = chrome.i18n.getMessage(key);
      if (message) {
        if (element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'button') {
          (element as HTMLInputElement).value = message;
        } else {
          element.textContent = message;
        }
      }
    }
  });

  // ページタイトルも更新
  document.title = chrome.i18n.getMessage('optionsTitle') || 'Comfort Movie - Options';
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  localizeUI();
  setupEventListeners();
  await loadSettings();
});

// キーボードショートカット
document.addEventListener('keydown', (event) => {
  // Ctrl+S で保存
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    saveSettings();
  }
});