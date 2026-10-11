/** @file 代理表格与行操作的声明式渲染。 */

import { tr } from '../i18n/index.js';
import { errorBadge, flagImg, successBadge, typeBadge } from './badges.js';
import { proxyState } from './state.js';
import { parseProxyUrl } from './url.js';
import { escapeHtml } from '../ui/html.js';

export function renderIpTable(rows) {
  const allSel =
    rows.length > 0 &&
    rows.every(function (p) {
      return proxyState.selected[p.id];
    });
  let h = '<table class="ip-table">';
  h +=
    '<thead><tr class="ip-table-row">' +
    '<th class="ip-table-select-heading"><input type="checkbox" ' +
    (allSel ? 'checked' : '') +
    ' data-action="toggleIpSelectAll"></th>' +
    '<th class="ip-table-heading">' +
    tr('ip.colAddress', '地址') +
    '</th>' +
    '<th class="ip-table-type-heading">' +
    tr('ip.colType', '类型') +
    '</th>' +
    '<th class="ip-table-heading">' +
    tr('ip.colLocation', '位置') +
    '</th>' +
    '<th class="ip-table-latency-heading">' +
    tr('ip.colLatency', '延迟') +
    '</th>' +
    '<th class="ip-table-status-heading">' +
    tr('ip.colStatus', '状态') +
    '</th>' +
    '<th class="ip-table-actions-heading">' +
    tr('ip.colActions', '操作') +
    '</th>' +
    '</tr></thead><tbody>';
  rows.forEach(function (p) {
    h += renderIpRow(p);
  });
  h += '</tbody></table>';
  return h;
}

export function renderIpRow(p) {
  const u = parseProxyUrl(p.url);
  const id = p.id;
  const chk = proxyState.selected[id] ? 'checked' : '';
  const addr = u.host + (u.port ? ':' + u.port : '');
  const probing = !!proxyState.probing[id];
  const sk = '<span class="ip-skel"></span>';

  let addrCell;
  if (probing) {
    addrCell = '<span class="ip-skel wide"></span>';
  } else {
    const exitIp = p.probeOk && p.probeIp ? p.probeIp : addr;
    addrCell =
      '<span class="ip-table-address" title="' +
      escapeHtml(addr) +
      '">' +
      escapeHtml(exitIp) +
      '</span>';
  }

  const typeCell = probing
    ? sk
    : p.probeOk && p.probeType
      ? typeBadge(p.probeType, tr('ip.type.' + p.probeType, p.probeType))
      : '—';

  const loc = probing
    ? sk
    : p.probeOk
      ? flagImg(p.probeCountryCode) + ' ' + escapeHtml(p.probeCountry || '')
      : '—';

  let lat = '—';
  if (probing) lat = sk;
  else if (p.probeOk) lat = successBadge(p.probeMs ? p.probeMs + 'ms' : tr('ip.available', '可用'));
  else if (p.probeAt) lat = errorBadge(tr('ip.failure', '失败'));

  const toggleHtml =
    '<label class="toggle-switch" title="' +
    (p.enabled ? tr('ip.enabled', '启用') : tr('ip.disabled', '停用')) +
    '">' +
    '<input type="checkbox" ' +
    (p.enabled ? 'checked' : '') +
    ' data-change-action="toggleIpEnabled" data-value="' +
    id +
    '">' +
    '<span class="toggle-slider"></span></label>';

  const ops =
    '<button type="button" class="btn btn-secondary btn-sm" data-action="testIpEntry" data-value="' +
    id +
    '">' +
    tr('ip.test', '测试') +
    '</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-action="editIpEntry" data-value="' +
    id +
    '">' +
    tr('ip.edit', '编辑') +
    '</button>' +
    '<button type="button" class="btn btn-secondary btn-sm text-danger" data-action="deleteIpEntry" data-value="' +
    id +
    '">' +
    tr('ip.delete', '删除') +
    '</button>';

  return (
    '<tr class="ip-table-row">' +
    '<td class="ip-table-cell-center"><input type="checkbox" ' +
    chk +
    ' data-action="toggleIpSelect" data-value="' +
    id +
    '"></td>' +
    '<td class="ip-table-cell"><div class="ip-table-address-wrap">' +
    addrCell +
    '</div></td>' +
    '<td class="ip-table-cell-center-nowrap">' +
    typeCell +
    '</td>' +
    '<td class="ip-table-cell-nowrap">' +
    loc +
    '</td>' +
    '<td class="ip-table-cell-center-nowrap">' +
    lat +
    '</td>' +
    '<td class="ip-table-cell-center">' +
    toggleHtml +
    '</td>' +
    '<td class="ip-table-cell-actions">' +
    ops +
    '</td>' +
    '</tr>'
  );
}
