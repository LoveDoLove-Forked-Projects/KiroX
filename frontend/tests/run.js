/** @file 跨平台发现测试文件，避免依赖 Shell 通配符或误加载业务文件。 */

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = new URL('./', import.meta.url);
const files = fs
  .readdirSync(testDirectory)
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => fileURLToPath(new URL(file, testDirectory)));
const result = spawnSync(process.execPath, ['--experimental-vm-modules', '--test', ...files], {
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
