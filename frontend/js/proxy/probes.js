/** @file 现有代理检测操作与结果刷新。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { renderIpList, selectedIpIds } from './list.js';
import { showIpResultModal } from './result.js';
import { proxyState } from './state.js';
import { showToast } from '../ui/toast.js';

export async function probeOne(p) {
  if (!p || !p.url || proxyState.probing[p.id]) return null;
  proxyState.probing[p.id] = true;
  renderIpList();
  const t0 = performance.now();
  let res = null;
  try {
    res = await getAppApi().TestProxyByID(p.id);
    const ms = typeof res.ms === 'number' ? res.ms : Math.round(performance.now() - t0);
    if (res && res.error) {
      p.probeOk = false;
      p.probeError = res.error;
    } else {
      p.probeOk = !!res.ok;
      p.probeIp = res.ip || '';
      p.probeCountry = res.country || '';
      p.probeCountryCode = res.countryCode || '';
      p.probeRegion = res.region || '';
      p.probeCity = res.city || '';
      p.probeIsp = res.isp || '';
      p.probeType = res.proxyType || '';
      p.probeMs = ms;
      p.probeError = res.error || '';
      p.probeAt = Math.floor(Date.now() / 1000);
    }
  } catch (e) {
    p.probeOk = false;
    p.probeError = e.message;
  }
  delete proxyState.probing[p.id];
  renderIpList();
  return res;
}

export async function probeAllIp(force) {
  let i = 0;
  async function worker() {
    while (i < proxyState.pool.length) {
      const p = proxyState.pool[i++];
      if (!p || !p.url) continue;
      if (!force && p.probeAt && p.probeCountryCode) continue;
      await probeOne(p);
    }
  }
  const ws = [];
  for (let k = 0; k < 5; k++) ws.push(worker());
  await Promise.all(ws);
}

export async function testIpEntry(id) {
  const p = proxyState.pool.find(function (x) {
    return x.id === id;
  });
  if (!p) return;

  showIpResultModal(p, null);
  const res = await probeOne(p);
  showIpResultModal(p, res);
}

export async function batchTestIp() {
  const sel = selectedIpIds();
  const targets = proxyState.pool.filter(function (p) {
    return sel.length ? sel.indexOf(p.id) >= 0 : !!p.url;
  });
  if (!targets.length) {
    showToast(tr('ip.noProxies', '没有可测试的代理'));
    return;
  }
  showToast(tr('ip.testingN', '测试 {n} 个代理…').replace('{n}', targets.length));
  let i = 0;
  async function w() {
    while (i < targets.length) {
      const t = targets[i++];
      await probeOne(t);
    }
  }
  const ws = [];
  for (let k = 0; k < 5; k++) ws.push(w());
  await Promise.all(ws);
}
