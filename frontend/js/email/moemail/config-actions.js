/** @file MoeMail 配置添加与删除。 */

import { getAppApi } from '../../platform/wails.js';

import { loadMoeMailConfigs, saveMoeMailConfigStatus } from './config-store.js';
import { generateMoeMailName, updateMoeMailUI } from './config-view.js';
import { moemailState } from './state.js';
import { tr } from '../../i18n/index.js';
import { showConfirmModal } from '../../ui/confirm.js';
import { clearLocalizedStatus, setInlineTestButton } from '../../ui/status.js';
import { showToast } from '../../ui/toast.js';

export async function inlineAddMoeMail() {
  let name = document.getElementById('moemail-inline-name').value.trim();
  const url = document.getElementById('moemail-inline-url').value.trim();
  const apikey = document.getElementById('moemail-inline-apikey').value.trim();
  if (!url || !apikey) {
    showToast(tr('moemail.requiredUrlKey', '请填写 API URL 和 API Key'), 'error');
    return;
  }
  if (!name) {
    name = generateMoeMailName();
  }
  if (moemailState.configs.some((c) => c.name === name)) {
    showToast(tr('moemail.nameExists', '配置名称已存在'), 'error');
    return;
  }

  const btn = document.getElementById('moemail-inline-test-btn');
  const statusEl = document.getElementById('moemail-inline-status');
  setInlineTestButton(btn, true, 'moemail.testing');
  if (statusEl) {
    statusEl.style.color = '';
    clearLocalizedStatus(statusEl);
  }

  let testResult;
  try {
    testResult = await getAppApi().TestMoeMailConnection(
      JSON.stringify({ url: url, apiKey: apikey }),
    );
  } catch (e) {
    testResult = { error: String(e) };
  } finally {
    setInlineTestButton(btn, false, 'moemail.testing');
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

  moemailState.configs.push({ name: name, url: url, apiKey: apikey });
  const saveResult = await getAppApi().SaveMoeMailConfigs(JSON.stringify(moemailState.configs));
  if (saveResult.error) {
    moemailState.configs.pop();
    showToast(tr('toast.operationFailed', '保存失败') + ': ' + saveResult.error, 'error');
    return;
  }

  moemailState.configStatus[name] = {
    tested: true,
    success: true,
    domains: testResult.domains || [],
  };
  saveMoeMailConfigStatus();

  document.getElementById('moemail-inline-name').value = '';
  document.getElementById('moemail-inline-url').value = '';
  document.getElementById('moemail-inline-apikey').value = '';
  if (statusEl) {
    statusEl.style.color = 'var(--success)';
    clearLocalizedStatus(statusEl);
  }
  showToast(tr('moemail.addedNamed', { name: name }, '已添加: {name}'));
  updateMoeMailUI();
}

export async function deleteMoeMailConfig(index) {
  if (index < 0 || index >= moemailState.configs.length) return;

  const configName = moemailState.configs[index].name;
  showConfirmModal(
    tr('moemail.deleteConfigTitle', '删除配置'),
    tr('moemail.deleteConfigMsg', { name: configName }, '确认删除配置 "{name}" 吗？'),
    tr('accounts.deleteConfirm', '确认删除'),
    async function () {
      moemailState.configs.splice(index, 1);

      try {
        const result = await getAppApi().SaveMoeMailConfigs(JSON.stringify(moemailState.configs));
        if (result.error) {
          showToast(tr('toast.deleteFailed', '删除失败') + ': ' + result.error, 'error');
          await loadMoeMailConfigs();
          return;
        }

        updateMoeMailUI();
        showToast(tr('toast.deleteOk', '删除成功'), 'success');
      } catch (e) {
        showToast(tr('toast.deleteFailed', '删除失败') + ': ' + e, 'error');
        await loadMoeMailConfigs();
      }
    },
  );
}
