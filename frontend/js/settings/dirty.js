/** @file 设置变更追踪与保存按钮状态。 */

import { settingsHaveChanges } from './snapshot.js';
import { settingsState } from './state.js';

export function updateFloatingSaveButton(hasChanges) {
  const button = document.getElementById('settings-floating-save');
  const headerButton = document.getElementById('settings-save-button');
  const scrollRoot = document.querySelector('.app-content');
  if (!button || !headerButton || !scrollRoot) return;
  const page = document.getElementById('page-settings');
  const rootRect = scrollRoot.getBoundingClientRect();
  const headerRect = headerButton.getBoundingClientRect();
  const headerHasScrolledAway = headerRect.bottom < rootRect.top + 12;
  button.classList.toggle(
    'is-visible',
    !!hasChanges && !!page && page.classList.contains('active') && headerHasScrolledAway,
  );
}

export function updateSettingsDirtyState() {
  const hasChanges = settingsHaveChanges();
  const headerButton = document.getElementById('settings-save-button');
  const floatingButton = document.getElementById('settings-floating-save');
  if (headerButton) headerButton.disabled = !hasChanges || settingsState.saving;
  if (floatingButton) floatingButton.disabled = !hasChanges || settingsState.saving;
  updateFloatingSaveButton(hasChanges);
}

export function initSettingsChangeTracking() {
  const page = document.getElementById('page-settings');
  const scrollRoot = document.querySelector('.app-content');
  if (!page || page.dataset.changeTracking === 'true') return;
  page.dataset.changeTracking = 'true';
  page.addEventListener('input', updateSettingsDirtyState);
  page.addEventListener('change', updateSettingsDirtyState);
  if (scrollRoot)
    scrollRoot.addEventListener('scroll', updateSettingsDirtyState, { passive: true });
  window.addEventListener('resize', updateSettingsDirtyState);
  updateSettingsDirtyState();
}
