/** @file 验证页面启动、声明式事件和动态列表的模块集成。 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createDomApp } from './helpers/dom-app.js';
import { flushRequests } from './helpers/settings-app.js';

test('the module entry initializes the complete page without application globals', async (t) => {
  const app = await createDomApp(t);
  assert.equal(app.document.getElementById('skeleton-loader').style.display, 'none');
  assert.equal(app.document.getElementById('setting-theme').dataset.value, 'light');
  assert.equal(app.intervals.length, 1);
  for (const name of ['I18N', 'appSettings', 'switchPage', 'startTask', 'toggleDropdown']) {
    assert.equal(app.window[name], undefined, `${name} must stay inside its module`);
  }
  assert.equal(app.document.querySelectorAll('[onclick], [oninput], [onchange]').length, 0);
  assert.deepEqual(app.errors, []);
});

test('delegated navigation and dropdown changes update the actual settings controls', async (t) => {
  const app = await createDomApp(t);
  app.document.querySelector('[data-page="settings"]').click();
  assert.equal(app.document.getElementById('page-settings').classList.contains('active'), true);
  const dropdown = app.document.getElementById('setting-email-proxy-mode');
  dropdown.querySelector('.dropdown-selected').click();
  assert.equal(dropdown.classList.contains('open'), true);
  dropdown.querySelector('[data-value="custom"]').click();
  assert.equal(dropdown.dataset.value, 'custom');
  assert.equal(app.document.getElementById('setting-email-proxy').disabled, false);
  assert.equal(dropdown.classList.contains('open'), false);
  assert.equal(app.document.getElementById('settings-save-button').disabled, false);

  const volume = app.document.getElementById('setting-sound-volume');
  volume.value = '25';
  volume.dispatchEvent(new app.window.Event('input', { bubbles: true }));
  assert.equal(app.document.getElementById('setting-sound-volume-label').textContent, '25%');
  app.document.querySelector('[data-action="openURL"]').click();
  assert.deepEqual(app.calls[0], ['OpenURL', 'https://qm.qq.com/q/RXMTXUlc4w']);
  assert.deepEqual(app.errors, []);
});

test('delegation survives dynamic account and domain rerenders', async (t) => {
  const app = await createDomApp(t, {
    accounts: [{ email: 'owner@example.com', registered: false }],
  });
  const { renderOutlookPage } = await app.loadModule('accounts/outlook/view.js');
  renderOutlookPage();
  app.document.querySelector('[data-action="deleteOutlookAccount"]').click();
  assert.equal(app.document.getElementById('confirm-modal').classList.contains('show'), true);
  assert.match(app.document.getElementById('confirm-message').textContent, /owner@example.com/);

  const { moemailState } = await app.loadModule('email/moemail/state.js');
  const { renderMoeMailDomains } = await app.loadModule('email/moemail/domains.js');
  moemailState.domains = [{ domain: 'example.com', configs: [{}] }];
  moemailState.domainView = 'ready';
  renderMoeMailDomains();
  renderMoeMailDomains();
  app.document
    .querySelector('[data-action="toggleMoeMailDomain"][data-value="example.com"]')
    .click();
  assert.deepEqual(Array.from(moemailState.selectedDomains), ['example.com']);
  assert.deepEqual(app.errors, []);
});

test('delegated proxy checkboxes retain their browser default behavior', async (t) => {
  const proxy = { id: 'proxy-1', url: 'http://localhost:8080', enabled: true };
  const app = await createDomApp(t, { proxies: [proxy] });
  const { loadIpList } = await app.loadModule('proxy/service.js');
  const { proxyState } = await app.loadModule('proxy/state.js');
  await loadIpList();
  const selection = app.document.querySelector('[data-action="toggleIpSelect"]');
  selection.click();
  assert.equal(selection.checked, true);
  assert.equal(proxyState.selected['proxy-1'], true);
  selection.click();
  assert.equal(selection.checked, false);
  assert.equal(proxyState.selected['proxy-1'], false);

  const enabled = app.document.querySelector('[data-change-action="toggleIpEnabled"]');
  enabled.click();
  await flushRequests();
  assert.equal(proxy.enabled, false);
  assert.equal(app.calls[0].at(-1), false);
  assert.deepEqual(app.errors, []);
});
