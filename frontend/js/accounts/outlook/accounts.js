/** @file Outlook 邮箱导入、加载与页面刷新生命周期。 */

import { getAppApi } from '../../platform/wails.js';

import { outlookState } from './state.js';
import { renderOutlookPage } from './view.js';
import { tr } from '../../i18n/index.js';
import { showToast } from '../../ui/toast.js';

export function openAddOutlookModal() {
  document.getElementById('add-outlook-modal').classList.add('show');
}

export function closeAddOutlookModal() {
  document.getElementById('add-outlook-modal').classList.remove('show');
  document.getElementById('cfg-outlook-data').value = '';
}

export async function addOutlookAccounts() {
  const data = document.getElementById('cfg-outlook-data').value.trim();
  if (!data) {
    showToast(tr('accounts.inputRequired', '请先输入 Outlook 账号数据'), 'error');
    return;
  }
  try {
    const result = await getAppApi().AddOutlookAccounts(data);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    closeAddOutlookModal();
    await loadOutlookAccountsList();
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

export async function importOutlookFile() {
  try {
    const filePath = await getAppApi().SelectOutlookFile();
    if (!filePath) {
      return;
    }

    const result = await getAppApi().ImportOutlookFile(filePath);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    await loadOutlookAccountsList();
    closeAddOutlookModal();
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

export async function loadOutlookAccountsList() {
  try {
    const accounts = await getAppApi().GetOutlookAccounts();
    outlookState.allAccounts = accounts || [];
    renderOutlookPage();
  } catch (e) {
    console.error('加载账号列表失败:', e);
  }
}

export function startOutlookAutoRefresh() {
  stopOutlookAutoRefresh();
  outlookState.refreshTimer = setInterval(loadOutlookAccountsList, 3000);
}

export function stopOutlookAutoRefresh() {
  if (outlookState.refreshTimer) {
    clearInterval(outlookState.refreshTimer);
    outlookState.refreshTimer = null;
  }
}
