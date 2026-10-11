/** @file 更新提示弹窗与版本检查入口。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { showToast } from '../ui/toast.js';

const releaseState = {
  url: '',
};

export function showUpdateModal(data) {
  document.getElementById('update-current-version').textContent = data.currentVersion || '-';
  document.getElementById('update-latest-version').textContent =
    data.latestVersion || data.version || '-';
  document.getElementById('update-release-date').textContent = data.releaseDate || '-';
  document.getElementById('update-changelog').textContent = data.changelog || '-';

  releaseState.url = data.releaseURL || 'https://github.com/huey1in/kirox/releases/latest';

  document.getElementById('update-modal').classList.add('show');
}

export async function closeUpdateModal() {
  document.getElementById('update-modal').classList.remove('show');
}

export function openReleasePage() {
  const url = releaseState.url || 'https://github.com/huey1in/kirox/releases/latest';
  if (getAppApi() && getAppApi().OpenURL) {
    getAppApi().OpenURL(url);
  } else {
    window.open(url, '_blank');
  }
}

export async function checkUpdateManually() {
  try {
    const result = await getAppApi().CheckUpdate();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    if (result.hasUpdate) {
      showUpdateModal(result);
    } else {
      showToast(tr('toast.upToDate', '当前已是最新版本'));
    }
  } catch (e) {
    showToast(tr('toast.checkUpdateFailed', '检查更新失败') + ': ' + e.message, 'error');
  }
}

export async function checkUpdateOnStartup() {
  try {
    const result = await getAppApi().CheckUpdate();
    if (result && result.hasUpdate) {
      if (typeof showUpdateModal === 'function') showUpdateModal(result);
    }
  } catch (e) {}
}
