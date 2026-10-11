/** @file MoeMail 配置列表、状态与摘要渲染。 */

import { moemailState } from './state.js';
import { tr } from '../../i18n/index.js';
import { escapeHtml } from '../../ui/html.js';

export function updateMoeMailUI() {
  let activeCount = 0;
  moemailState.configs.forEach((cfg) => {
    const status = moemailState.configStatus[cfg.name];
    if (status && status.tested && status.success) {
      activeCount++;
    }
  });

  const summaryEl = document.getElementById('settings-moemail-summary');
  if (summaryEl) {
    if (moemailState.configs.length === 0) {
      summaryEl.textContent = tr('moemail.summaryNone', '未配置');
    } else {
      summaryEl.textContent = tr(
        'moemail.summaryActive',
        { n: moemailState.configs.length, m: activeCount },
        '已配置 {n} 个，可用 {m} 个',
      );
    }
  }

  renderMoeMailConfigList();
}

export function renderMoeMailConfigList() {
  const inlineList = document.getElementById('moemail-inline-list');
  if (inlineList) {
    if (moemailState.configs.length === 0) {
      inlineList.innerHTML = `
        <div class="moemail-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <div>${tr('moemail.emptyInline', '暂无配置，请在上方添加 MoeMail 配置')}</div>
        </div>
      `;
    } else {
      inlineList.innerHTML = moemailState.configs
        .map((cfg, idx) => {
          const status = moemailState.configStatus[cfg.name] || { tested: false };
          let dotClass = 'untested';
          let statusLabel = tr('status.untested', '未测试');
          let statusClass = 'untested';
          let domainsHtml = '';

          if (status.tested && status.success) {
            dotClass = 'success';
            statusLabel = tr('status.available', '可用');
            statusClass = 'success';
            const domains = status.domains || [];
            if (domains.length > 0) {
              domainsHtml =
                '<div class="moemail-domain-tags">' +
                domains
                  .map((d) => '<span class="moemail-domain-tag">' + escapeHtml(d) + '</span>')
                  .join('') +
                '</div>';
            }
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
              <button type="button" data-action="testMoeMailConfigByIndex" data-value="${idx}" class="btn btn-secondary btn-sm">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                ${tr('common.test', '测试')}
              </button>
              <button type="button" data-action="deleteMoeMailConfig" data-value="${idx}" class="btn btn-secondary btn-sm text-danger">
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
  }
}

export function generateMoeMailName() {
  const prefix = tr('moemail.autoNamePrefix', '配置');
  let idx = moemailState.configs.length + 1;
  let name = prefix + ' ' + idx;
  while (moemailState.configs.some((c) => c.name === name)) {
    idx++;
    name = prefix + ' ' + idx;
  }
  return name;
}
