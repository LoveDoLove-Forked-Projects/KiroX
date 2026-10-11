/** @file 桌面窗口关闭、最小化与最大化操作。 */

import { getRuntime } from '../platform/wails.js';

export function closeApp() {
  try {
    if (getRuntime() && getRuntime().Quit) {
      getRuntime().Quit();
    } else {
      window.close();
    }
  } catch (e) {
    console.error('关闭窗口失败:', e);
  }
}

export function minimizeApp() {
  try {
    if (getRuntime() && getRuntime().WindowMinimise) {
      getRuntime().WindowMinimise();
    }
  } catch (e) {
    console.error('最小化窗口失败:', e);
  }
}

export function maximizeApp() {
  try {
    if (getRuntime() && getRuntime().WindowToggleMaximise) {
      getRuntime().WindowToggleMaximise();
    }
  } catch (e) {
    console.error('最大化窗口失败:', e);
  }
}
