/** @file 构建时展开 HTML 片段，保持页面内容在首屏脚本执行前完整可用。 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * 递归展开相对路径引用；缺失文件和循环引用会直接使构建失败。
 * @param {string} filename 入口或片段的绝对路径。
 * @param {string[]} [ancestors] 当前引用链。
 * @returns {string} 完整页面 HTML。
 */
export function renderHtml(filename, ancestors = []) {
  const resolved = path.resolve(filename);
  if (ancestors.includes(resolved)) throw new Error(`HTML 片段循环引用：${resolved}`);
  const source = fs.readFileSync(resolved, 'utf8');
  return source.replace(/<!--\s*@include\s+([^\s]+)\s*-->/g, (_, relativePath) => {
    if (!relativePath.endsWith('.html'))
      throw new Error(`HTML 片段必须使用 .html：${relativePath}`);
    return renderHtml(path.resolve(path.dirname(resolved), relativePath), [...ancestors, resolved]);
  });
}
