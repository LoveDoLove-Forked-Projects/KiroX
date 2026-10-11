/** @file Outlook 邮箱列表与分页控件渲染。 */

import { outlookState } from './state.js';
import { tr } from '../../i18n/index.js';

export function renderOutlookPage() {
  const accounts = outlookState.allAccounts;
  const tbody = document.getElementById('parsed-outlook-body');
  const pager = document.getElementById('outlook-pager');
  const countEl = document.getElementById('outlook-count');

  if (countEl) countEl.textContent = accounts ? accounts.length : 0;

  if (accounts && accounts.length > 0) {
    const total = accounts.length;
    const totalPages = Math.ceil(total / outlookState.pageSize);
    if (outlookState.currentPage > totalPages) outlookState.currentPage = totalPages;
    if (outlookState.currentPage < 1) outlookState.currentPage = 1;

    const start = (outlookState.currentPage - 1) * outlookState.pageSize;
    const end = Math.min(start + outlookState.pageSize, total);
    const pageAccounts = accounts.slice(start, end);

    let html = '';
    pageAccounts.forEach(function (acc, i) {
      const globalIdx = start + i;
      const status = acc.registered
        ? acc.success
          ? tr('status.success', '成功')
          : tr('status.failed', '失败')
        : tr('status.unregistered', '未注册');
      const statusClass = acc.registered ? (acc.success ? 'success' : 'failed') : 'pending';
      const addedTime = acc.addedAt ? acc.addedAt.substring(5, 16) : '-';
      html += '<tr><td>' + (globalIdx + 1) + '</td><td>' + acc.email + '</td>';
      html +=
        '<td class="account-row-status account-row-status--' +
        statusClass +
        '">' +
        status +
        '</td>';
      html += '<td class="account-row-time">' + addedTime + '</td>';
      html +=
        '<td class="account-row-actions"><a class="text-danger" href="#" data-action="deleteOutlookAccount" data-value="' +
        acc.email +
        '">' +
        tr('common.delete', '删除') +
        '</a></td></tr>';
    });
    tbody.innerHTML = html;

    if (totalPages > 1) {
      pager.style.display = 'flex';
      document.getElementById('outlook-pager-info').textContent = tr(
        'accounts.pagerInfo',
        { cur: outlookState.currentPage, total: totalPages, n: total },
        '第 {cur} / {total} 页 (共 {n} 个)',
      );
      document.getElementById('outlook-pager-prev').disabled = outlookState.currentPage <= 1;
      document.getElementById('outlook-pager-next').disabled =
        outlookState.currentPage >= totalPages;
    } else {
      pager.style.display = 'none';
    }
  } else {
    tbody.innerHTML =
      '<tr><td class="account-row-empty" colspan="5">' +
      tr('accounts.emptyRow', '暂无邮箱账号') +
      '</td></tr>';
    pager.style.display = 'none';
  }
}

export function changeOutlookPage(delta) {
  outlookState.currentPage += delta;
  if (outlookState.currentPage < 1) outlookState.currentPage = 1;
  renderOutlookPage();
}
