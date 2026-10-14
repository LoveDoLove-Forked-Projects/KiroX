/** @file MailNest 连接配置、测试结果与摘要展示。 */

import { getAppApi } from '../platform/wails.js';
import { tr } from '../i18n/index.js';
import { clearLocalizedStatus, setInlineTestButton, setLocalizedStatus } from '../ui/status.js';
import { showToast } from '../ui/toast.js';

const mailnestState = {
  config: {},
  busy: false,
};

function setMailNestBusy(busy) {
  mailnestState.busy = busy;
  setInlineTestButton(document.getElementById('mailnest-inline-test-btn'), busy, 'moemail.testing');
  document.querySelector('[data-action="inlineAddMailNest"]').disabled = busy;
  document.getElementById('mailnest-inline-apikey').disabled = busy;
  document.getElementById('mailnest-inline-project-code').disabled = busy;
}

async function runMailNestAction(save) {
  if (mailnestState.busy) return;
  const config = {
    apiKey: document.getElementById('mailnest-inline-apikey').value.trim(),
    projectCode: document.getElementById('mailnest-inline-project-code').value.trim(),
  };
  if (!config.projectCode || !config.apiKey) {
    showToast(tr('mailnest.requiredKeyProjectCodeShort', '请填写 Key 和 项目代码'), 'error');
    return;
  }

  const statusEl = document.getElementById('mailnest-inline-status');
  clearLocalizedStatus(statusEl);
  statusEl.style.color = '';
  setMailNestBusy(true);
  try {
    const result = await getAppApi().TestMailNestConnection(JSON.stringify(config));
    if (!result || result.success !== true || result.error) {
      throw new Error(result?.error || tr('moemail.testFailedShort', '测试失败'));
    }
    if (save) {
      const saved = await getAppApi().SaveMailNestConfig(JSON.stringify(config));
      if (!saved || saved.success !== true || saved.error) {
        throw new Error(saved?.error || tr('toast.operationFailed', '保存失败'));
      }
      mailnestState.config = config;
      updateMailNestSummary();
    }
    statusEl.style.color = 'var(--success)';
    setLocalizedStatus(
      statusEl,
      'mailnest.balance',
      { n: result.balance ?? 0 },
      '测试成功，余额为 {n}',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    statusEl.style.color = 'var(--danger)';
    clearLocalizedStatus(statusEl, message);
    showToast(message, 'error');
  } finally {
    setMailNestBusy(false);
  }
}

export async function inlineTestMailNest() {
  await runMailNestAction(false);
}

export async function inlineAddMailNest() {
  await runMailNestAction(true);
}

export async function loadMailNestConfig() {
  try {
    mailnestState.config = (await getAppApi().GetMailNestConfig()) || {};
    updateMailNestUI();
  } catch (e) {
    console.error('[MailNest] 加载配置失败:', e);
    mailnestState.config = {};
  }
}

export function updateMailNestUI() {
  document.getElementById('mailnest-inline-apikey').value = mailnestState.config.apiKey || '';
  document.getElementById('mailnest-inline-project-code').value =
    mailnestState.config.projectCode || '';
  updateMailNestSummary();
}

export function updateMailNestSummary() {
  const summaryEl = document.getElementById('settings-mailnest-summary');
  summaryEl.textContent =
    mailnestState.config.projectCode && mailnestState.config.apiKey
      ? tr('mailnest.summaryActive', '已配置')
      : tr('mailnest.summaryNone', '未配置');
}
