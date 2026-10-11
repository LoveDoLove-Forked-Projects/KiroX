/** @file 动态 HTML 文本与属性值转义。 */

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
