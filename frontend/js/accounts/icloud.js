/** @file iCloud 邮箱列表的加载、导入与维护。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { showConfirmModal } from '../ui/confirm.js';
import { showToast } from '../ui/toast.js';

const icloudState = {
  accounts: [],
};

export function openAddICloudModal() {
  document.getElementById('add-icloud-modal').classList.add('show');
}

export function closeAddICloudModal() {
  document.getElementById('add-icloud-modal').classList.remove('show');
  document.getElementById('cfg-icloud-data').value = '';
}

export async function addICloudAccounts() {
  const data = document.getElementById('cfg-icloud-data').value.trim();
  if (!data) {
    showToast(tr('accounts.icloudInputRequired', '请先输入 iCloud 账号数据'), 'error');
    return;
  }
  try {
    const result = await getAppApi().AddICloudAccounts(data);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    closeAddICloudModal();
    await loadICloudAccountsList();
    showToast(
      tr(
        'accounts.addedSummary',
        { n: result.added, total: result.total },
        '成功添加 {n} 个账号，当前共 {total} 个',
      ),
    );
  } catch (e) {
    showToast(tr('toast.addFailed', '添加失败') + ': ' + e.message, 'error');
  }
}

export async function importICloudFile() {
  try {
    const filePath = await getAppApi().SelectICloudFile();
    if (!filePath) return;
    const result = await getAppApi().ImportICloudFile(filePath);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    await loadICloudAccountsList();
    closeAddICloudModal();
    showToast(
      tr(
        'accounts.importSummary',
        { n: result.added, total: result.total },
        '成功导入 {n} 个账号，当前共 {total} 个',
      ),
    );
  } catch (e) {
    showToast(tr('accounts.importFailed', '导入失败') + ': ' + e.message, 'error');
  }
}

export async function loadICloudAccountsList() {
  try {
    const accounts = await getAppApi().GetICloudAccounts();
    icloudState.accounts = accounts || [];
    renderICloudPage();
  } catch (e) {
    console.error('加载 iCloud 账号列表失败:', e);
  }
}

export function renderICloudPage() {
  const accounts = icloudState.accounts;
  const tbody = document.getElementById('parsed-icloud-body');
  const countEl = document.getElementById('icloud-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = accounts ? accounts.length : 0;

  if (accounts && accounts.length > 0) {
    let html = '';
    accounts.forEach(function (acc, i) {
      const status = acc.registered
        ? acc.success
          ? tr('status.success', '成功')
          : tr('status.failed', '失败')
        : tr('status.unregistered', '未注册');
      const statusClass = acc.registered ? (acc.success ? 'success' : 'failed') : 'pending';
      const addedTime = acc.addedAt ? acc.addedAt.substring(5, 16) : '-';
      html += '<tr><td>' + (i + 1) + '</td><td>' + acc.email + '</td>';
      html +=
        '<td class="account-row-status account-row-status--' +
        statusClass +
        '">' +
        status +
        '</td>';
      html += '<td class="account-row-time">' + addedTime + '</td>';
      html +=
        '<td class="account-row-actions"><a class="text-danger" href="#" data-action="deleteICloudAccount" data-value="' +
        acc.email +
        '">' +
        tr('common.delete', '删除') +
        '</a></td></tr>';
    });
    tbody.innerHTML = html;
  } else {
    tbody.innerHTML =
      '<tr><td class="account-row-empty" colspan="5">' +
      tr('accounts.emptyRow', '暂无 iCloud 账号') +
      '</td></tr>';
  }
}

export async function deleteICloudAccount(email) {
  showConfirmModal(
    tr('accounts.deleteTitle', '删除账号'),
    tr('accounts.deleteMsg', { email: email }, '确认删除账号 {email} ?'),
    tr('accounts.deleteConfirm', '确认删除'),
    async function () {
      try {
        const result = await getAppApi().DeleteICloudAccount(email);
        if (result.error) {
          showToast(result.error, 'error');
          return;
        }
        showToast(tr('accounts.deletedOne', '账号已删除'));
        await loadICloudAccountsList();
      } catch (e) {
        showToast(tr('toast.deleteFailed', '删除失败') + ': ' + e.message, 'error');
      }
    },
  );
}

export function clearAllICloudAccounts() {
  showConfirmModal(
    tr('accounts.clearICloudTitle', '清空 iCloud 邮箱'),
    tr('accounts.clearICloudMsg', '确认清空所有 iCloud 邮箱账号？此操作不可恢复！'),
    tr('accounts.clearAllConfirm', '确认清空'),
    async function () {
      try {
        const result = await getAppApi().ClearICloudAccounts();
        if (result.error) {
          showToast(result.error, 'error');
          return;
        }
        showToast(tr('accounts.allCleared', '已清空所有账号'));
        await loadICloudAccountsList();
      } catch (e) {
        showToast(tr('toast.clearFailed', '清空失败') + ': ' + e.message, 'error');
      }
    },
  );
}
