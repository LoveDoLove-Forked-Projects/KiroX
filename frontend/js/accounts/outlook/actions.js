/** @file Outlook 邮箱的删除与批量清理确认。 */

import { getAppApi } from '../../platform/wails.js';

import { loadOutlookAccountsList } from './accounts.js';
import { outlookState } from './state.js';
import { tr } from '../../i18n/index.js';
import { showConfirmModal } from '../../ui/confirm.js';
import { showToast } from '../../ui/toast.js';

export async function deleteOutlookAccount(email) {
  showConfirmModal(
    tr('accounts.deleteTitle', '删除账号'),
    tr('accounts.deleteMsg', { email: email }, '确认删除账号 {email} ?'),
    tr('accounts.deleteConfirm', '确认删除'),
    async function () {
      try {
        const result = await getAppApi().DeleteOutlookAccount(email);
        if (result.error) {
          showToast(result.error, 'error');
          return;
        }
        showToast(tr('accounts.deletedOne', '账号已删除'));
        await loadOutlookAccountsList();
      } catch (e) {
        showToast(tr('toast.deleteFailed', '删除失败') + ': ' + e.message, 'error');
      }
    },
  );
}

export function clearAllOutlookAccounts() {
  showConfirmModal(
    tr('accounts.clearAllTitle', '清空微软邮箱'),
    tr('accounts.clearAllMsg', '确认清空所有微软邮箱账号？此操作不可恢复！'),
    tr('accounts.clearAllConfirm', '确认清空'),
    async function () {
      try {
        const result = await getAppApi().ClearOutlookAccounts();
        if (result.error) {
          showToast(result.error, 'error');
          return;
        }
        showToast(tr('accounts.allCleared', '已清空所有账号'));
        await loadOutlookAccountsList();
      } catch (e) {
        showToast(tr('toast.clearFailed', '清空失败') + ': ' + e.message, 'error');
      }
    },
  );
}

export function clearRegisteredOutlookAccounts() {
  const registered = outlookState.allAccounts.filter(function (a) {
    return a.registered;
  }).length;
  if (!registered) {
    showToast(tr('accounts.noRegistered', '没有已注册的账号'));
    return;
  }
  showConfirmModal(
    tr('accounts.clearRegisteredTitle', '清除已注册'),
    tr(
      'accounts.clearRegisteredMsg',
      { n: registered },
      '确认删除 {n} 个已注册（成功/失败）的账号？',
    ),
    tr('accounts.deleteConfirm', '确认删除'),
    async function () {
      try {
        const result = await getAppApi().ClearRegisteredOutlookAccounts();
        if (result.error) {
          showToast(result.error, 'error');
          return;
        }
        showToast(tr('toast.accountsDeleted', { n: result.removed || 0 }, '已删除 {n} 个账号'));
        await loadOutlookAccountsList();
      } catch (e) {
        showToast(tr('toast.deleteFailed', '删除失败') + ': ' + e.message, 'error');
      }
    },
  );
}
