/** @file 任务操作快捷键的显式注册。 */

import { startTask, stopTask } from '../tasks/controller.js';

export function registerKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (!document.getElementById('btn-start').disabled) startTask();
    }

    if (e.key === 'Escape') {
      if (!document.getElementById('btn-stop').disabled) stopTask();
    }
  });
}
