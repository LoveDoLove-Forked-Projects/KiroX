/** @file 数据目录与结果目录设置的读写入口。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { showToast } from '../ui/toast.js';

export async function loadDataDir() {
  try {
    const dir = await getAppApi().GetDataDir();
    document.getElementById('cfg-data-dir').value = dir || '';
  } catch (e) {}
}

export async function selectDataDir() {
  try {
    const path = await getAppApi().SelectDirectory();
    if (!path) return;
    const result = await getAppApi().SetDataDir(path);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    document.getElementById('cfg-data-dir').value = result.path;
    showToast(tr('toast.dataDirSet', '存储目录已设置'));
  } catch (e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}

export async function resetDataDir() {
  try {
    const result = await getAppApi().ResetDataDir();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    document.getElementById('cfg-data-dir').value = result.path;
    showToast(tr('toast.dataDirReset', '已重置为默认存储目录'));
  } catch (e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}

export async function loadResultOutputDir() {
  try {
    const dir = await getAppApi().GetResultOutputDir();
    const el = document.getElementById('cfg-result-output-dir');
    if (el) el.value = dir || '';
  } catch (e) {}
}

export async function selectResultOutputDir() {
  try {
    const path = await getAppApi().SelectDirectory();
    if (!path) return;
    const result = await getAppApi().SetResultOutputDir(path);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    document.getElementById('cfg-result-output-dir').value = result.path;
    showToast(tr('toast.outputDirSet', '输出目录已设置') + ': ' + result.path);
  } catch (e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}

export async function resetResultOutputDir() {
  try {
    const result = await getAppApi().ResetResultOutputDir();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    document.getElementById('cfg-result-output-dir').value = result.path;
    showToast(tr('toast.outputDirReset', '已重置为默认输出目录'));
  } catch (e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}
