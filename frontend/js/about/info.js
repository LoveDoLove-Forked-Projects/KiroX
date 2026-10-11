/** @file 关于页面版本信息与更新说明的加载状态。 */

import { getAppApi } from '../platform/wails.js';

import { renderChangelog } from './changelog.js';
import { tr } from '../i18n/index.js';

const infoState = {
  changelog: { state: 'idle', error: '' },
};

export function renderInfoChangelogState() {
  const el = document.getElementById('info-changelog');
  if (!el || infoState.changelog.state === 'idle' || infoState.changelog.state === 'ready') return;
  const key =
    infoState.changelog.state === 'loading'
      ? 'common.loading'
      : infoState.changelog.state === 'empty'
        ? 'common.noData'
        : 'common.loadFailed';
  const fallback =
    infoState.changelog.state === 'loading'
      ? '加载中...'
      : infoState.changelog.state === 'empty'
        ? '暂无更新说明'
        : '加载失败';
  const suffix = infoState.changelog.error ? ': ' + infoState.changelog.error : '';
  el.textContent = tr(key, fallback) + suffix;
  el.style.color = 'var(--text-muted)';
}

export function setInfoChangelogState(state, error) {
  infoState.changelog = { state: state, error: error || '' };
  renderInfoChangelogState();
}

export async function loadInfoVersion() {
  try {
    const ver = await getAppApi().GetCurrentVersion();
    if (ver) {
      ['info-version-detail', 'info-version-detail2'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.textContent = ver;
      });
    }
  } catch (e) {}

  const changelogEl = document.getElementById('info-changelog');
  const latestEl = document.getElementById('info-latest-version');
  const dateEl = document.getElementById('info-release-date');
  const tagEl = document.getElementById('info-changelog-version');
  setInfoChangelogState('loading');
  try {
    const result = await getAppApi().CheckUpdate();
    if (result.error) {
      setInfoChangelogState('error', result.error);
      return;
    }
    if (latestEl) {
      latestEl.textContent = result.latestVersion || '-';
      latestEl.style.color = result.hasUpdate ? 'var(--success)' : 'var(--text)';
    }
    if (dateEl) dateEl.textContent = result.releaseDate || '-';
    if (tagEl) tagEl.textContent = result.latestVersion || '-';
    const banner = document.getElementById('info-update-banner');
    const bannerVer = document.getElementById('info-banner-version');
    if (banner) banner.style.display = result.hasUpdate ? 'block' : 'none';
    if (bannerVer) bannerVer.textContent = result.latestVersion || '';
    if (changelogEl) {
      const body = (result.changelog || '').trim();
      if (body) {
        infoState.changelog = { state: 'ready', error: '' };
        changelogEl.style.color = '';
        changelogEl.innerHTML = renderChangelog(body);
      } else {
        setInfoChangelogState('empty');
      }
    }
  } catch (e) {
    setInfoChangelogState('error');
  }
}
