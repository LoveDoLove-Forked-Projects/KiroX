/** @file MailNest 连接配置、测试结果与摘要展示。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { clearLocalizedStatus, setInlineTestButton, setLocalizedStatus } from '../ui/status.js';
import { showToast } from '../ui/toast.js';

const mailnestState = {
  config: {},
};

export async function inlineTestMailNest() {
  const apiKey = document.getElementById('mailnest-inline-apikey').value.trim();
  const projectCode = document.getElementById('mailnest-inline-project-code').value.trim();
  if (!projectCode || !apiKey) {
    showToast(tr('mailnest.requiredKeyProjectCodeShort', '请填写 Key 和 项目代码'), 'error');
    return;
  }
  const btn = document.getElementById('mailnest-inline-test-btn');
  const statusEl = document.getElementById('mailnest-inline-status');
  setInlineTestButton(btn, true, 'moemail.testing');
  clearLocalizedStatus(statusEl);
  try {
    const result = await getAppApi().TestMailNestConnection(
      JSON.stringify({
        projectCode: projectCode,
        apiKey: apiKey,
      }),
    );
    if (result.success) {
      statusEl.style.color = 'var(--success)';
      setLocalizedStatus(
        statusEl,
        'mailnest.balance',
        { n: result.balance || 0 },
        '测试成功，余额为 {n}',
      );
    } else {
      statusEl.style.color = 'var(--danger)';
      if (result.error) clearLocalizedStatus(statusEl, result.error);
      else setLocalizedStatus(statusEl, 'moemail.testFailed', {}, '连接失败');
    }
  } catch (e) {
    statusEl.style.color = 'var(--danger)';
    setLocalizedStatus(statusEl, 'moemail.testFailedShort', {}, '测试失败');
  }
  setInlineTestButton(btn, false, 'moemail.testing');
}

export async function inlineAddMailNest() {
  const apiKey = document.getElementById('mailnest-inline-apikey').value.trim();
  const projectCode = document.getElementById('mailnest-inline-project-code').value.trim();
  if (!projectCode || !apiKey) {
    showToast(tr('mailnest.requiredKeyProjectCodeShort', '请填写 Key 和 项目代码'), 'error');
    return;
  }

  const btn = document.getElementById('mailnest-inline-test-btn');
  const statusEl = document.getElementById('mailnest-inline-status');
  setInlineTestButton(btn, true, 'moemail.testing');
  clearLocalizedStatus(statusEl);
  statusEl.style.color = '';
  let testResult;
  try {
    testResult = await getAppApi().TestMailNestConnection(
      JSON.stringify({
        projectCode: projectCode,
        apiKey: apiKey,
      }),
    );
  } catch (e) {
    testResult = { error: String(e) };
  } finally {
    if (btn) {
      setInlineTestButton(btn, false, 'moemail.testing');
    }
  }

  if (!testResult || testResult.error) {
    const errMsg = (testResult && testResult.error) || tr('moemail.testFailedShort', '测试失败');
    if (statusEl) {
      statusEl.style.color = 'var(--danger)';
      clearLocalizedStatus(statusEl, errMsg);
    }
    showToast(tr('moemail.cannotSaveUntilOk', '连接测试未通过，未保存配置：') + errMsg, 'error');
    return;
  }

  mailnestState.config['apiKey'] = apiKey;
  mailnestState.config['projectCode'] = projectCode;
  const saveResult = await getAppApi().SaveMailNestConfig(JSON.stringify(mailnestState.config));
  if (saveResult.error) {
    showToast(tr('toast.operationFailed', '保存失败') + ': ' + saveResult.error, 'error');
    return;
  }

  const summaryEl = document.getElementById('settings-mailnest-summary');
  if (summaryEl) {
    summaryEl.textContent = tr('mailnest.summaryActive', '已配置');
  }
}

export async function loadMailNestConfig() {
  try {
    mailnestState.config = await getAppApi().GetMailNestConfig();
    updateMailNestUI();
  } catch (e) {
    console.error('[MailNest] 加载配置失败:', e);
    mailnestState.config = {};
  }
}

export function updateMailNestUI() {
  if (mailnestState.config.projectCode) {
    document.getElementById('mailnest-inline-apikey').value = mailnestState.config.apiKey;
    document.getElementById('mailnest-inline-project-code').value =
      mailnestState.config.projectCode;
  } else {
    document.getElementById('mailnest-inline-apikey').value = '';
    document.getElementById('mailnest-inline-project-code').value = '';
  }
  updateMailNestSummary();
}

export function updateMailNestSummary() {
  const summaryEl = document.getElementById('settings-mailnest-summary');
  summaryEl.textContent = mailnestState.config.projectCode
    ? tr('mailnest.summaryActive', '已配置')
    : tr('mailnest.summaryNone', '未配置');
}
