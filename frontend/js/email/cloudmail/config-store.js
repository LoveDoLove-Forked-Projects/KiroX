/** @file Cloud-Mail 配置加载与本地测试状态存取。 */

import { getAppApi } from '../../platform/wails.js';

import { updateCloudMailUI } from './config-view.js';
import { cloudmailState } from './state.js';

export async function loadCloudMailConfigs() {
  try {
    const configs = await getAppApi().GetCloudMailConfigs();
    cloudmailState.configs = configs || [];
    loadCloudMailConfigStatus();
    updateCloudMailUI();
    return configs;
  } catch (e) {
    console.error('[CloudMail] 加载配置失败:', e);
    cloudmailState.configs = [];
    return [];
  }
}

export function loadCloudMailConfigStatus() {
  try {
    const saved = localStorage.getItem('cloudmail-config-status');
    if (saved) {
      cloudmailState.configStatus = JSON.parse(saved);
    }
  } catch (e) {
    cloudmailState.configStatus = {};
  }
}

export function saveCloudMailConfigStatus() {
  try {
    localStorage.setItem('cloudmail-config-status', JSON.stringify(cloudmailState.configStatus));
  } catch (e) {}
}
