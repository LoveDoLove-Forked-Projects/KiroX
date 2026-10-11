/** @file MoeMail 域名选项加载、渲染与选择。 */

import { getAppApi } from '../../platform/wails.js';

import { moemailState } from './state.js';
import { tr } from '../../i18n/index.js';
import { escapeHtml } from '../../ui/html.js';

export function renderMoeMailDomains() {
  const listDiv = document.getElementById('cfg-moemail-domains-list');
  if (!listDiv) return;
  if (moemailState.domainView === 'loading' || moemailState.domainView === 'idle') {
    listDiv.innerHTML =
      '<div class="domain-list-message">' + tr('common.loading', '加载中...') + '</div>';
    return;
  }
  if (moemailState.domainView === 'empty') {
    listDiv.innerHTML =
      '<div class="domain-list-message">' +
      tr('moemail.noDomainsHint', '暂无配置，请先在设置页添加') +
      '</div>';
    return;
  }
  if (moemailState.domainView === 'unavailable') {
    listDiv.innerHTML =
      '<div class="domain-list-message">' +
      tr('moemail.noActiveDomain', '暂无可用域名，请先测试配置') +
      '</div>';
    return;
  }
  if (moemailState.domainView === 'error') {
    listDiv.innerHTML =
      '<div class="domain-list-error">' + tr('common.loadFailed', '加载失败') + '</div>';
    return;
  }
  if (!moemailState.selectedDomains.length) moemailState.selectedDomains = ['__random__'];
  let html =
    '<div class="domain-mode-row">' +
    '<div class="domain-mode-btn" data-domain="__random__" data-action="toggleMoeMailDomain" data-value="__random__">' +
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>' +
    tr('register.modeRandom', '随机') +
    '</div>' +
    '<div class="domain-mode-btn" data-domain="__all__" data-action="toggleMoeMailDomain" data-value="__all__">' +
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>' +
    tr('register.modeRoundRobin', '轮询') +
    '</div></div><div class="domain-chips-wrap">';
  html += moemailState.domains
    .map(function (item) {
      return (
        '<div class="domain-chip" data-domain="' +
        escapeHtml(item.domain) +
        '" data-action="toggleMoeMailDomain" data-value="' +
        escapeHtml(item.domain) +
        '" title="' +
        tr('register.configCount', { n: item.configs.length }, '{n} 个配置') +
        '">' +
        escapeHtml(item.domain) +
        '</div>'
      );
    })
    .join('');
  listDiv.innerHTML = html + '</div>';
  updateDomainOptionStyles();
}

export async function loadMoeMailDomainsToList() {
  const listDiv = document.getElementById('cfg-moemail-domains-list');
  if (!listDiv) return;

  moemailState.domainView = 'loading';
  renderMoeMailDomains();

  try {
    const configs = await getAppApi().GetMoeMailConfigs();

    if (!configs || configs.length === 0) {
      moemailState.domains = [];
      moemailState.domainView = 'empty';
      renderMoeMailDomains();
      return;
    }

    let configStatus = {};
    try {
      const saved = localStorage.getItem('moemail-config-status');
      if (saved) configStatus = JSON.parse(saved);
    } catch (e) {}

    moemailState.domains = [];
    const domainConfigMap = {};

    for (const cfg of configs) {
      const status = configStatus[cfg.name];
      if (
        status &&
        status.tested &&
        status.success &&
        status.domains &&
        status.domains.length > 0
      ) {
        for (const domain of status.domains) {
          if (!domainConfigMap[domain]) domainConfigMap[domain] = [];
          domainConfigMap[domain].push(cfg);
        }
      }
    }

    moemailState.domains = Object.keys(domainConfigMap).map((domain) => ({
      domain: domain,
      configs: domainConfigMap[domain],
    }));

    if (moemailState.domains.length === 0) {
      moemailState.domainView = 'unavailable';
      renderMoeMailDomains();
      return;
    }
    moemailState.domainView = 'ready';
    renderMoeMailDomains();
  } catch (e) {
    console.error('加载 MoeMail 域名失败:', e);
    moemailState.domainView = 'error';
    renderMoeMailDomains();
  }
}

export function updateDomainOptionStyles() {
  const container = document.getElementById('cfg-moemail-domains-list');
  if (!container) return;
  container.querySelectorAll('.domain-mode-btn').forEach((el) => {
    const domain = el.getAttribute('data-domain');
    el.classList.toggle('selected', moemailState.selectedDomains.includes(domain));
  });
  container.querySelectorAll('.domain-chip').forEach((el) => {
    const domain = el.getAttribute('data-domain');
    el.classList.toggle('selected', moemailState.selectedDomains.includes(domain));
  });
}

export function toggleMoeMailDomain(domain) {
  const isSelected = moemailState.selectedDomains.includes(domain);

  if (domain === '__random__' || domain === '__all__') {
    if (isSelected) {
      moemailState.selectedDomains = moemailState.selectedDomains.filter((d) => d !== domain);
    } else {
      moemailState.selectedDomains = [domain];
    }
  } else {
    moemailState.selectedDomains = moemailState.selectedDomains.filter(
      (d) => d !== '__random__' && d !== '__all__',
    );
    if (isSelected) {
      moemailState.selectedDomains = moemailState.selectedDomains.filter((d) => d !== domain);
    } else {
      moemailState.selectedDomains.push(domain);
    }
  }

  updateDomainOptionStyles();
}

export function selectAllMoeMailDomains() {
  moemailState.selectedDomains = moemailState.domains.map((item) => item.domain);
  updateDomainOptionStyles();
}
