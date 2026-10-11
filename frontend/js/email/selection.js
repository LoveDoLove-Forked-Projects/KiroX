/** @file 任务表单邮箱提供商选择与配置区域切换。 */

import { loadCloudMailDomainsToList } from './cloudmail/domains.js';
import { loadMoeMailDomainsToList } from './moemail/domains.js';
import { selectionState } from './selection-state.js';
import { setDropdownValue } from '../ui/dropdown.js';

export function initEmailProviderSelection() {
  const provider = 'outlook';
  selectEmailProvider(provider);
}

export function selectEmailProvider(provider) {
  selectionState.provider = provider;

  const providerWrap = document.getElementById('cfg-email-provider');
  if (providerWrap && typeof setDropdownValue === 'function') {
    setDropdownValue(providerWrap, provider);
  }

  const moemailConfigDiv = document.getElementById('moemail-config-select');
  const cloudmailConfigDiv = document.getElementById('cloudmail-config-select');

  if (moemailConfigDiv) moemailConfigDiv.style.display = provider === 'moemail' ? 'block' : 'none';
  if (cloudmailConfigDiv)
    cloudmailConfigDiv.style.display = provider === 'cloudmail' ? 'block' : 'none';

  const optionsCol = document.getElementById('ntm-email-options');
  const modalContent = document.getElementById('ntm-modal-content');
  const hasRightCol = provider === 'moemail' || provider === 'cloudmail';
  if (optionsCol) optionsCol.classList.toggle('show', hasRightCol);
  if (modalContent) modalContent.style.maxWidth = hasRightCol ? '520px' : '420px';

  if (provider === 'moemail') {
    loadMoeMailDomainsToList();
  } else if (provider === 'cloudmail') {
    loadCloudMailDomainsToList();
  }
}
