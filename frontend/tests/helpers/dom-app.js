/** @file 使用完整页面 DOM 和内存 Wails 适配器验证模块集成。 */

import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { renderHtml } from '../../tooling/html.js';
import { createModuleLoader } from './modules.js';
import { initialSettings, flushRequests } from './settings-app.js';

export async function createDomApp(t, options = {}) {
  const errors = [];
  const calls = [];
  const intervals = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error));
  const dom = new JSDOM(renderHtml(fileURLToPath(new URL('../../index.html', import.meta.url))), {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    virtualConsole,
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  Object.defineProperty(window.document, 'readyState', { value: 'complete' });
  window.requestAnimationFrame = (callback) => callback();
  window.setTimeout = () => 1;
  window.setInterval = (callback) => {
    intervals.push(callback);
    return intervals.length;
  };
  const settings = { ...initialSettings, autoProbeProxies: false, ...options.settings };
  const proxies = options.proxies || [];
  const backend = {
    GetAppSettings: async () => settings,
    GetLanguage: async () => settings.language,
    GetOSLanguage: async () => 'en',
    GetOutlookAccounts: async () => options.accounts || [],
    GetDataDir: async () => 'data',
    GetResultOutputDir: async () => 'output',
    ListProxyPool: async () => proxies,
    GetMoeMailConfigs: async () => [],
    GetCloudMailConfigs: async () => [],
    GetMailNestConfig: async () => ({}),
    OpenURL: async (url) => calls.push(['OpenURL', url]),
    UpdateProxyEntry: async (...args) => {
      calls.push(['UpdateProxyEntry', ...args]);
      return {};
    },
    SaveAppSettings: async (submitted) => ({ settings: { ...submitted } }),
    GetStatus: async () => ({
      running: false,
      success: 0,
      failed: 0,
      completed: 0,
      total: 0,
      elapsed: 0,
    }),
    GetLogs: async () => [],
    ...options.backend,
  };
  window.go = { main: { App: backend } };
  window.runtime = { Environment: async () => ({ platform: 'windows' }) };
  const loadModule = createModuleLoader(dom.getInternalVMContext());
  await loadModule('main.js');
  await flushRequests();

  return { window, document: window.document, loadModule, calls, errors, intervals };
}
