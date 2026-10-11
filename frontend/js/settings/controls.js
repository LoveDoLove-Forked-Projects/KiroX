/** @file 设置控件读写、表单收集与关联字段同步。 */

import { settingsState } from './state.js';
import { setDropdownValue } from '../ui/dropdown.js';

export function renderAppSetting(key, value) {
  if (typeof value === 'boolean') setSettingChecked(settingsState.controls[key], value);
  else setSettingValue(settingsState.controls[key], value);
}

export function settingValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  if (el.classList && el.classList.contains('custom-dropdown'))
    return el.dataset.value !== undefined ? el.dataset.value : fallback;
  return el.value;
}

export function settingChecked(id, fallback) {
  const el = document.getElementById(id);
  return el ? el.checked : fallback;
}

export function setSettingValue(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null) return;
  if (
    el.classList &&
    el.classList.contains('custom-dropdown') &&
    typeof setDropdownValue === 'function'
  )
    setDropdownValue(el, String(value));
  else el.value = value;
}

export function setSettingChecked(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

export function collectAppSettings() {
  const s = {};
  s.emailProxyMode = settingValue('setting-email-proxy-mode', 'follow-task');
  s.emailProxy = settingValue('setting-email-proxy', '').trim();
  s.otpTimeoutSeconds = parseInt(settingValue('setting-otp-timeout', 120));
  s.retryProfile = settingValue('setting-retry-profile', 'standard');
  s.stopOnRisk = settingChecked('setting-stop-on-risk', true);
  s.soundEnabled = settingChecked('cfg-sound', true);
  s.desktopNotifications = settingChecked('setting-desktop-notification', true);
  s.soundVolume = parseInt(settingValue('setting-sound-volume', 70));
  s.autoCheckUpdates = settingChecked('setting-auto-update', true);
  s.theme = settingValue('setting-theme', 'system');
  s.language = settingValue('setting-language', 'zh');
  s.persistentLogs = settingChecked('setting-persistent-logs', false);
  s.logRetentionDays = parseInt(settingValue('setting-log-retention', 7));
  s.autoProbeProxies = settingChecked('setting-auto-probe', true);
  s.moeMailExpiryMinutes = parseInt(settingValue('setting-moe-expiry', 60));
  return s;
}

export function syncEmailProxyField() {
  const field = document.getElementById('setting-email-proxy');
  if (field) field.disabled = settingValue('setting-email-proxy-mode', 'follow-task') !== 'custom';
}

export function syncVolumeLabel() {
  const slider = document.getElementById('setting-sound-volume');
  const output = document.getElementById('setting-sound-volume-label');
  const value = Number(settingValue('setting-sound-volume', 70));
  if (slider) slider.style.setProperty('--range-progress', value + '%');
  if (output) output.textContent = value + '%';
}
