/** @file 代理状态、类型与国家图标的展示片段。 */

import { escapeHtml } from '../ui/html.js';

export function successBadge(t) {
  return '<span class="ip-badge-success">' + t + '</span>';
}

export function errorBadge(t) {
  return '<span class="ip-badge-error">' + t + '</span>';
}

export function typeBadge(type, label) {
  const knownTypes = { residential: true, mobile: true, datacenter: true };
  const typeClass = knownTypes[type] ? type : 'unknown';
  return (
    '<span class="ip-type-badge ip-type-' + typeClass + '">' + escapeHtml(label || type) + '</span>'
  );
}

export function flagImg(cc) {
  if (!cc || cc.length !== 2) return '';
  return (
    '<img class="ip-country-flag" src="https://flagcdn.com/w40/' +
    cc.toLowerCase() +
    '.png" alt="' +
    escapeHtml(cc) +
    '">'
  );
}
