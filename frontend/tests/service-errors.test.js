/** @file 验证人工验证提示翻译后仍保留服务诊断字段。 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createDomApp } from './helpers/dom-app.js';

test('translated verification errors retain HTTP status, error code and request ID', async (t) => {
  const app = await createDomApp(t);
  const i18n = await app.loadModule('i18n/index.js');
  const raw =
    '发送验证码失败: 验证码未确认发送；服务要求人工验证 (CAPTCHA)，请通过官方页面完成验证 (HTTP 400, AUTHENTICATION_FAILED, requestId=sample-id)';
  for (const language of ['en', 'ja']) {
    i18n.setLanguage(language);
    const translated = i18n.translateLog(raw);
    assert.equal(translated.includes('验证码未确认发送'), false);
    assert.equal(translated.includes('官方页面'), false);
    for (const field of ['HTTP 400', 'AUTHENTICATION_FAILED', 'requestId=sample-id', 'CAPTCHA']) {
      assert.equal(translated.includes(field), true);
    }
  }
});
