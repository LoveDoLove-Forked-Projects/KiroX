/** @file Cloud-Mail 现有连接测试操作与状态反馈。 */

import { getAppApi } from '../../platform/wails.js';

import { saveCloudMailConfigStatus } from './config-store.js';
import { renderCloudMailConfigList, updateCloudMailUI } from './config-view.js';
import { cloudmailState } from './state.js';
import { tr } from '../../i18n/index.js';
import { clearLocalizedStatus, setInlineTestButton, setLocalizedStatus } from '../../ui/status.js';
import { showToast } from '../../ui/toast.js';

export async function inlineTestCloudMail() {
  const url = (document.getElementById('cloudmail-inline-url').value || '').trim();
  const em = (document.getElementById('cloudmail-inline-email').value || '').trim();
  const pwd = (document.getElementById('cloudmail-inline-password').value || '').trim();

  if (!url || !em || !pwd) {
    showToast(tr('cloudmail.requiredFields', '请填写 URL、管理员邮箱、密码'), 'error');
    return;
  }
  const btn = document.getElementById('cloudmail-inline-test-btn');
  const statusEl = document.getElementById('cloudmail-inline-status');
  setInlineTestButton(btn, true, 'cloudmail.testing');
  if (statusEl) clearLocalizedStatus(statusEl);
  try {
    const result = await getAppApi().TestCloudMailConnection(
      JSON.stringify({
        name: 'inline-test',
        url: url,
        email: em,
        password: pwd,
        domains: [],
      }),
    );
    if (result.success) {
      const fetched = result.domains || [];
      if (statusEl) {
        statusEl.style.color = 'var(--success)';
        if (fetched.length > 0) {
          setLocalizedStatus(
            statusEl,
            'cloudmail.connectedDomainsList',
            { d: fetched.join(', ') },
            '连接成功，域名: {d}',
          );
        } else {
          setLocalizedStatus(
            statusEl,
            'cloudmail.connectedNoDomain',
            {},
            '连接成功，但服务器未返回域名（可能开启了 loginDomain 隐私开关）',
          );
        }
      }
    } else {
      if (statusEl) {
        statusEl.style.color = 'var(--danger)';
        if (result.error) clearLocalizedStatus(statusEl, result.error);
        else setLocalizedStatus(statusEl, 'cloudmail.testFailed', {}, '连接失败');
      }
    }
  } catch (e) {
    if (statusEl) {
      statusEl.style.color = 'var(--danger)';
      setLocalizedStatus(statusEl, 'cloudmail.testFailedShort', {}, '测试失败');
    }
  }
  setInlineTestButton(btn, false, 'cloudmail.testing');
}

export async function testCloudMailConfigByIndex(index) {
  if (index < 0 || index >= cloudmailState.configs.length) return;
  const config = cloudmailState.configs[index];
  try {
    const result = await getAppApi().TestCloudMailConnection(JSON.stringify(config));
    if (result.error) {
      cloudmailState.configStatus[config.name] = { tested: true, success: false };
      saveCloudMailConfigStatus();
      renderCloudMailConfigList();
      updateCloudMailUI();
      showToast(config.name + ': ' + result.error, 'error');
    } else {
      const domains = result.domains || [];
      cloudmailState.configStatus[config.name] = { tested: true, success: true, domains: domains };
      saveCloudMailConfigStatus();
      renderCloudMailConfigList();
      updateCloudMailUI();
      if (domains.length > 0) {
        showToast(
          config.name +
            ': ' +
            tr('cloudmail.testOkWithDomains', { n: domains.length }, '连接成功，{n} 个域名'),
          'success',
        );
      } else {
        showToast(
          config.name + ': ' + tr('cloudmail.testOkNoDomain', '连接成功，但服务器未返回域名'),
          'success',
        );
      }
    }
  } catch (e) {
    cloudmailState.configStatus[config.name] = { tested: true, success: false };
    saveCloudMailConfigStatus();
    renderCloudMailConfigList();
    updateCloudMailUI();
    showToast(config.name + ': ' + tr('cloudmail.testFailedShort', '测试失败'), 'error');
  }
}

export async function autoTestAllCloudMailConfigs() {
  if (cloudmailState.configs.length === 0) return;
  console.log('[CloudMail] 启动自动测试，共 ' + cloudmailState.configs.length + ' 个配置');
  for (let i = 0; i < cloudmailState.configs.length; i++) {
    const config = cloudmailState.configs[i];
    try {
      const result = await getAppApi().TestCloudMailConnection(JSON.stringify(config));
      if (result.error) {
        cloudmailState.configStatus[config.name] = { tested: true, success: false };
      } else {
        const domains = result.domains || [];
        cloudmailState.configStatus[config.name] = {
          tested: true,
          success: true,
          domains: domains,
        };
      }
    } catch (e) {
      cloudmailState.configStatus[config.name] = { tested: true, success: false };
    }
  }
  saveCloudMailConfigStatus();
  updateCloudMailUI();
  console.log('[CloudMail] 自动测试完成');
}
