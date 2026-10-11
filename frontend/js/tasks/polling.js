/** @file 任务状态与日志轮询的显式启动。 */

import { getAppApi } from '../platform/wails.js';

import { updateUIStatus } from './dialog.js';
import { renderUnifiedLogs } from './logs.js';
import { notifyTaskComplete } from './notifications.js';
import { taskState } from './state.js';

export function formatTime(seconds) {
  seconds = Math.round(seconds);
  if (seconds < 60) return seconds + 's';
  let m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return m + 'm ' + s + 's';
  const h = Math.floor(m / 60);
  m = m % 60;
  return h + 'h ' + m + 'm';
}

export function startTaskPolling() {
  return setInterval(async function () {
    try {
      const s = await getAppApi().GetStatus();
      updateUIStatus(s.running);
      document.getElementById('ov-kiro-success').textContent = s.success;
      const attempts = s.success + s.failed;
      const successRate = attempts > 0 ? Math.round((s.success / attempts) * 100) : 0;
      document.getElementById('ov-kiro-success-rate').textContent = successRate + '%';
      document.getElementById('st-progress').textContent = s.completed + '/' + s.total;
      document.getElementById('st-success').textContent = s.success;
      document.getElementById('st-failed').textContent = s.failed;
      if (s.elapsed > 0) document.getElementById('st-elapsed').textContent = formatTime(s.elapsed);
      const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      const progressBar = document.getElementById('progress-bar');
      const progressTrack = document.getElementById('progress-track');
      progressBar.style.width = pct + '%';
      progressTrack.setAttribute('aria-valuenow', String(pct));
      progressTrack.classList.toggle('is-running', s.running);

      if (taskState.previousRunning && !s.running && s.completed > 0) {
        notifyTaskComplete('Kiro', s.success, s.failed, s.completed);
      }
      taskState.previousRunning = s.running;

      const dot = document.getElementById('st-dot');
      if (s.running) {
        dot.classList.add('running');
      } else {
        dot.classList.remove('running');
      }

      const avgEl = document.getElementById('st-avg');
      if (s.completed > 0 && s.elapsed > 0) {
        avgEl.textContent = (s.elapsed / s.completed).toFixed(1) + 's';
      } else {
        avgEl.textContent = '-';
      }
    } catch (e) {}
    try {
      const kiroLogs = (await getAppApi().GetLogs()) || [];
      taskState.logs = kiroLogs;
      renderUnifiedLogs();
    } catch (e) {}
  }, 2000);
}
