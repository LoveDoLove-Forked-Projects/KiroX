/** @file 验证 MailNest 配置只在测试和持久化都成功后更新。 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createDomApp } from './helpers/dom-app.js';
import { flushRequests } from './helpers/settings-app.js';

function fillConfig(app) {
  app.document.getElementById('mailnest-inline-apikey').value = ' test-key ';
  app.document.getElementById('mailnest-inline-project-code').value = ' project ';
}

test('MailNest requires explicit test success before saving', async (t) => {
  let response;
  let saves = 0;
  const app = await createDomApp(t, {
    backend: {
      TestMailNestConnection: async () => response,
      SaveMailNestConfig: async () => {
        saves++;
        return { success: true };
      },
    },
  });
  fillConfig(app);
  const api = await app.loadModule('email/mailnest.js');
  for (response of [null, {}, { success: false }, { success: true, error: 'API denied' }]) {
    await api.inlineAddMailNest();
    assert.equal(saves, 0);
    assert.equal(app.document.getElementById('settings-mailnest-summary').textContent, '未配置');
    assert.equal(app.document.getElementById('mailnest-inline-test-btn').disabled, false);
  }
});

test('MailNest saves trimmed credentials and accepts a zero balance', async (t) => {
  const payloads = [];
  const app = await createDomApp(t, {
    backend: {
      TestMailNestConnection: async (payload) => {
        payloads.push(JSON.parse(payload));
        return { success: true, balance: '0' };
      },
      SaveMailNestConfig: async (payload) => {
        payloads.push(JSON.parse(payload));
        return { success: true };
      },
    },
  });
  fillConfig(app);
  const api = await app.loadModule('email/mailnest.js');
  await api.inlineAddMailNest();
  assert.deepEqual(payloads, Array(2).fill({ apiKey: 'test-key', projectCode: 'project' }));
  assert.equal(app.document.getElementById('settings-mailnest-summary').textContent, '已配置');
  assert.equal(
    app.document.getElementById('mailnest-inline-status').textContent,
    '测试成功，余额为 0',
  );
});

test('MailNest prevents duplicate actions until the save completes', async (t) => {
  let finishSave;
  let tests = 0;
  let saves = 0;
  const app = await createDomApp(t, {
    backend: {
      TestMailNestConnection: async () => {
        tests++;
        return { success: true, balance: '1' };
      },
      SaveMailNestConfig: async () => {
        saves++;
        return new Promise((resolve) => {
          finishSave = resolve;
        });
      },
    },
  });
  fillConfig(app);
  const api = await app.loadModule('email/mailnest.js');
  const first = api.inlineAddMailNest();
  await flushRequests();
  assert.equal(app.document.querySelector('[data-action="inlineAddMailNest"]').disabled, true);
  assert.equal(app.document.getElementById('mailnest-inline-apikey').disabled, true);
  await api.inlineAddMailNest();
  await api.inlineTestMailNest();
  assert.equal(tests, 1);
  assert.equal(saves, 1);
  finishSave({ success: true });
  await first;
  assert.equal(app.document.querySelector('[data-action="inlineAddMailNest"]').disabled, false);
  assert.equal(app.document.getElementById('mailnest-inline-apikey').disabled, false);
});

test('MailNest save errors preserve the previous config and allow retry', async (t) => {
  let rejectSave = true;
  const app = await createDomApp(t, {
    backend: {
      GetMailNestConfig: async () => ({ apiKey: 'old-key', projectCode: 'old-project' }),
      TestMailNestConnection: async () => ({ success: true, balance: '1' }),
      SaveMailNestConfig: async () => {
        if (rejectSave) throw new Error('disk unavailable');
        return { success: true };
      },
    },
  });
  fillConfig(app);
  const api = await app.loadModule('email/mailnest.js');
  await api.inlineAddMailNest();
  assert.match(
    app.document.getElementById('mailnest-inline-status').textContent,
    /disk unavailable/,
  );
  api.updateMailNestUI();
  assert.equal(app.document.getElementById('mailnest-inline-apikey').value, 'old-key');
  fillConfig(app);
  rejectSave = false;
  await api.inlineAddMailNest();
  api.updateMailNestUI();
  assert.equal(app.document.getElementById('mailnest-inline-apikey').value, 'test-key');
});

test('MailNest renders service errors as text in status and toast', async (t) => {
  const message = '<img src=x onerror="alert(1)"> API denied';
  const app = await createDomApp(t, {
    backend: { TestMailNestConnection: async () => ({ error: message }) },
  });
  fillConfig(app);
  const api = await app.loadModule('email/mailnest.js');
  await api.inlineTestMailNest();
  assert.equal(app.document.getElementById('mailnest-inline-status').textContent, message);
  assert.equal(app.document.querySelector('.toast-msg').textContent, message);
  assert.equal(app.document.querySelector('.toast-msg img'), null);
});
