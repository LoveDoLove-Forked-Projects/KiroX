/** @file 后端日志的语言转换、级别识别与分段高亮。 */

import { I18N } from '../i18n/index.js';

export function escapeLogHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 按原始中文判定日志级别，再翻译并转义，避免语言切换改变高亮结果。
 * @param {string} line 后端日志行。
 * @returns {string} 可直接插入日志容器的安全 HTML 片段。
 */
export function formatLogLine(line) {
  const raw = line.replace(/\r?\n$/, '');
  if (!raw) return '';

  const low = raw.toLowerCase();
  let cls = 'log-line';
  if (raw.indexOf('注册成功') >= 0 || raw.indexOf('已验活') >= 0 || raw.indexOf('[OK]') >= 0) {
    cls += ' log-line-success';
  } else if (
    raw.indexOf('失败') >= 0 ||
    raw.indexOf('错误') >= 0 ||
    raw.indexOf('异常') >= 0 ||
    raw.indexOf('被拦截') >= 0 ||
    raw.indexOf('被封') >= 0 ||
    low.indexOf('error') >= 0 ||
    low.indexOf('failed') >= 0
  ) {
    cls += ' log-line-error';
  } else if (raw.indexOf('⚠') >= 0 || raw.indexOf('熔断') >= 0 || raw.indexOf('重试') >= 0) {
    cls += ' log-line-warn';
  } else if (raw.indexOf('[DEBUG]') >= 0) {
    cls += ' log-line-debug';
  }

  let display = raw;
  if (I18N && typeof I18N.translateLog === 'function') {
    display = I18N.translateLog(raw);
  }

  let html = '';
  let rest = display;

  const m = rest.match(/^(\d{2}:\d{2}:\d{2})\s*/);
  if (m) {
    html += '<span class="log-time">' + escapeLogHtml(m[1]) + '</span>';
    rest = rest.slice(m[0].length);
  }

  while (true) {
    const t = rest.match(/^(\[[^\]]+\])\s*/);
    if (!t) break;
    const label = t[1];

    const inner = label.slice(1, -1);
    const isStep = /^\d+(\.\d+)?(\/\d+)?$/.test(inner);
    html +=
      '<span class="' + (isStep ? 'log-step' : 'log-tag') + '">' + escapeLogHtml(label) + '</span>';
    rest = rest.slice(t[0].length);
  }

  html += escapeLogHtml(rest);
  return '<span class="' + cls + '">' + html + '</span>';
}
