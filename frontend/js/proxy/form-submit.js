/** @file 代理表单读取、批量输入解析与提交。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { closeIpFormModal } from './form.js';
import { dropdownValue } from './list.js';
import { loadIpList } from './service.js';
import { proxyState } from './state.js';
import { buildProxyUrl, normalizeBatchLine } from './url.js';
import { showToast } from '../ui/toast.js';

export function parseBatchText() {
  const text = document.getElementById('ip-form-batch-text').value || '';
  const lines = text
    .split(/\r?\n/)
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
  const valid = [];
  let invalid = 0;
  const seen = {};
  lines.forEach(function (line) {
    const u = normalizeBatchLine(line);
    if (u && !seen[u]) {
      seen[u] = 1;
      valid.push(u);
    } else invalid++;
  });
  return { valid: valid, invalid: invalid };
}

export async function submitIpForm() {
  if (
    proxyState.formMode === 'create' &&
    document.getElementById('ip-form-batch').style.display !== 'none'
  ) {
    await submitBatch();
    return;
  }
  await submitSingle();
}

export async function submitSingle() {
  const obj = {
    protocol: dropdownValue('ip-form-protocol'),
    host: document.getElementById('ip-form-host').value.trim(),
    port: document.getElementById('ip-form-port').value,
    user: document.getElementById('ip-form-user').value,
    pass: document.getElementById('ip-form-pass').value,
  };
  if (!obj.host) {
    showToast(tr('ip.hostRequired', '主机不能为空'), 'error');
    return;
  }
  const url = buildProxyUrl(obj);
  if (proxyState.formMode === 'create') {
    try {
      const res = await getAppApi().AddProxyEntry('', url, 1);
      if (res && res.error) {
        showToast(res.error, 'error');
        return;
      }
      showToast(tr('ip.added', '已添加'));
    } catch (e) {
      showToast(tr('ip.addFailed', '添加失败') + ': ' + e.message, 'error');
      return;
    }
  } else {
    const cur = proxyState.pool.find(function (x) {
      return x.id === proxyState.editingId;
    });
    const enabled = cur ? cur.enabled : true;
    try {
      const res2 = await getAppApi().UpdateProxyEntry(proxyState.editingId, '', url, 1, enabled);
      if (res2 && res2.error) {
        showToast(res2.error, 'error');
        return;
      }
      showToast(tr('ip.saved', '已保存'));
    } catch (e) {
      showToast(tr('ip.saveFailed', '保存失败') + ': ' + e.message, 'error');
      return;
    }
  }
  closeIpFormModal();
  await loadIpList();
}

export async function submitBatch() {
  const r = parseBatchText();
  if (!r.valid.length) {
    showToast(tr('ip.invalidBatch', '没有有效的代理行'), 'error');
    return;
  }
  let added = 0,
    dup = 0,
    fail = 0;
  for (let i = 0; i < r.valid.length; i++) {
    try {
      const res = await getAppApi().AddProxyEntry('', r.valid[i], 1);
      if (res && res.error) {
        if (/已存在/.test(res.error)) dup++;
        else fail++;
      } else added++;
    } catch (e) {
      fail++;
    }
  }
  let msg = tr('ip.batchDone', '完成：{added} 成功').replace('{added}', added);
  if (dup > 0) msg += tr('ip.batchDup', '，{n} 已存在').replace('{n}', dup);
  if (fail > 0) msg += tr('ip.batchFail', '，{n} 失败').replace('{n}', fail);
  showToast(msg);
  closeIpFormModal();
  await loadIpList();
}
