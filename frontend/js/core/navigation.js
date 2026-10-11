/** @file 页面切换、标题更新与页面级数据加载。 */

import { loadInfoVersion } from '../about/info.js';
import { loadICloudAccountsList } from '../accounts/icloud.js';
import {
  loadOutlookAccountsList,
  startOutlookAutoRefresh,
  stopOutlookAutoRefresh,
} from '../accounts/outlook/accounts.js';
import { navigationState } from './navigation-state.js';
import { I18N } from '../i18n/index.js';
import { loadIpList } from '../proxy/service.js';
import { updateSettingsDirtyState } from '../settings/dirty.js';

export function getPageTitle(pageId) {
  if (I18N && pageId) {
    const v = I18N.t('page.' + pageId);
    if (v && v !== 'page.' + pageId) return v;
  }
  const fallback = {
    overview: '概览',
    logs: '运行日志',
    register: '注册',
    accounts: '邮箱池',
    ip: 'IP 管理',
    info: '关于',
    settings: '设置',
  };
  return fallback[pageId] || pageId;
}

export function switchPage(pageId) {
  navigationState.currentPageId = pageId;
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item[data-page]').forEach(function (item) {
    item.classList.toggle('active', item.getAttribute('data-page') === pageId);
  });
  document.getElementById('titlebar-text').textContent = getPageTitle(pageId);
  if (pageId === 'ip') {
    loadIpList();
  }
  if (pageId === 'accounts') {
    loadOutlookAccountsList();
    startOutlookAutoRefresh();
    if (typeof loadICloudAccountsList === 'function') loadICloudAccountsList();
  } else {
    stopOutlookAutoRefresh();
  }
  if (pageId === 'info') {
    loadInfoVersion();
  }
  updateSettingsDirtyState();
}
