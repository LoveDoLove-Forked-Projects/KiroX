/** @file 现有任务表单到后端配置的数据映射。 */

import { selectionState } from '../email/selection-state.js';
import { moemailState } from '../email/moemail/state.js';
import { cloudmailState } from '../email/cloudmail/state.js';

export function getFormConfig() {
  const config = {
    count: parseInt(document.getElementById('cfg-count').value) || 1,
    concurrency: parseInt(document.getElementById('cfg-concurrency').value) || 1,
    delay: parseInt(document.getElementById('cfg-delay').value) || 3,
    emailProvider: selectionState.provider || 'outlook',
    proxy: ((document.getElementById('cfg-proxy-select') || {}).dataset || {}).value || '',
    proxyConfigured: true,
  };

  if (config.emailProvider === 'moemail') {
    if (!moemailState.selectedDomains || moemailState.selectedDomains.length === 0) {
      throw new Error('请选择至少一个域名或选择随机/全部');
    }

    if (
      moemailState.selectedDomains.includes('__random__') ||
      moemailState.selectedDomains.includes('__all__')
    ) {
      config.moemailDomains = moemailState.domains.map((item) => item.domain);
      config.moemailConfigs = {};
      moemailState.domains.forEach((item) => {
        config.moemailConfigs[item.domain] = item.configs;
      });

      config.moemailRandomMode = moemailState.selectedDomains.includes('__random__');
    } else {
      config.moemailDomains = moemailState.selectedDomains;
      config.moemailConfigs = {};
      moemailState.selectedDomains.forEach((domain) => {
        const item = moemailState.domains.find((d) => d.domain === domain);
        if (item) {
          config.moemailConfigs[domain] = item.configs;
        }
      });
      config.moemailRandomMode = false;
    }
  }

  if (config.emailProvider === 'cloudmail') {
    if (!cloudmailState.selectedDomains || cloudmailState.selectedDomains.length === 0) {
      throw new Error('请选择至少一个 Cloud-Mail 域名');
    }

    if (
      cloudmailState.selectedDomains.includes('__random__') ||
      cloudmailState.selectedDomains.includes('__all__')
    ) {
      config.cloudmailDomains = cloudmailState.domains.map((item) => item.domain);
      config.cloudmailConfigs = {};
      cloudmailState.domains.forEach((item) => {
        config.cloudmailConfigs[item.domain] = item.configs;
      });
      config.cloudmailRandomMode = cloudmailState.selectedDomains.includes('__random__');
    } else {
      config.cloudmailDomains = cloudmailState.selectedDomains;
      config.cloudmailConfigs = {};
      cloudmailState.selectedDomains.forEach((domain) => {
        const item = cloudmailState.domains.find((d) => d.domain === domain);
        if (item) {
          config.cloudmailConfigs[domain] = item.configs;
        }
      });
      config.cloudmailRandomMode = false;
    }
  }
  if (config.emailProvider === 'mailnest') {
    config.mailNestConfig = {
      apiKey: document.getElementById('mailnest-inline-apikey').value,
      projectCode: document.getElementById('mailnest-inline-project-code').value,
    };
  }
  return config;
}
