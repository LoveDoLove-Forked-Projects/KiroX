/** @file Cloud-Mail 配置列表、状态与摘要渲染。 */

import { cloudmailState } from './state.js';
import { tr } from '../../i18n/index.js';
import { escapeHtml } from '../../ui/html.js';

export function updateCloudMailUI() {
  let activeCount = 0;
  cloudmailState.configs.forEach((cfg) => {
    const status = cloudmailState.configStatus[cfg.name];
    if (status && status.tested && status.success) {
      activeCount++;
    }
  });

  const summaryEl = document.getElementById('settings-cloudmail-summary');
  if (summaryEl) {
    if (cloudmailState.configs.length === 0) {
      summaryEl.textContent = tr('cloudmail.summaryNone', '未配置');
    } else {
      summaryEl.textContent = tr(
        'cloudmail.summaryActive',
        { n: cloudmailState.configs.length, m: activeCount },
        '已配置 {n} 个，可用 {m} 个',
      );
    }
  }

  renderCloudMailConfigList();
}

export function renderCloudMailConfigList() {
  const inlineList = document.getElementById('cloudmail-inline-list');
  if (!inlineList) return;

  if (cloudmailState.configs.length === 0) {
    inlineList.innerHTML = `
      <div class="moemail-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
        <div>${tr('cloudmail.emptyInline', '暂无配置，请在上方添加 Cloud-Mail 配置')}</div>
      </div>
    `;
    return;
  }

  inlineList.innerHTML = cloudmailState.configs
    .map((cfg, idx) => {
      const status = cloudmailState.configStatus[cfg.name] || { tested: false };
      let dotClass = 'untested';
      let statusLabel = tr('status.untested', '未测试');
      let statusClass = 'untested';
      let domainsHtml = '';

      const domains =
        status.domains && status.domains.length > 0 ? status.domains : cfg.domains || [];
      if (domains.length > 0) {
        domainsHtml =
          '<div class="moemail-domain-tags">' +
          domains
            .map((d) => '<span class="moemail-domain-tag">' + escapeHtml(d) + '</span>')
            .join('') +
          '</div>';
      }

      if (status.tested && status.success) {
        dotClass = 'success';
        statusLabel = tr('status.available', '可用');
        statusClass = 'success';
      } else if (status.tested) {
        dotClass = 'error';
        statusLabel = tr('status.unavailable', '不可用');
        statusClass = 'error';
      }

      return `
      <div class="moemail-config-item">
        <div class="moemail-config-main">
          <div class="moemail-status-dot ${dotClass}"></div>
          <div class="moemail-config-info">
            <div class="moemail-config-name">${escapeHtml(cfg.name)}</div>
            <div class="moemail-config-details">
              <span class="moemail-config-url">${escapeHtml(cfg.url)}</span>
              <span class="moemail-config-status ${statusClass}">${statusLabel}</span>
            </div>
            ${domainsHtml}
          </div>
        </div>
        <div class="moemail-config-actions">
          <button type="button" data-action="testCloudMailConfigByIndex" data-value="${idx}" class="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            ${tr('common.test', '测试')}
          </button>
          <button type="button" data-action="deleteCloudMailConfig" data-value="${idx}" class="btn btn-secondary btn-sm text-danger">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            ${tr('common.delete', '删除')}
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

export function generateCloudMailName() {
  const prefix = tr('cloudmail.autoNamePrefix', '配置');
  let idx = cloudmailState.configs.length + 1;
  let name = prefix + ' ' + idx;
  while (cloudmailState.configs.some((c) => c.name === name)) {
    idx++;
    name = prefix + ' ' + idx;
  }
  return name;
}
