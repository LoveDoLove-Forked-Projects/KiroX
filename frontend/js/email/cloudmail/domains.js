/** @file Cloud-Mail 域名选项加载、渲染与选择。 */

import { getAppApi } from '../../platform/wails.js';

import { cloudmailState } from './state.js';
import { tr } from '../../i18n/index.js';
import { escapeHtml } from '../../ui/html.js';

export function renderCloudMailDomains() {
  const listDiv = document.getElementById('cfg-cloudmail-domains-list');
  if (!listDiv) return;
  if (cloudmailState.domainView === 'loading' || cloudmailState.domainView === 'idle') {
    listDiv.innerHTML =
      '<div class="domain-list-message">' + tr('common.loading', '加载中...') + '</div>';
    return;
  }
  if (cloudmailState.domainView === 'empty') {
    listDiv.innerHTML =
      '<div class="domain-list-message">' +
      tr('cloudmail.noDomainsHint', '暂无配置，请先在邮箱池页添加') +
      '</div>';
    return;
  }
  if (cloudmailState.domainView === 'unavailable') {
    listDiv.innerHTML =
      '<div class="domain-list-message">' +
      tr('cloudmail.noActiveDomain', '暂无可用域名，请先测试 Cloud-Mail 配置') +
      '</div>';
    return;
  }
  if (cloudmailState.domainView === 'error') {
    listDiv.innerHTML =
      '<div class="domain-list-error">' + tr('common.loadFailed', '加载失败') + '</div>';
    return;
  }
  if (!cloudmailState.selectedDomains.length) cloudmailState.selectedDomains = ['__random__'];
  let html =
    '<div class="domain-mode-row">' +
    '<div class="domain-mode-btn" data-domain="__random__" data-action="toggleCloudMailDomain" data-value="__random__">' +
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>' +
    tr('register.modeRandom', '随机') +
    '</div>' +
    '<div class="domain-mode-btn" data-domain="__all__" data-action="toggleCloudMailDomain" data-value="__all__">' +
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>' +
    tr('register.modeRoundRobin', '轮询') +
    '</div></div><div class="domain-chips-wrap">';
  html += cloudmailState.domains
    .map(function (item) {
      return (
        '<div class="domain-chip" data-domain="' +
        escapeHtml(item.domain) +
        '" data-action="toggleCloudMailDomain" data-value="' +
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
  updateCloudMailDomainStyles();
}

export async function loadCloudMailDomainsToList() {
  const listDiv = document.getElementById('cfg-cloudmail-domains-list');
  if (!listDiv) return;
  cloudmailState.domainView = 'loading';
  renderCloudMailDomains();
  try {
    const configs = await getAppApi().GetCloudMailConfigs();
    if (!configs || configs.length === 0) {
      cloudmailState.domains = [];
      cloudmailState.domainView = 'empty';
      renderCloudMailDomains();
      return;
    }
    let configStatus = {};
    try {
      const saved = localStorage.getItem('cloudmail-config-status');
      if (saved) configStatus = JSON.parse(saved);
    } catch (e) {}
    const domainConfigMap = {};
    for (const cfg of configs) {
      const status = configStatus[cfg.name];
      if (!status || !status.tested || !status.success) continue;
      const domains =
        status.domains && status.domains.length > 0 ? status.domains : cfg.domains || [];
      for (const domain of domains) {
        if (!domainConfigMap[domain]) domainConfigMap[domain] = [];
        domainConfigMap[domain].push(cfg);
      }
    }
    cloudmailState.domains = Object.keys(domainConfigMap).map((domain) => ({
      domain: domain,
      configs: domainConfigMap[domain],
    }));
    cloudmailState.domainView = cloudmailState.domains.length ? 'ready' : 'unavailable';
    renderCloudMailDomains();
  } catch (e) {
    console.error('加载 Cloud-Mail 域名失败:', e);
    cloudmailState.domainView = 'error';
    renderCloudMailDomains();
  }
}

export function updateCloudMailDomainStyles() {
  const container = document.getElementById('cfg-cloudmail-domains-list');
  if (!container) return;
  container.querySelectorAll('.domain-mode-btn').forEach((el) => {
    const d = el.getAttribute('data-domain');
    el.classList.toggle('selected', cloudmailState.selectedDomains.includes(d));
  });
  container.querySelectorAll('.domain-chip').forEach((el) => {
    const d = el.getAttribute('data-domain');
    el.classList.toggle('selected', cloudmailState.selectedDomains.includes(d));
  });
}

export function toggleCloudMailDomain(domain) {
  const isSelected = cloudmailState.selectedDomains.includes(domain);
  if (domain === '__random__' || domain === '__all__') {
    if (isSelected) {
      cloudmailState.selectedDomains = cloudmailState.selectedDomains.filter((d) => d !== domain);
    } else {
      cloudmailState.selectedDomains = [domain];
    }
  } else {
    cloudmailState.selectedDomains = cloudmailState.selectedDomains.filter(
      (d) => d !== '__random__' && d !== '__all__',
    );
    if (isSelected) {
      cloudmailState.selectedDomains = cloudmailState.selectedDomains.filter((d) => d !== domain);
    } else {
      cloudmailState.selectedDomains.push(domain);
    }
  }
  updateCloudMailDomainStyles();
}

export function selectAllCloudMailDomains() {
  cloudmailState.selectedDomains = cloudmailState.domains.map((item) => item.domain);
  updateCloudMailDomainStyles();
}
