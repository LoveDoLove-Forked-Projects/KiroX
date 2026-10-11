/** @file 代理启停与删除操作的界面反馈。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { renderIpList, selectedIpIds } from './list.js';
import { loadIpList } from './service.js';
import { proxyState } from './state.js';
import { showConfirmModal } from '../ui/confirm.js';
import { showToast } from '../ui/toast.js';

export async function toggleIpEnabled(id, enabled) {
  const p = proxyState.pool.find(function (x) {
    return x.id === id;
  });
  if (!p) return;
  try {
    const res = await getAppApi().UpdateProxyEntry(id, '', p.url || '', p.weight || 1, enabled);
    if (res && res.error) {
      showToast(res.error, 'error');
      await loadIpList();
      return;
    }
    p.enabled = enabled;
    renderIpList();
  } catch (e) {
    showToast(tr('ip.saveFailed', '保存失败') + ': ' + e.message, 'error');
    await loadIpList();
  }
}

export function deleteIpEntry(id) {
  showConfirmModal(
    tr('ip.deleteTitle', '删除代理'),
    tr('ip.deleteMsg', '确认从池中删除该代理？'),
    tr('ip.delete', '删除'),
    async function () {
      try {
        const res = await getAppApi().DeleteProxyEntry(id);
        if (res && res.error) {
          showToast(res.error, 'error');
          return;
        }
        showToast(tr('ip.deleted', '已删除'));
        await loadIpList();
      } catch (e) {
        showToast(tr('ip.deleteFailed', '删除失败') + ': ' + e.message, 'error');
      }
    },
  );
}

export async function batchDeleteIp() {
  const sel = selectedIpIds();
  if (!sel.length) {
    showToast(tr('ip.selectFirst', '请选择要删除的代理'));
    return;
  }
  showConfirmModal(
    tr('ip.batchDeleteTitle', '批量删除'),
    tr('ip.batchDeleteMsg', '确认删除选中的 {n} 个代理？').replace('{n}', sel.length),
    tr('ip.batchDelete', '批量删除'),
    async function () {
      let ok = 0,
        err = 0;
      for (let i = 0; i < sel.length; i++) {
        try {
          const res = await getAppApi().DeleteProxyEntry(sel[i]);
          if (res && res.error) err++;
          else ok++;
        } catch (e) {
          err++;
        }
      }
      showToast(
        tr('ip.batchDeleteDone', '删除完成：{ok} 成功').replace('{ok}', ok) +
          (err ? tr('ip.batchFail', '，{n} 失败').replace('{n}', err) : ''),
      );
      await loadIpList();
    },
  );
}
