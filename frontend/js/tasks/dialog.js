/** @file 任务创建弹窗与操作按钮的运行状态。 */

import { initEmailProviderSelection } from '../email/selection.js';
import { loadProxyOptions } from '../proxy/options.js';

export function updateUIStatus(running) {
  ['btn-start', 'ntm-start'].forEach(function (id) {
    const b = document.getElementById(id);
    if (b) b.disabled = running;
  });
  ['btn-stop'].forEach(function (id) {
    const b = document.getElementById(id);
    if (b) b.disabled = !running;
  });
}

export function openNewTaskModal() {
  if (typeof initEmailProviderSelection === 'function') initEmailProviderSelection();

  if (typeof loadProxyOptions === 'function') loadProxyOptions();
  const m = document.getElementById('new-task-modal');
  if (m) m.classList.add('show');
}

export function closeNewTaskModal() {
  const m = document.getElementById('new-task-modal');
  if (m) m.classList.remove('show');
}
