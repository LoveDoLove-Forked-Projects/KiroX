/** @file 日志目录、日志清理与缓存清理的确认入口。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { showConfirmModal } from '../ui/confirm.js';
import { showToast } from '../ui/toast.js';

export async function openLogsDirectory() {
  try {
    await getAppApi().OpenLogsDir();
  } catch (e) {}
}

export function clearPersistentLogs() {
  showConfirmModal(
    tr('settings.clearLogs', '清理日志'),
    tr('settings.clearLogsConfirm', '确定删除全部持久化日志吗？'),
    tr('common.confirm', '确认'),
    async function () {
      const r = await getAppApi().ClearLogs();
      showToast(r.error || tr('settings.logsCleared', '日志已清理'), r.error ? 'error' : 'success');
    },
  );
}

export function clearFingerprintCache() {
  showConfirmModal(
    tr('settings.clearFingerprint', '清理指纹缓存'),
    tr('settings.clearFingerprintConfirm', '确定清理全部指纹缓存吗？'),
    tr('common.confirm', '确认'),
    async function () {
      const r = await getAppApi().ResetFingerprintCache();
      showToast(
        r.error || tr('settings.fingerprintCleared', '指纹缓存已清理'),
        r.error ? 'error' : 'success',
      );
    },
  );
}
