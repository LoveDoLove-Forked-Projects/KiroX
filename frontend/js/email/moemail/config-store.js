/** @file MoeMail 配置加载与本地测试状态存取。 */

import { getAppApi } from '../../platform/wails.js';

import { updateMoeMailUI } from './config-view.js';
import { moemailState } from './state.js';

export async function loadMoeMailConfigs() {
  try {
    const configs = await getAppApi().GetMoeMailConfigs();
    moemailState.configs = configs || [];

    loadMoeMailConfigStatus();
    updateMoeMailUI();
    return configs;
  } catch (e) {
    console.error('[MoeMail] 加载配置失败:', e);
    moemailState.configs = [];
    return [];
  }
}

export function loadMoeMailConfigStatus() {
  try {
    const saved = localStorage.getItem('moemail-config-status');
    if (saved) {
      moemailState.configStatus = JSON.parse(saved);
    }
  } catch (e) {
    console.error('[MoeMail] 加载状态失败:', e);
    moemailState.configStatus = {};
  }
}

export function saveMoeMailConfigStatus() {
  try {
    localStorage.setItem('moemail-config-status', JSON.stringify(moemailState.configStatus));
  } catch (e) {
    console.error('[MoeMail] 保存状态失败:', e);
  }
}
