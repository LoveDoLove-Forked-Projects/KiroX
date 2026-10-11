/** @file 验证 HTML 片段引用和 CSS 合并的构建约束。 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import postcss from 'postcss';
import { renderHtml } from '../tooling/html.js';
import { bundleStyles } from '../tooling/styles.js';

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kirox-markup-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [filename, content] of Object.entries(files)) {
    const destination = path.join(root, filename);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }
  return root;
}

test('HTML includes resolve relative to each fragment and retain document order', (t) => {
  const root = fixture(t, {
    'index.html': '<main><!-- @include ./pages/page.html --><footer>footer</footer></main>',
    'pages/page.html': '<section><!-- @include ../parts/title.html --><p>body</p></section>',
    'parts/title.html': '<h1 data-i18n="page.overview">标题</h1>',
  });
  assert.equal(
    renderHtml(path.join(root, 'index.html')),
    '<main><section><h1 data-i18n="page.overview">标题</h1><p>body</p></section><footer>footer</footer></main>',
  );
});

test('missing fragments, unsupported extensions and cyclic includes fail the build', (t) => {
  const root = fixture(t, {
    'missing.html': '<!-- @include ./absent.html -->',
    'extension.html': '<!-- @include ./entry.js -->',
    'cycle.html': '<!-- @include ./nested/cycle.html -->',
    'nested/cycle.html': '<!-- @include ../cycle.html -->',
  });
  assert.throws(() => renderHtml(path.join(root, 'missing.html')), { code: 'ENOENT' });
  assert.throws(() => renderHtml(path.join(root, 'extension.html')), /必须使用 .html/);
  assert.throws(() => renderHtml(path.join(root, 'cycle.html')), /循环引用/);
});

test('CSS imports expand in cascade order and retain media conditions', async (t) => {
  const root = fixture(t, {
    'main.css': "@import './base/reset.css';\n@import './page.css';",
    'base/reset.css': "@import '../tokens.css';\n.card { color: red; }",
    'tokens.css': ':root { --accent: blue; }',
    'page.css':
      '.card { color: var(--accent); }\n@media (max-width: 680px) { .card { display: block; } }',
  });
  const output = await bundleStyles(path.join(root, 'main.css'), path.join(root, 'dist/main.css'));
  const css = postcss.parse(output);
  const colors = [];
  css.walkDecls('color', (declaration) => colors.push(declaration.value));
  assert.deepEqual(colors, ['red', 'var(--accent)']);
  assert.equal(
    css.nodes.some((node) => node.type === 'atrule' && node.name === 'import'),
    false,
  );
  const media = css.nodes.find((node) => node.type === 'atrule' && node.name === 'media');
  assert.equal(media.params, '(max-width: 680px)');
  assert.equal(media.nodes[0].nodes[0].value, 'block');
});
