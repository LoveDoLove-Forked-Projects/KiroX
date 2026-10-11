/** @file 侧栏语言切换与首次启动语言偏好的同步。 */

import { renderInfoChangelogState } from '../about/info.js';
import { navigationState } from './navigation-state.js';
import { getPageTitle } from './navigation.js';
import { I18N, tr } from '../i18n/index.js';
import { setSettingValue, settingValue } from '../settings/controls.js';
import { updateSettingsDirtyState } from '../settings/dirty.js';
import { persistAppSetting } from '../settings/persistence.js';
import { settingsState } from '../settings/state.js';
import { showToast } from '../ui/toast.js';

const languageOrder = ['zh', 'en', 'ja'];

const languageLabels = { zh: '中', en: 'EN', ja: 'あ' };

const languageFlags = { zh: 'cn', en: 'us', ja: 'jp' };

export function cycleLanguage() {
  if (!I18N) return;
  const cur = I18N.getLanguage();
  const idx = languageOrder.indexOf(cur);
  const next = languageOrder[(idx + 1) % languageOrder.length];
  try {
    setSettingValue('setting-language', next);
    I18N.setLanguage(next);
    if (settingsState.appSettings)
      persistAppSetting('language', next).catch(function (e) {
        showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
      });
    showToast(tr('toast.languageChanged', '已切换语言'));
  } catch (e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}

export function refreshLanguageNavLabel() {
  const el = document.getElementById('nav-language-label');
  if (!el || !I18N) return;
  const cur = I18N.getLanguage();
  if (el.tagName === 'IMG') {
    el.src = 'https://flagcdn.com/w40/' + (languageFlags[cur] || 'cn') + '.png';
    el.alt = cur;
  } else {
    el.textContent = languageLabels[cur] || cur;
  }
}

/**
 * 同步初始语言和后续语言切换，检测期间保留用户修改的控件草稿。
 * @returns {Promise<void>} 初始语言同步与必要的默认值持久化完成。
 */
export async function initializeLanguagePreferences() {
  const languageBeforeInit = settingValue('setting-language', '');
  let initializingLanguage = true;

  window.addEventListener('i18n:changed', function () {
    const tb = document.getElementById('titlebar-text');
    if (tb) tb.textContent = getPageTitle(navigationState.currentPageId);
    refreshLanguageNavLabel();
    const activeLanguage = I18N.getLanguage();
    if (!initializingLanguage || settingValue('setting-language', '') === languageBeforeInit) {
      setSettingValue('setting-language', activeLanguage);
    }
    renderInfoChangelogState();
    updateSettingsDirtyState();
  });

  try {
    if (I18N && typeof I18N.init === 'function') {
      const selectedDefaultLanguage = await I18N.init();
      const initialLanguage = I18N.getLanguage();
      initializingLanguage = false;
      refreshLanguageNavLabel();

      const tb = document.getElementById('titlebar-text');
      if (tb) tb.textContent = getPageTitle(navigationState.currentPageId);
      if (
        selectedDefaultLanguage &&
        settingsState.appSettings &&
        !settingsState.appSettings.language
      ) {
        await persistAppSetting('language', initialLanguage);
      }
    }
  } catch (e) {
  } finally {
    initializingLanguage = false;
  }
}
