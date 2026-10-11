/** @file 检查组合后的 HTML 语法及所有手写 HTML、CSS 文件的长度。 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HtmlValidate } from 'html-validate';
import { renderHtml } from './html.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['index.html'];
for (const directory of ['html', 'css']) {
  files.push(
    ...fs
      .readdirSync(path.join(root, directory), { recursive: true })
      .filter((file) => /\.(html|css)$/.test(file))
      .map((file) => path.join(directory, file)),
  );
}
for (const filename of files) {
  const source = fs.readFileSync(path.join(root, filename), 'utf8');
  const count = source.trimEnd().split('\n').length;
  if (count > 300) throw new Error(`${filename} 有 ${count} 行，超过 300 行限制`);
  const header = filename.endsWith('.html') ? /^<!-- @file .+? -->/ : /^\/\* @file .+? \*\//;
  if (!header.test(source)) throw new Error(`${filename} 缺少 @file 职责注释`);
}

const validator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: {
    'no-inline-style': 'error',
    'no-style-tag': 'error',
    // 与 Prettier 的 HTML 空元素格式保持一致。
    'void-style': ['error', { style: 'selfclose' }],
    'doctype-style': ['error', { style: 'lowercase' }],
    // 波形进度条使用自定义视觉容器，并通过 progressbar 角色提供完整 ARIA 状态。
    'prefer-native-element': ['error', { exclude: ['progressbar'] }],
  },
});
const report = await validator.validateString(renderHtml(path.join(root, 'index.html')));
if (!report.valid) {
  for (const result of report.results)
    for (const message of result.messages) {
      console.error(`${message.selector || 'HTML'}: ${message.message} (${message.ruleId})`);
    }
  process.exitCode = 1;
} else console.log(`HTML 语法和 ${files.length} 个 HTML/CSS 文件的长度检查通过`);
