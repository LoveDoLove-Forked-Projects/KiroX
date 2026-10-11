/** @file 主题偏好解析与页面主题展示。 */

export function applyThemePreference(theme) {
  let resolved = theme;
  if (theme === 'system')
    resolved =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.toggleAttribute('data-theme', resolved === 'dark');
  if (resolved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  const light = document.getElementById('theme-icon-light');
  const dark = document.getElementById('theme-icon-dark');
  if (light) light.classList.toggle('initially-hidden', resolved === 'dark');
  if (dark) dark.classList.toggle('initially-hidden', resolved !== 'dark');
}
