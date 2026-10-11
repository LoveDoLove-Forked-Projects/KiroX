/** @file 验证设置重构后的异步保存行为。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, flushRequests } from './helpers/settings-app.js';

test('first launch persists the detected language before marking settings clean', async () => {
  const app = await createApp({ settings: { language: '' }, osLanguage: 'en', deferStartup: true });
  await flushRequests();
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].payload.language, 'en');
  assert.equal(app.backend().language, '');
  assert.equal(app.api.settingsHaveChanges(), true);
  await app.finish(0);
  await app.startup;
  assert.equal(app.backend().language, 'en');
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('failed first-launch language persistence remains dirty and can be retried', async () => {
  const app = await createApp({ settings: { language: '' }, deferStartup: true });
  await flushRequests();
  await app.finish(0, 'save failed');
  await app.startup;
  assert.equal(app.backend().language, '');
  assert.equal(app.api.settingsHaveChanges(), true);
  const retry = app.api.saveAppSettings();
  await flushRequests();
  await app.finish(1);
  await retry;
  assert.equal(app.backend().language, 'en');
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('first-launch language persistence preserves unrelated edits made while waiting', async () => {
  const app = await createApp({ settings: { language: '' }, deferStartup: true });
  await flushRequests();
  app.element('setting-sound-volume').value = 40;
  await app.finish(0);
  await app.startup;
  assert.equal(app.backend().soundVolume, 70);
  assert.equal(app.api.collectAppSettings().soundVolume, 40);
  assert.equal(app.api.settingsHaveChanges(), true);
});

test('a newer language choice survives a pending first-launch language save', async () => {
  const app = await createApp({ settings: { language: '' }, deferStartup: true });
  await flushRequests();
  app.api.cycleLanguage();
  assert.equal(app.api.I18N.getLanguage(), 'ja');
  await app.finish(0);
  await app.startup;
  assert.equal(app.api.I18N.getLanguage(), 'ja');
  assert.equal(app.api.collectAppSettings().language, 'ja');
  assert.equal(app.requests.length, 2);
  await app.finish(1);
  assert.equal(app.backend().language, 'ja');
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('delayed language detection preserves a dropdown draft without saving it', async () => {
  let finishDetection;
  const detectedLanguage = new Promise((resolve) => {
    finishDetection = resolve;
  });
  const app = await createApp({
    settings: { language: '' },
    osLanguage: detectedLanguage,
    deferStartup: true,
  });
  await flushRequests();
  app.api.setSettingValue('setting-language', 'ja');
  finishDetection('en');
  await flushRequests();
  assert.equal(app.api.collectAppSettings().language, 'ja');
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].payload.language, 'en');
  await app.finish(0);
  await app.startup;
  assert.equal(app.backend().language, 'en');
  assert.equal(app.api.collectAppSettings().language, 'ja');
  assert.equal(app.api.settingsHaveChanges(), true);
});

test('delayed language detection cannot override a newer sidebar selection', async () => {
  let finishDetection;
  const detectedLanguage = new Promise((resolve) => {
    finishDetection = resolve;
  });
  const app = await createApp({
    settings: { language: '' },
    osLanguage: detectedLanguage,
    deferStartup: true,
  });
  await flushRequests();
  app.api.cycleLanguage();
  await flushRequests();
  finishDetection('ja');
  await app.startup;
  await app.finish(0);
  assert.equal(app.api.I18N.getLanguage(), 'en');
  assert.equal(app.api.collectAppSettings().language, 'en');
  assert.equal(app.backend().language, 'en');
  assert.equal(app.requests.length, 1);
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('saving unrelated settings during language detection does not suppress the detected default', async () => {
  let finishDetection;
  const detectedLanguage = new Promise((resolve) => {
    finishDetection = resolve;
  });
  const app = await createApp({
    settings: { language: '' },
    osLanguage: detectedLanguage,
    deferStartup: true,
  });
  await flushRequests();
  app.element('setting-sound-volume').value = 25;
  const save = app.api.saveAppSettings();
  await flushRequests();
  await app.finish(0);
  await save;
  assert.equal(app.backend().language, '');
  finishDetection('en');
  await flushRequests();
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].payload.language, 'en');
  assert.equal(app.requests[1].payload.soundVolume, 25);
  await app.finish(1);
  await app.startup;
  assert.equal(app.backend().language, 'en');
  assert.equal(app.api.I18N.getLanguage(), 'en');
  assert.equal(app.api.settingsHaveChanges(), false);
});
