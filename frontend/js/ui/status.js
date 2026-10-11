/** @file 连接测试按钮和可重新翻译的动态状态文本。 */

import { tr } from '../i18n/index.js';

export function setInlineTestButton(btn, testing, testingKey) {
  if (!btn) return;
  btn.disabled = !!testing;
  const label = btn.querySelector('[data-i18n="accounts.testConnection"]');
  if (label)
    label.textContent = testing
      ? tr(testingKey || 'moemail.testing', '测试中...')
      : tr('accounts.testConnection', '测试连接');
}

export function setLocalizedStatus(el, key, vars, fallback) {
  if (!el) return;
  el.dataset.i18nDynamic = key;
  el.dataset.i18nDynamicVars = JSON.stringify(vars || {});
  el.dataset.i18nDynamicFallback = fallback || '';
  el.textContent = tr(key, vars || {}, fallback || key);
}

export function clearLocalizedStatus(el, text) {
  if (!el) return;
  delete el.dataset.i18nDynamic;
  delete el.dataset.i18nDynamicVars;
  delete el.dataset.i18nDynamicFallback;
  el.textContent = text || '';
}
