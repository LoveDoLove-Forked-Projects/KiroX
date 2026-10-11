/** @file 语言检测、文本插值、DOM 翻译与日志翻译接口。 */

import { getAppApi } from '../platform/wails.js';

import { DICT } from './dictionaries.js';
import { LOG_PHRASES } from './logs/rules.js';

/**
 * 查找文案并替换占位符，缺少译文时使用调用方提供的回退文本。
 * @param {string} key 点分隔的翻译键。
 * @param {Object|string} [varsOrFallback] 插值参数或回退文本。
 * @param {string} [fallbackMaybe] 同时使用插值参数时的回退文本。
 * @returns {string} 翻译后的文本。
 */
export function tr(key, varsOrFallback, fallbackMaybe) {
  let vars = null;
  let fallback = fallbackMaybe;
  if (typeof varsOrFallback === 'string') fallback = varsOrFallback;
  else if (varsOrFallback && typeof varsOrFallback === 'object') vars = varsOrFallback;
  if (I18N && typeof I18N.t === 'function') {
    const value = I18N.t(key, vars);
    if (value && value !== key) return value;
  }
  if (fallback == null) return key;
  return vars
    ? fallback.replace(/\{(\w+)\}/g, function (_, name) {
        return vars[name] != null ? vars[name] : '{' + name + '}';
      })
    : fallback;
}

const STORAGE_KEY = 'kirox-language';

const DEFAULT_LANG = 'zh';

let currentLang = DEFAULT_LANG;

let languageRevision = 0;

export function getByPath(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    if (cur == null) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

export function interpolate(s, vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, function (_, k) {
    return vars[k] != null ? vars[k] : '{' + k + '}';
  });
}

export function t(key, vars) {
  let v = getByPath(DICT[currentLang], key);
  if (v == null) v = getByPath(DICT[DEFAULT_LANG], key);
  if (v == null) return key;
  return interpolate(v, vars);
}

export function applyI18n(root) {
  root = root || document;

  const nodes = root.querySelectorAll('[data-i18n]');
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const key = el.getAttribute('data-i18n');
    const val = t(key);

    el.textContent = val;
  }

  const phs = root.querySelectorAll('[data-i18n-placeholder]');
  for (let j = 0; j < phs.length; j++) {
    phs[j].setAttribute('placeholder', t(phs[j].getAttribute('data-i18n-placeholder')));
  }

  const titles = root.querySelectorAll('[data-i18n-title]');
  for (let k = 0; k < titles.length; k++) {
    titles[k].setAttribute('title', t(titles[k].getAttribute('data-i18n-title')));
  }
  const ariaLabels = root.querySelectorAll('[data-i18n-aria-label]');
  for (let l = 0; l < ariaLabels.length; l++) {
    ariaLabels[l].setAttribute('aria-label', t(ariaLabels[l].getAttribute('data-i18n-aria-label')));
  }
}

export function setLanguage(lang) {
  languageRevision++;
  if (!DICT[lang]) lang = DEFAULT_LANG;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {}
  document.documentElement.setAttribute('lang', lang);
  applyI18n(document);

  try {
    const evt = new CustomEvent('i18n:changed', { detail: { lang: lang } });
    window.dispatchEvent(evt);
  } catch (e) {}
}

export function getLanguage() {
  return currentLang;
}

/**
 * 按后端设置、本地缓存、系统语言、浏览器语言的顺序确定初始语言。
 * @returns {Promise<boolean>} 是否应用了默认语言；检测期间的新选择优先。
 */
export async function init() {
  const revision = languageRevision;
  let lang = '';

  try {
    if (getAppApi() && getAppApi().GetLanguage) {
      lang = await getAppApi().GetLanguage();
    }
  } catch (e) {}

  if (!lang) {
    try {
      lang = localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {}
  }

  if (!lang) {
    try {
      if (getAppApi() && getAppApi().GetOSLanguage) {
        lang = await getAppApi().GetOSLanguage();
      }
    } catch (e) {}
  }

  if (!lang && navigator.language) {
    const nv = navigator.language.toLowerCase();
    if (nv.indexOf('zh') === 0) lang = 'zh';
    else if (nv.indexOf('ja') === 0) lang = 'ja';
    else lang = 'en';
  }
  if (!DICT[lang]) lang = DEFAULT_LANG;
  // 异步检测完成时，不能覆盖用户已经做出的语言选择。
  if (languageRevision !== revision) return false;
  setLanguage(lang);
  return true;
}

export const I18N = { t, applyI18n, setLanguage, getLanguage, init, DICT, translateLog };

export function translateLog(text) {
  if (!text) return text;
  const lang = getLanguage();
  if (lang === 'zh' || !LOG_PHRASES[lang]) return text;
  const rules = LOG_PHRASES[lang];
  let out = text;
  let i;
  for (i = 0; i < rules.tags.length; i++) {
    out = out.split(rules.tags[i][0]).join(rules.tags[i][1]);
  }
  for (i = 0; i < rules.phrases.length; i++) {
    out = out.split(rules.phrases[i][0]).join(rules.phrases[i][1]);
  }
  for (i = 0; i < rules.regexes.length; i++) {
    out = out.replace(rules.regexes[i][0], rules.regexes[i][1]);
  }
  return out;
}
