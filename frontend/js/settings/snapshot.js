/** @file 设置快照序列化与未保存变更判定。 */

import { settingsState } from './state.js';
import { collectAppSettings } from './controls.js';
export function snapshotAppSettings(settings) {
  const ordered = {};
  Object.keys(settings || {})
    .sort()
    .forEach(function (key) {
      ordered[key] = settings[key];
    });
  return JSON.stringify(ordered);
}

export function settingsHaveChanges() {
  if (settingsState.savedSnapshot === null || !settingsState.appSettings) return false;
  return snapshotAppSettings(collectAppSettings()) !== settingsState.savedSnapshot;
}
