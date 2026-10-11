/** @file 设置加载、串行保存与保存响应合并。 */

import { getAppApi } from '../platform/wails.js';
import { snapshotAppSettings, settingsHaveChanges } from './snapshot.js';

import { I18N, tr } from '../i18n/index.js';
import {
  collectAppSettings,
  renderAppSetting,
  syncEmailProxyField,
  syncVolumeLabel,
} from './controls.js';
import { updateSettingsDirtyState } from './dirty.js';
import { settingsState } from './state.js';
import { applyThemePreference } from './theme-view.js';
import { showToast } from '../ui/toast.js';

export function renderAppSettings(s) {
  settingsState.appSettings = s;
  Object.keys(settingsState.controls).forEach(function (key) {
    renderAppSetting(key, s[key]);
  });
  applyThemePreference(s.theme);
  syncEmailProxyField();
  syncVolumeLabel();
  settingsState.savedSnapshot = snapshotAppSettings(collectAppSettings());
  updateSettingsDirtyState();
}

export async function loadAppSettings() {
  try {
    const settings = await getAppApi().GetAppSettings();
    renderAppSettings(settings);
    try {
      localStorage.removeItem('kiro-config');
      localStorage.removeItem('kiro-sound');
      localStorage.removeItem('kiro-theme');
    } catch (e) {}
  } catch (e) {
    console.error('[设置] 加载失败:', e);
  }
}

/**
 * 合并保存响应，仅回填提交后未被继续编辑的字段，保留用户的新草稿。
 * @param {Object} settings 后端实际保存的完整设置。
 * @param {Object} submitted 发起请求时的表单快照。
 * @param {string[]} [fields] 快捷操作涉及的字段；省略时合并完整表单。
 */
export function commitAppSettings(settings, submitted, fields) {
  const current = collectAppSettings();
  (fields || Object.keys(settingsState.controls)).forEach(function (key) {
    if (current[key] !== submitted[key]) return;
    renderAppSetting(key, settings[key]);
    if (key === 'theme') applyThemePreference(settings.theme);
    if (key === 'language' && settings.language && I18N) I18N.setLanguage(settings.language);
  });
  settingsState.appSettings = settings;
  settingsState.savedSnapshot = snapshotAppSettings(settings);
  syncEmailProxyField();
  syncVolumeLabel();
  updateSettingsDirtyState();
}

/**
 * 串行提交设置，快捷操作在出队时合并最近的已保存值。
 * @param {Object} submitted 提交时的设置快照。
 * @param {string[]} [fields] 仅需覆盖的字段。
 * @returns {Promise<Object>} 本次保存结果；失败不会阻塞后续写入。
 */
export function queueAppSettingsWrite(submitted, fields) {
  settingsState.pendingWrites++;
  settingsState.saving = true;
  updateSettingsDirtyState();
  const request = settingsState.writeQueue
    .then(async function () {
      let settings = submitted;
      if (fields) {
        settings = Object.assign({}, settingsState.appSettings);
        fields.forEach(function (key) {
          settings[key] = submitted[key];
        });
      }
      const result = await getAppApi().SaveAppSettings(settings);
      if (result.error) throw new Error(result.error);
      commitAppSettings(result.settings, submitted, fields);
      return result;
    })
    .finally(function () {
      settingsState.pendingWrites--;
      settingsState.saving = settingsState.pendingWrites > 0;
      updateSettingsDirtyState();
    });
  settingsState.writeQueue = request.catch(function () {});
  return request;
}

export function persistAppSetting(key, value) {
  const submitted = collectAppSettings();
  submitted[key] = value;
  return queueAppSettingsWrite(submitted, [key]);
}

export async function saveAppSettings() {
  if (settingsState.saving || !settingsHaveChanges()) return;
  try {
    await queueAppSettingsWrite(collectAppSettings());
    showToast(tr('settings.saved', '设置已保存'));
  } catch (e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}
