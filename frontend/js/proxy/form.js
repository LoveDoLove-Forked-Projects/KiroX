/** @file 代理创建与编辑表单的展示状态。 */

import { tr } from '../i18n/index.js';
import { proxyState } from './state.js';
import { parseProxyUrl } from './url.js';
import { setDropdownValue } from '../ui/dropdown.js';

export function openIpFormModal() {
  proxyState.formMode = 'create';
  proxyState.editingId = null;
  document.getElementById('ip-form-title').textContent = tr('ip.addTitle', '添加代理');
  document.getElementById('ip-form-protocol').value = 'http';
  document.getElementById('ip-form-host').value = '';
  document.getElementById('ip-form-port').value = '8080';
  setDropdownValue(document.getElementById('ip-form-protocol'), 'http');
  document.getElementById('ip-form-user').value = '';
  document.getElementById('ip-form-pass').value = '';
  document.getElementById('ip-form-batch-text').value = '';
  document.getElementById('ip-batch-status').textContent = '';
  switchIpFormTab('single');
  document.getElementById('ip-form-modal').classList.add('show');
}

export function editIpEntry(id) {
  const p = proxyState.pool.find(function (x) {
    return x.id === id;
  });
  if (!p) return;
  const u = parseProxyUrl(p.url);
  proxyState.formMode = 'edit';
  proxyState.editingId = id;
  document.getElementById('ip-form-title').textContent = tr('ip.editTitle', '编辑代理');
  document.getElementById('ip-form-protocol').value = u.proto || 'http';
  document.getElementById('ip-form-host').value = u.host || '';
  document.getElementById('ip-form-port').value = u.port || '';
  document.getElementById('ip-form-user').value = u.user || '';
  document.getElementById('ip-form-pass').value = u.pass || '';
  setDropdownValue(document.getElementById('ip-form-protocol'), u.proto || 'http');
  switchIpFormTab('single');
  document.getElementById('ip-form-modal').classList.add('show');
}

export function closeIpFormModal() {
  document.getElementById('ip-form-modal').classList.remove('show');
}

export function switchIpFormTab(tab) {
  const single = document.getElementById('ip-form-single');
  const batch = document.getElementById('ip-form-batch');
  const tS = document.getElementById('ip-tab-single');
  const tB = document.getElementById('ip-tab-batch');
  if (single) single.style.display = tab === 'single' ? 'grid' : 'none';
  if (batch) batch.style.display = tab === 'batch' ? 'block' : 'none';
  if (tS) tS.className = 'btn btn-' + (tab === 'single' ? 'dark' : 'secondary') + ' btn-sm';
  if (tB) tB.className = 'btn btn-' + (tab === 'batch' ? 'dark' : 'secondary') + ' btn-sm';
}
