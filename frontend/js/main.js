/** @file 注册页面事件并启动应用与状态轮询。 */

import { bindActions } from './core/actions.js';
import { registerKeyboardShortcuts } from './core/keyboard.js';
import { registerLanguageRefreshHandlers } from './core/refresh.js';
import { initializeApp } from './core/startup.js';
import { loadCloudMailConfigs } from './email/cloudmail/config-store.js';
import { autoTestAllCloudMailConfigs } from './email/cloudmail/config-test.js';
import { loadMailNestConfig } from './email/mailnest.js';
import { loadMoeMailConfigs } from './email/moemail/config-store.js';
import { autoTestAllMoeMailConfigs } from './email/moemail/config-test.js';
import { startTaskPolling } from './tasks/polling.js';
import { initializeDropdowns } from './ui/dropdown.js';

async function bootstrap() {
  bindActions();
  initializeDropdowns();
  registerKeyboardShortcuts();
  registerLanguageRefreshHandlers();
  await initializeApp();
  startTaskPolling();
  void loadMailNestConfig();
  void loadMoeMailConfigs().then(autoTestAllMoeMailConfigs);
  void loadCloudMailConfigs().then(autoTestAllCloudMailConfigs);
}
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
else void bootstrap();
