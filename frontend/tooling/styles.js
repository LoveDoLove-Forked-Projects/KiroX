/** @file 在构建时合并 CSS 模块，保留入口声明的加载顺序。 */

import fs from 'node:fs';
import postcss from 'postcss';
import postcssImport from 'postcss-import';

/**
 * @param {string} entry 样式入口的绝对路径。
 * @param {string} output 构建产物的绝对路径。
 * @returns {Promise<string>} 已展开本地 import 的 CSS。
 */
export async function bundleStyles(entry, output) {
  const result = await postcss([postcssImport()]).process(fs.readFileSync(entry, 'utf8'), {
    from: entry,
    to: output,
  });
  return result.css;
}
