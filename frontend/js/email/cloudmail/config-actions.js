/** @file Cloud-Mail 配置添加与删除。 */

import { getAppApi } from '../../platform/wails.js';

import { loadCloudMailConfigs, saveCloudMailConfigStatus } from './config-store.js';
import {
  generateCloudMailName,
  renderCloudMailConfigList,
  updateCloudMailUI,
} from './config-view.js';
import { cloudmailState } from './state.js';
import { tr } from '../../i18n/index.js';
import { showConfirmModal } from '../../ui/confirm.js';
import { clearLocalizedStatus, setInlineTestButton } from '../../ui/status.js';
import { showToast } from '../../ui/toast.js';

export async function inlineAddCloudMail() {
  let name = (document.getElementById('cloudmail-inline-name').value || '').trim();
  const url = (document.getElementById('cloudmail-inline-url').value || '').trim();
  const em = (document.getElementById('cloudmail-inline-email').value || '').trim();
  const pwd = (document.getElementById('cloudmail-inline-password').value || '').trim();

  if (!url || !em || !pwd) {
    showToast(tr('cloudmail.requiredFields', '请填写 URL、管理员邮箱、密码'), 'error');
    return;
  }

  if (!name) name = generateCloudMailName();
  if (cloudmailState.configs.some((c) => c.name === name)) {
    showToast(tr('cloudmail.nameExists', '配置名称已存在'), 'error');
    return;
  }

  const btn = document.getElementById('cloudmail-inline-test-btn');
  const statusEl = document.getElementById('cloudmail-inline-status');
  setInlineTestButton(btn, true, 'cloudmail.testing');
  if (statusEl) {
    statusEl.style.color = '';
    clearLocalizedStatus(statusEl);
  }

  const testPayload = { name: name, url: url, email: em, password: pwd, domains: [] };
  let testResult;
  try {
    testResult = await getAppApi().TestCloudMailConnection(JSON.stringify(testPayload));
  } catch (e) {
    testResult = { error: String(e) };
  } finally {
    setInlineTestButton(btn, false, 'cloudmail.testing');
  }

  if (!testResult || testResult.error) {
    const errMsg = (testResult && testResult.error) || tr('cloudmail.testFailedShort', '测试失败');
    if (statusEl) {
      statusEl.style.color = 'var(--danger)';
      clearLocalizedStatus(statusEl, errMsg);
    }
    showToast(tr('cloudmail.cannotSaveUntilOk', '连接测试未通过，未保存配置：') + errMsg, 'error');
    return;
  }

  const fetchedDomains = testResult.domains || [];
  const newConfig = { name: name, url: url, email: em, password: pwd, domains: fetchedDomains };
  cloudmailState.configs.push(newConfig);
  const saveResult = await getAppApi().SaveCloudMailConfigs(JSON.stringify(cloudmailState.configs));
  if (saveResult.error) {
    cloudmailState.configs.pop();
    showToast(tr('toast.operationFailed', '保存失败') + ': ' + saveResult.error, 'error');
    return;
  }

  cloudmailState.configStatus[name] = { tested: true, success: true, domains: fetchedDomains };
  saveCloudMailConfigStatus();

  document.getElementById('cloudmail-inline-name').value = '';
  document.getElementById('cloudmail-inline-url').value = '';
  document.getElementById('cloudmail-inline-email').value = '';
  document.getElementById('cloudmail-inline-password').value = '';
  if (statusEl) {
    statusEl.style.color = 'var(--success)';
    clearLocalizedStatus(statusEl);
  }

  if (fetchedDomains.length > 0) {
    showToast(
      tr(
        'cloudmail.addedWithDomains',
        { name: name, n: fetchedDomains.length },
        '已添加 {name}，{n} 个域名',
      ),
    );
  } else {
    showToast(tr('cloudmail.addedNamed', { name: name }, '已添加: {name}'));
  }
  renderCloudMailConfigList();
  updateCloudMailUI();
}

export async function deleteCloudMailConfig(index) {
  if (index < 0 || index >= cloudmailState.configs.length) return;
  const configName = cloudmailState.configs[index].name;
  showConfirmModal(
    tr('cloudmail.deleteConfigTitle', '删除配置'),
    tr('cloudmail.deleteConfigMsg', { name: configName }, '确认删除配置 "{name}" 吗？'),
    tr('accounts.deleteConfirm', '确认删除'),
    async function () {
      cloudmailState.configs.splice(index, 1);
      try {
        const result = await getAppApi().SaveCloudMailConfigs(
          JSON.stringify(cloudmailState.configs),
        );
        if (result.error) {
          showToast(tr('toast.deleteFailed', '删除失败') + ': ' + result.error, 'error');
          await loadCloudMailConfigs();
          return;
        }
        delete cloudmailState.configStatus[configName];
        saveCloudMailConfigStatus();
        updateCloudMailUI();
        showToast(tr('toast.deleteOk', '删除成功'), 'success');
      } catch (e) {
        showToast(tr('toast.deleteFailed', '删除失败') + ': ' + e, 'error');
        await loadCloudMailConfigs();
      }
    },
  );
}
