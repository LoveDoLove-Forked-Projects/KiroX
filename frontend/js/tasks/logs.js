/** @file 运行日志渲染、滚动保持与复制交互。 */

import { tr } from '../i18n/index.js';
import { formatLogLine } from './log-format.js';
import { taskState } from './state.js';
import { showToast } from '../ui/toast.js';

export function renderUnifiedLogs() {
  const box = document.getElementById('unified-log-box');
  if (!box) return;

  if (!box.dataset.copyBound) {
    // 监听器绑定在容器上，日志行被 innerHTML 替换后仍支持点击复制。
    box.addEventListener('click', function (e) {
      const line = e.target.closest('.log-line');
      if (!line || !box.contains(line)) return;

      const sel = window.getSelection && window.getSelection();
      if (sel && sel.toString().length > 0) return;
      const text = line.textContent.replace(/\u00A0/g, ' ').trim();
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(function () {
          line.classList.add('log-copied');
          setTimeout(function () {
            line.classList.remove('log-copied');
          }, 600);
          if (typeof showToast === 'function') showToast(tr('toast.copied', '复制成功'), 'success');
        })
        .catch(function (err) {
          if (typeof showToast === 'function')
            showToast(tr('toast.copyFailed', '复制失败') + ': ' + err.message, 'error');
        });
    });
    box.dataset.copyBound = '1';
  }

  const wasAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 50;

  const logs = taskState.logs || [];
  let html;
  if (!logs.length) {
    html = '<span class="log-empty-message">' + tr('logs.empty', '暂无日志') + '</span>';
  } else {
    html = logs
      .map(function (l) {
        return formatLogLine(l.replace(/^\s+/, ''));
      })
      .join('\n');
  }

  if (box.innerHTML !== html) {
    box.innerHTML = html;
    if (wasAtBottom) box.scrollTop = box.scrollHeight;
  }
}

export function copyLogs() {
  const box = document.getElementById('unified-log-box');
  if (!box) return;

  const logs = taskState.logs || [];
  if (!logs.length) {
    showToast(tr('toast.logEmpty', '暂无日志可复制'), 'error');
    return;
  }
  const text = box.textContent;

  navigator.clipboard
    .writeText(text)
    .then(function () {
      showToast(tr('toast.logCopied', '日志已复制到剪贴板'), 'success');
    })
    .catch(function (e) {
      showToast(tr('toast.copyFailed', '复制失败') + ': ' + e.message, 'error');
    });
}
