/** @file 主题快捷切换动画与偏好持久化。 */

import { getAppApi } from '../platform/wails.js';
import { applyThemePreference } from './theme-view.js';

import { setSettingValue } from './controls.js';
import { updateSettingsDirtyState } from './dirty.js';
import { persistAppSetting } from './persistence.js';
import { settingsState } from './state.js';

export function toggleTheme() {
  const lockStyle = document.createElement('style');
  lockStyle.textContent = '*, *::before, *::after { transition-duration: 0s !important; }';
  document.head.appendChild(lockStyle);

  const applyTheme = function () {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyThemePreference(theme);
    setSettingValue('setting-theme', theme);
    updateSettingsDirtyState();
    if (settingsState.appSettings && getAppApi() && getAppApi().SaveAppSettings) {
      persistAppSetting('theme', theme).catch(function () {});
    }
  };

  const unlockTransitions = function () {
    setTimeout(function () {
      lockStyle.remove();
    }, 100);
  };

  if (!document.startViewTransition) {
    applyTheme();
    unlockTransitions();
    return;
  }

  const transition = document.startViewTransition(applyTheme);
  transition.finished.then(unlockTransitions);
  transition.ready.then(function () {
    const clientX = 0;
    const clientY = innerHeight;
    const radius = Math.hypot(
      Math.max(clientX, innerWidth - clientX),
      Math.max(clientY, innerHeight - clientY),
    );
    document.documentElement.animate(
      {
        clipPath: [
          'circle(0% at ' + clientX + 'px ' + clientY + 'px)',
          'circle(' + radius + 'px at ' + clientX + 'px ' + clientY + 'px)',
        ],
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  });
}
