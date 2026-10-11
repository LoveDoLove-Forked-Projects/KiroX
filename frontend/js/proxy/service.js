/** @file 代理列表的加载与既有自动检测入口。 */

import { getAppApi } from '../platform/wails.js';

import { renderIpList } from './list.js';
import { probeAllIp } from './probes.js';
import { proxyState } from './state.js';
import { settingsState } from '../settings/state.js';

export async function loadIpList() {
  proxyState.listLoading = true;
  renderIpList();
  try {
    proxyState.pool = await getAppApi().ListProxyPool();
  } catch (e) {
    proxyState.pool = [];
  }
  proxyState.listLoading = false;
  proxyState.selected = {};
  renderIpList();
  if (!settingsState.appSettings || settingsState.appSettings.autoProbeProxies !== false)
    probeAllIp(false);
}
