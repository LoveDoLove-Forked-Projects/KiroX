/** @file 代理列表搜索、筛选与选中状态。 */

import { tr } from '../i18n/index.js';
import { proxyState } from './state.js';
import { renderIpTable } from './table.js';

export function selectedIpIds() {
  return Object.keys(proxyState.selected).filter(function (k) {
    return proxyState.selected[k];
  });
}

export function onIpSearch() {
  clearTimeout(proxyState.searchTimer);
  proxyState.searchTimer = setTimeout(renderIpList, 300);
}

export function ipSearchHay(p) {
  return [p.url, p.probeIp, p.probeCountry, p.probeType, p.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function dropdownValue(id) {
  const el = document.getElementById(id);
  return el && el.dataset ? el.dataset.value || '' : '';
}

export function onIpFilterStatus() {
  renderIpList();
}

export function renderIpList() {
  const box = document.getElementById('ip-list');
  const empty = document.getElementById('ip-empty');
  if (!box) return;
  if (proxyState.listLoading) {
    if (empty) empty.style.display = 'none';
    box.innerHTML = '<div class="ip-loading-message">' + tr('ip.loading', '加载中...') + '</div>';
    return;
  }
  const q = (document.getElementById('ip-search').value || '').toLowerCase().trim();
  const fstatus = dropdownValue('ip-filter-status');
  const rows = proxyState.pool.filter(function (p) {
    if (q) {
      if (ipSearchHay(p).indexOf(q) < 0) return false;
    }
    if (fstatus === 'enabled' && !p.enabled) return false;
    if (fstatus === 'disabled' && p.enabled) return false;
    return true;
  });
  if (empty) empty.style.display = rows.length ? 'none' : 'block';
  box.innerHTML = renderIpTable(rows);
}

export function toggleIpSelect(id, el) {
  proxyState.selected[id] = el.checked;
}

export function toggleIpSelectAll(el) {
  const q = (document.getElementById('ip-search').value || '').toLowerCase().trim();
  const fstatus = dropdownValue('ip-filter-status');
  proxyState.pool.forEach(function (p) {
    let visible = true;
    if (q && ipSearchHay(p).indexOf(q) < 0) visible = false;
    if (fstatus === 'enabled' && !p.enabled) visible = false;
    if (fstatus === 'disabled' && p.enabled) visible = false;
    if (visible) proxyState.selected[p.id] = el.checked;
  });
  renderIpList();
}
