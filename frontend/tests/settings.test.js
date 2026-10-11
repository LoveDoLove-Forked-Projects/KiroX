/** @file 验证设置重构后的异步保存行为。 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, flushRequests } from './helpers/settings-app.js';

test('a theme shortcut waits for a full save and retains its saved fields', async () => {
  const app = await createApp();
  app.element('setting-sound-volume').value = 25;
  const save = app.api.saveAppSettings();
  app.api.toggleTheme();
  await flushRequests();
  assert.equal(app.requests.length, 1);
  await app.finish(0);
  await save;
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].payload.soundVolume, 25);
  await app.finish(1);
  assert.equal(app.backend().soundVolume, 25);
  assert.equal(app.backend().theme, 'dark');
  assert.equal(app.element('setting-theme').dataset.value, 'dark');
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('edits made while a save is pending remain dirty and can be saved later', async () => {
  const app = await createApp();
  app.element('setting-sound-volume').value = 25;
  const save = app.api.saveAppSettings();
  await flushRequests();
  app.element('setting-sound-volume').value = 40;
  await app.finish(0);
  await save;
  assert.equal(app.api.collectAppSettings().soundVolume, 40);
  assert.equal(app.api.settingsHaveChanges(), true);
  const retry = app.api.saveAppSettings();
  await flushRequests();
  await app.finish(1);
  await retry;
  assert.equal(app.backend().soundVolume, 40);
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('rapid theme changes allow only one pending request and retain the latest choice', async () => {
  const app = await createApp();
  app.api.toggleTheme();
  app.api.toggleTheme();
  app.api.toggleTheme();
  await flushRequests();
  for (let index = 0; index < 3; index++) {
    assert.equal(app.requests.length, index + 1);
    assert.equal(app.requests.filter((request) => !request.finished).length, 1);
    await app.finish(index);
  }
  assert.deepEqual(
    app.requests.map((request) => request.payload.theme),
    ['dark', 'light', 'dark'],
  );
  assert.equal(app.api.collectAppSettings().theme, 'dark');
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('a failed theme save remains dirty and a manual retry succeeds', async () => {
  const app = await createApp();
  app.api.toggleTheme();
  await flushRequests();
  await app.finish(0, 'save failed');
  assert.equal(app.api.settingsHaveChanges(), true);
  assert.equal(app.api.settingsSaving, false);
  const retry = app.api.saveAppSettings();
  await flushRequests();
  await app.finish(1);
  await retry;
  assert.equal(app.backend().theme, 'dark');
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('a failed queued write does not prevent a later preference write', async () => {
  const app = await createApp();
  app.api.toggleTheme();
  app.api.toggleTheme();
  await flushRequests();
  await app.finish(0, 'save failed');
  assert.equal(app.requests.length, 2);
  await app.finish(1);
  assert.equal(app.backend().theme, 'light');
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('language shortcuts share the queue and survive an older full-save response', async () => {
  const app = await createApp();
  app.element('setting-sound-volume').value = 25;
  const save = app.api.saveAppSettings();
  app.api.cycleLanguage();
  await flushRequests();
  assert.equal(app.api.I18N.getLanguage(), 'en');
  assert.equal(app.requests.length, 1);
  await app.finish(0);
  await save;
  assert.equal(app.api.I18N.getLanguage(), 'en');
  assert.equal(app.requests[1].payload.language, 'en');
  assert.equal(app.requests[1].payload.soundVolume, 25);
  await app.finish(1);
  assert.equal(app.backend().language, 'en');
  assert.equal(app.requests.length, 2);
  assert.equal(app.api.settingsHaveChanges(), false);
});

test('language changes preserve unsaved MailNest credentials', async () => {
  const app = await createApp();
  app.element('mailnest-inline-apikey').value = 'draft-key';
  app.element('mailnest-inline-project-code').value = 'draft-project';
  app.api.I18N.setLanguage('en');
  assert.equal(app.element('mailnest-inline-apikey').value, 'draft-key');
  assert.equal(app.element('mailnest-inline-project-code').value, 'draft-project');
  assert.equal(
    app.element('settings-mailnest-summary').textContent,
    app.api.tr('mailnest.summaryActive'),
  );
});
