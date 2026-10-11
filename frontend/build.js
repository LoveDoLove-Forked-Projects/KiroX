/** @file 组合 HTML、合并 CSS，并复制浏览器模块与 Wails 静态资源。 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHtml } from './tooling/html.js';
import { bundleStyles } from './tooling/styles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distDir = path.join(__dirname, 'dist');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

const html = renderHtml(path.join(__dirname, 'index.html'));
const stylesheet = path.join(distDir, 'css', 'main.css');
const styles = await bundleStyles(path.join(__dirname, 'css', 'main.css'), stylesheet);

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'), html);
fs.mkdirSync(path.dirname(stylesheet), { recursive: true });
fs.writeFileSync(stylesheet, styles);
copyDir(path.join(__dirname, 'assets'), path.join(distDir, 'assets'));

const fontsDir = path.join(__dirname, 'fonts');
if (fs.existsSync(fontsDir)) copyDir(fontsDir, path.join(distDir, 'fonts'));

const jsDir = path.join(__dirname, 'js');
copyDir(jsDir, path.join(distDir, 'js'));

console.log('Build completed: frontend/dist/');
