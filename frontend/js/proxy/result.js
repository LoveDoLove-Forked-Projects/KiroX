/** @file 代理检测结果弹窗的加载态与详细信息。 */

import { tr } from '../i18n/index.js';
import { errorBadge, flagImg, successBadge, typeBadge } from './badges.js';
import { proxyState } from './state.js';
import { parseProxyUrl } from './url.js';
import { escapeHtml } from '../ui/html.js';

export function closeIpResultModal() {
  const m = document.getElementById('ip-result-modal');
  if (m) m.classList.remove('show');
  proxyState.resultView = null;
}

export function showIpResultModal(p, res) {
  const body = document.getElementById('ip-result-body');
  const m = document.getElementById('ip-result-modal');
  if (!body || !m) return;
  proxyState.resultView = { proxy: p, result: res };

  const row = function (label, valHtml) {
    return (
      '<div class="ip-result-row">' +
      '<span class="ip-result-label">' +
      label +
      '</span>' +
      '<span class="ip-result-value">' +
      valHtml +
      '</span></div>'
    );
  };

  if (!res) {
    const u0 = parseProxyUrl(p.url);
    const known = [];
    known.push(row(tr('ip.resultScheme', '协议'), escapeHtml(u0.proto || '—')));
    known.push(
      row(
        tr('ip.resultIP', '出口 IP'),
        p.probeIp
          ? '<span class="ip-result-mono">' + escapeHtml(p.probeIp) + '</span>'
          : '<span class="ip-skel ip-result-placeholder-wide"></span>',
      ),
    );
    known.push(
      row(
        tr('ip.colType', '类型'),
        p.probeType
          ? typeBadge(p.probeType, tr('ip.type.' + p.probeType, p.probeType))
          : '<span class="ip-skel ip-result-placeholder-type"></span>',
      ),
    );
    known.push(
      row(
        tr('ip.resultCountry', '国家'),
        p.probeCountryCode
          ? flagImg(p.probeCountryCode) + ' ' + escapeHtml(p.probeCountry || '—')
          : '<span class="ip-skel ip-result-placeholder-wide"></span>',
      ),
    );
    body.innerHTML =
      '<div class="ip-result-summary"><span class="ip-skel ip-result-placeholder-title"></span></div>' +
      known.join('') +
      '<div class="ip-result-actions">' +
      '<button type="button" data-action="closeIpResultModal" class="btn btn-dark" data-i18n="common.close">' +
      tr('common.close', '关闭') +
      '</button>' +
      '</div>';
    m.classList.add('show');
    return;
  }

  const ok = !!(res && !res.error && res.ok);
  const ms = res && typeof res.ms === 'number' ? res.ms : p.probeMs || 0;
  const typeLabel = (p.probeType && tr('ip.type.' + p.probeType, p.probeType)) || '—';

  let html = '';
  html +=
    '<div class="ip-result-summary">' +
    (ok
      ? successBadge(tr('ip.available', '可用') + (ms ? ' · ' + ms + 'ms' : ''))
      : errorBadge(
          tr('ip.failure', '失败') + (res && res.error ? ' · ' + escapeHtml(res.error) : ''),
        )) +
    '</div>';

  if (ok) {
    html += row(tr('ip.resultScheme', '协议'), escapeHtml(res.scheme || p._scheme || '—'));
    html += row(
      tr('ip.resultIP', '出口 IP'),
      '<span class="ip-result-mono">' + escapeHtml(res.ip || p.probeIp || '—') + '</span>',
    );
    html += row(tr('ip.colType', '类型'), typeBadge(p.probeType, typeLabel));
    html += row(
      tr('ip.resultCountry', '国家'),
      flagImg(res.countryCode || p.probeCountryCode) +
        ' ' +
        escapeHtml(res.country || p.probeCountry || '—'),
    );
    html += row(tr('ip.resultRegion', '地区'), escapeHtml(res.region || p.probeRegion || '—'));
    html += row(tr('ip.resultCity', '城市'), escapeHtml(res.city || p.probeCity || '—'));
    html += row(tr('ip.resultISP', '运营商'), escapeHtml(res.isp || p.probeIsp || '—'));
  } else {
    html += row(
      tr('ip.resultError', '错误'),
      escapeHtml((res && res.error) || p.probeError || tr('ip.unknownError', '未知错误')),
    );
  }

  html +=
    '<div class="ip-result-actions">' +
    '<button type="button" data-action="closeIpResultModal" class="btn btn-dark" data-i18n="common.close">' +
    tr('common.close', '关闭') +
    '</button>' +
    '</div>';

  body.innerHTML = html;
  m.classList.add('show');
}
