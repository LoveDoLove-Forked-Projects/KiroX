/** @file 语言变化后重新渲染动态内容。 */

import { renderICloudPage } from '../accounts/icloud.js';
import { renderOutlookPage } from '../accounts/outlook/view.js';
import { updateCloudMailUI } from '../email/cloudmail/config-view.js';
import { renderCloudMailDomains } from '../email/cloudmail/domains.js';
import { updateMailNestSummary } from '../email/mailnest.js';
import { updateMoeMailUI } from '../email/moemail/config-view.js';
import { renderMoeMailDomains } from '../email/moemail/domains.js';
import { tr } from '../i18n/index.js';
import { renderIpList } from '../proxy/list.js';
import { showIpResultModal } from '../proxy/result.js';
import { proxyState } from '../proxy/state.js';
import { renderUnifiedLogs } from '../tasks/logs.js';
import { setInlineTestButton } from '../ui/status.js';

export function registerLanguageRefreshHandlers() {
  window.addEventListener('i18n:changed', function () {
    try {
      if (typeof renderOutlookPage === 'function') renderOutlookPage();
    } catch (e) {}
    try {
      if (typeof renderICloudPage === 'function') renderICloudPage();
    } catch (e) {}
  });
  window.addEventListener('i18n:changed', function () {
    try {
      if (typeof updateCloudMailUI === 'function') updateCloudMailUI();
    } catch (e) {}
    const btn = document.getElementById('cloudmail-inline-test-btn');
    if (btn) setInlineTestButton(btn, btn.disabled, 'cloudmail.testing');
  });
  window.addEventListener('i18n:changed', function () {
    renderIpList();
    const form = document.getElementById('ip-form-modal');
    const formTitle = document.getElementById('ip-form-title');
    if (form && form.classList.contains('show') && formTitle) {
      formTitle.textContent =
        proxyState.formMode === 'edit'
          ? tr('ip.editTitle', '编辑代理')
          : tr('ip.addTitle', '添加代理');
    }
    const resultModal = document.getElementById('ip-result-modal');
    if (proxyState.resultView && resultModal && resultModal.classList.contains('show')) {
      showIpResultModal(proxyState.resultView.proxy, proxyState.resultView.result);
    }
  });
  window.addEventListener('i18n:changed', function () {
    try {
      updateMailNestSummary();
    } catch (e) {}
    const btn = document.getElementById('mailnest-inline-test-btn');
    if (btn) setInlineTestButton(btn, btn.disabled, 'moemail.testing');
  });
  window.addEventListener('i18n:changed', function () {
    try {
      if (typeof updateMoeMailUI === 'function') updateMoeMailUI();
    } catch (e) {}
    const btn = document.getElementById('moemail-inline-test-btn');
    if (btn) setInlineTestButton(btn, btn.disabled, 'moemail.testing');
  });
  window.addEventListener('i18n:changed', function () {
    if (typeof renderUnifiedLogs === 'function') renderUnifiedLogs();
  });
  window.addEventListener('i18n:changed', function () {
    renderMoeMailDomains();
    renderCloudMailDomains();
    document.querySelectorAll('[data-i18n-dynamic]').forEach(function (el) {
      let vars = {};
      try {
        vars = JSON.parse(el.dataset.i18nDynamicVars || '{}');
      } catch (e) {}
      el.textContent = tr(
        el.dataset.i18nDynamic,
        vars,
        el.dataset.i18nDynamicFallback || el.dataset.i18nDynamic,
      );
    });
  });
}
