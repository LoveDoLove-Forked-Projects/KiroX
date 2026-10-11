/** @file 任务开始与停止操作的界面入口。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { getFormConfig } from './config.js';
import { closeNewTaskModal, updateUIStatus } from './dialog.js';
import { showToast } from '../ui/toast.js';

export async function startTask() {
  try {
    const cfg = getFormConfig();

    const result = await getAppApi().StartTask(cfg);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    updateUIStatus(true);
    closeNewTaskModal();
    showToast(tr('toast.taskStarted', '任务已启动'));
  } catch (e) {
    showToast(tr('toast.taskStartFailed', '启动失败') + ': ' + e.message, 'error');
  }
}

export async function stopTask() {
  try {
    const result = await getAppApi().StopTask();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(tr('toast.taskStopping', '正在停止任务...'));
  } catch (e) {
    showToast(tr('toast.taskStopFailed', '停止失败') + ': ' + (e.message || e), 'error');
  }
}
