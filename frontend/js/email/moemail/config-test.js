/** @file MoeMail 现有连接测试操作与状态反馈。 */

import { getAppApi } from '../../platform/wails.js';

import { saveMoeMailConfigStatus } from './config-store.js';
import { renderMoeMailConfigList, updateMoeMailUI } from './config-view.js';
import { moemailState } from './state.js';
import { tr } from '../../i18n/index.js';
import { clearLocalizedStatus, setInlineTestButton, setLocalizedStatus } from '../../ui/status.js';
import { showToast } from '../../ui/toast.js';

export async function inlineTestMoeMail() {
  const url = document.getElementById('moemail-inline-url').value.trim();
  const apikey = document.getElementById('moemail-inline-apikey').value.trim();
  if (!url || !apikey) {
    showToast(tr('moemail.requiredUrlKeyShort', '请填写 API URL 和 Key'), 'error');
    return;
  }
  const btn = document.getElementById('moemail-inline-test-btn');
  const statusEl = document.getElementById('moemail-inline-status');
  setInlineTestButton(btn, true, 'moemail.testing');
  clearLocalizedStatus(statusEl);
  try {
    const result = await getAppApi().TestMoeMailConnection(
      JSON.stringify({ url: url, apiKey: apikey }),
    );
    if (result.success) {
      statusEl.style.color = 'var(--success)';
      setLocalizedStatus(
        statusEl,
        'moemail.connectedDomains',
        { n: result.domainCount || 0 },
        '连接成功，{n} 个域名',
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

export async function testMoeMailConfigByIndex(index) {
  if (index < 0 || index >= moemailState.configs.length) return;

  const config = moemailState.configs[index];
  try {
    const result = await getAppApi().TestMoeMailConnection(JSON.stringify(config));
    if (result.error) {
      moemailState.configStatus[config.name] = { tested: true, success: false, domains: [] };
      saveMoeMailConfigStatus();
      renderMoeMailConfigList();
      updateMoeMailUI();

      let errorMsg = result.error;
      if (errorMsg.includes('403')) {
        errorMsg = tr('moemail.err403Short', 'API Key 权限不足');
      } else if (errorMsg.includes('401')) {
        errorMsg = tr('moemail.err401Short', 'API Key 无效');
      } else if (errorMsg.includes('404')) {
        errorMsg = tr('moemail.err404Short', 'API 地址错误');
      } else if (errorMsg.includes('timeout') || errorMsg.includes('连接')) {
        errorMsg = tr('moemail.errTimeoutShort', '连接超时');
      }
      showToast(config.name + ': ' + errorMsg, 'error');
    } else {
      const domains = result.domains || [];
      moemailState.configStatus[config.name] = {
        tested: true,
        success: true,
        domains: domains,
        domainCount: domains.length,
      };
      saveMoeMailConfigStatus();
      renderMoeMailConfigList();
      updateMoeMailUI();

      if (domains.length > 0) {
        showToast(
          config.name +
            ': ' +
            tr('moemail.testOkWithDomains', { n: domains.length }, '连接成功，可用域名 {n} 个'),
          'success',
        );
      } else {
        showToast(
          config.name + ': ' + tr('moemail.testOkNoDomain', '连接成功，但未返回可用域名'),
          'warning',
        );
      }
    }
  } catch (e) {
    moemailState.configStatus[config.name] = { tested: true, success: false, domains: [] };
    saveMoeMailConfigStatus();
    renderMoeMailConfigList();
    updateMoeMailUI();
    showToast(config.name + ': ' + tr('moemail.testFailedShort', '测试失败'), 'error');
  }
}

export async function autoTestAllMoeMailConfigs() {
  if (moemailState.configs.length === 0) return;
  console.log('[MoeMail] 启动自动测试，共 ' + moemailState.configs.length + ' 个配置');
  for (let i = 0; i < moemailState.configs.length; i++) {
    const config = moemailState.configs[i];
    try {
      const result = await getAppApi().TestMoeMailConnection(JSON.stringify(config));
      if (result.error) {
        moemailState.configStatus[config.name] = { tested: true, success: false, domains: [] };
      } else {
        const domains = result.domains || [];
        moemailState.configStatus[config.name] = {
          tested: true,
          success: true,
          domains: domains,
          domainCount: domains.length,
        };
      }
    } catch (e) {
      moemailState.configStatus[config.name] = { tested: true, success: false, domains: [] };
    }
  }
  saveMoeMailConfigStatus();
  updateMoeMailUI();
  console.log('[MoeMail] 自动测试完成');
}
