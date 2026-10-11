/** @file 等待桌面运行时并加载应用初始配置。 */

import { getAppApi, getRuntime } from '../platform/wails.js';

import { checkUpdateOnStartup } from '../about/updates.js';
import { loadOutlookAccountsList } from '../accounts/outlook/accounts.js';
import { initializeLanguagePreferences } from './language.js';
import { initEmailProviderSelection } from '../email/selection.js';
import { loadProxyOptions } from '../proxy/options.js';
import { loadDataDir, loadResultOutputDir } from '../settings/directories.js';
import { initSettingsChangeTracking } from '../settings/dirty.js';
import { loadAppSettings } from '../settings/persistence.js';
import { settingsState } from '../settings/state.js';

export async function loadConfig() {
  console.log('[启动] 开始初始化...');

  let retries = 0;
  while (!getAppApi() && retries < 100) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    retries++;
  }
  if (!getAppApi()) {
    console.error('[启动] Wails runtime 加载失败');

    document.getElementById('main-container').style.display = 'block';
    const failedSkeleton = document.getElementById('skeleton-loader');
    if (failedSkeleton) failedSkeleton.style.display = 'none';
    return;
  }
  console.log('[启动] Wails runtime 已就绪');

  try {
    const env = await getRuntime().Environment();
    if (env && env.platform === 'darwin') {
      document.body.classList.add('platform-darwin');
    }
  } catch (e) {}

  console.log('[启动] 显示主界面');
  const mainContainer = document.getElementById('main-container');
  if (mainContainer) {
    mainContainer.style.display = 'block';

    const skeleton = document.getElementById('skeleton-loader');
    if (skeleton) {
      skeleton.style.display = 'none';
    }

    console.log('[启动] main-container 已显示');
  } else {
    console.error('[启动] 找不到 main-container 元素');
  }

  await loadAppSettings();
  loadOutlookAccountsList();
  loadDataDir();
  loadResultOutputDir();
  if (typeof loadProxyOptions === 'function') loadProxyOptions();
  console.log('[启动] 初始化完成');
}

export async function initializeApp() {
  await loadConfig();
  initSettingsChangeTracking();
  initEmailProviderSelection();
  await initializeLanguagePreferences();
  if (!settingsState.appSettings || settingsState.appSettings.autoCheckUpdates !== false)
    setTimeout(checkUpdateOnStartup, 2000);
}
