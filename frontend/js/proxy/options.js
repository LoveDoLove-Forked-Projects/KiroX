/** @file 任务表单中可用代理选项的加载。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { parseProxyUrl } from './url.js';
import { setDropdownValue } from '../ui/dropdown.js';
import { escapeHtml } from '../ui/html.js';

export async function loadProxyOptions() {
  const wrap = document.getElementById('cfg-proxy-select');
  const box = document.getElementById('cfg-proxy-select-options');
  if (!wrap || !box) return;
  let list = [];
  try {
    list = await getAppApi().ListProxyPool();
  } catch (e) {}
  const enabled = (list || []).filter(function (p) {
    return p.enabled;
  });
  let html =
    '<div class="dropdown-option" data-value="" data-i18n="ip.direct">' +
    tr('ip.direct', '直连') +
    '</div>';
  enabled.forEach(function (p) {
    const u = parseProxyUrl(p.url);
    const label = p.probeIp || u.host + (u.port ? ':' + u.port : '');
    html +=
      '<div class="dropdown-option" data-value="' +
      escapeHtml(p.url) +
      '">' +
      escapeHtml(label) +
      '</div>';
  });
  box.innerHTML = html;
  setDropdownValue(wrap, '');
}
