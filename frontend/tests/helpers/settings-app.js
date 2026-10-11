/** @file 设置回归测试的 DOM 与 Wails 适配器。 */
import assert from 'node:assert/strict';
import { createModuleLoader } from './modules.js';

export const initialSettings = {
  emailProxyMode: 'follow-task',
  emailProxy: '',
  otpTimeoutSeconds: 120,
  retryProfile: 'standard',
  stopOnRisk: true,
  soundEnabled: true,
  desktopNotifications: true,
  soundVolume: 70,
  autoCheckUpdates: true,
  theme: 'light',
  language: 'zh',
  persistentLogs: false,
  logRetentionDays: 7,
  autoProbeProxies: true,
  moeMailExpiryMinutes: 60,
};

const dropdownValues = {
  'setting-email-proxy-mode': ['direct', 'follow-task', 'custom'],
  'setting-retry-profile': ['fast', 'standard', 'stable'],
  'setting-theme': ['system', 'light', 'dark'],
  'setting-language': ['zh', 'en', 'ja'],
};

function makeElement(classes = []) {
  const classNames = new Set(classes);
  const attributes = {};
  return {
    innerHTML: '',
    value: '',
    checked: false,
    dataset: {},
    textContent: '',
    style: { setProperty() {} },
    classList: {
      contains: (name) => classNames.has(name),
      add: (name) => classNames.add(name),
      remove: (name) => classNames.delete(name),
      toggle(name, enabled) {
        if (enabled) classNames.add(name);
        else classNames.delete(name);
      },
    },
    getAttribute: (name) => attributes[name] ?? null,
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete attributes[name];
    },
    hasAttribute: (name) => Object.hasOwn(attributes, name),
    toggleAttribute(name, enabled) {
      if (enabled) attributes[name] = '';
      else delete attributes[name];
    },
    getBoundingClientRect: () => ({ top: 0, bottom: 30 }),
    addEventListener() {},
    appendChild() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    remove() {},
  };
}

export async function flushRequests() {
  await new Promise((resolve) => setImmediate(resolve));
}

export async function createApp(options = {}) {
  const elements = new Map();
  const listeners = new Map();
  const requests = [];
  let backend = { ...initialSettings, ...options.settings };
  const savedMailNest = { apiKey: 'saved-key', projectCode: 'saved-project' };

  function element(id) {
    if (!elements.has(id)) {
      const values = dropdownValues[id];
      const control = makeElement(values ? ['custom-dropdown'] : []);
      if (values) {
        const label = makeElement();
        const options = values.map((value) => {
          const option = makeElement(['dropdown-option']);
          option.setAttribute('data-value', value);
          option.textContent = value;
          return option;
        });
        control.querySelector = (selector) =>
          selector === '.dropdown-selected-text' ? label : null;
        control.querySelectorAll = (selector) => (selector === '.dropdown-option' ? options : []);
      }
      elements.set(id, control);
    }
    return elements.get(id);
  }

  const context = {
    console,
    setTimeout() {},
    setInterval() {},
    requestAnimationFrame() {},
    CustomEvent: function (type, options) {
      this.type = type;
      this.detail = options.detail;
    },
    localStorage: { getItem: () => null, setItem() {} },
    document: {
      body: { appendChild() {} },
      documentElement: makeElement(),
      head: { appendChild() {} },
      getElementById: element,
      querySelector: () => element('scroll-root'),
      querySelectorAll: () => [],
      createElement: () => makeElement(),
      addEventListener() {},
    },
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) || []) callback(event);
    },
    go: {
      main: {
        App: {
          GetLanguage: async () => backend.language,
          GetOSLanguage: async () => options.osLanguage || 'en',
          GetMailNestConfig: async () => ({ ...savedMailNest }),
          SaveAppSettings(settings) {
            return new Promise((resolve) =>
              requests.push({
                payload: JSON.parse(JSON.stringify(settings)),
                resolve,
                finished: false,
              }),
            );
          },
        },
      },
    },
  };
  context.window = context;
  const loadModule = createModuleLoader(context);
  const api = {};
  for (const filename of [
    'i18n/index.js',
    'settings/persistence.js',
    'settings/snapshot.js',
    'settings/controls.js',
    'settings/theme.js',
    'core/language.js',
    'email/mailnest.js',
  ]) {
    Object.assign(api, await loadModule(filename));
  }
  const { settingsState } = await loadModule('settings/state.js');
  Object.defineProperty(api, 'settingsSaving', { get: () => settingsState.saving });
  const { registerLanguageRefreshHandlers } = await loadModule('core/refresh.js');
  registerLanguageRefreshHandlers();
  api.renderAppSettings({ ...backend });
  const startup = api.initializeLanguagePreferences();
  if (!options.deferStartup) await startup;
  await api.loadMailNestConfig();

  return {
    api,
    element,
    requests,
    startup,
    backend: () => backend,
    async finish(index, error) {
      const request = requests[index];
      assert.ok(request && !request.finished, 'a pending backend request must exist');
      request.finished = true;
      if (!error) backend = { ...request.payload };
      request.resolve(error ? { error } : { settings: { ...backend } });
      await flushRequests();
    },
  };
}
