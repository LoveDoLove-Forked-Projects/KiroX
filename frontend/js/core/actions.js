/** @file 声明式页面动作注册表与统一事件委托。 */

import { getAppApi } from '../platform/wails.js';

import { checkUpdateManually, closeUpdateModal, openReleasePage } from '../about/updates.js';
import {
  addICloudAccounts,
  clearAllICloudAccounts,
  closeAddICloudModal,
  deleteICloudAccount,
  importICloudFile,
  openAddICloudModal,
} from '../accounts/icloud.js';
import {
  addOutlookAccounts,
  closeAddOutlookModal,
  importOutlookFile,
  openAddOutlookModal,
} from '../accounts/outlook/accounts.js';
import {
  clearAllOutlookAccounts,
  clearRegisteredOutlookAccounts,
  deleteOutlookAccount,
} from '../accounts/outlook/actions.js';
import { changeOutlookPage } from '../accounts/outlook/view.js';
import { cycleLanguage } from './language.js';
import { switchPage } from './navigation.js';
import { deleteCloudMailConfig, inlineAddCloudMail } from '../email/cloudmail/config-actions.js';
import { inlineTestCloudMail, testCloudMailConfigByIndex } from '../email/cloudmail/config-test.js';
import { selectAllCloudMailDomains, toggleCloudMailDomain } from '../email/cloudmail/domains.js';
import { inlineAddMailNest, inlineTestMailNest } from '../email/mailnest.js';
import { deleteMoeMailConfig, inlineAddMoeMail } from '../email/moemail/config-actions.js';
import { inlineTestMoeMail, testMoeMailConfigByIndex } from '../email/moemail/config-test.js';
import { selectAllMoeMailDomains, toggleMoeMailDomain } from '../email/moemail/domains.js';
import { selectEmailProvider } from '../email/selection.js';
import { batchDeleteIp, deleteIpEntry, toggleIpEnabled } from '../proxy/actions.js';
import { submitIpForm } from '../proxy/form-submit.js';
import { closeIpFormModal, editIpEntry, openIpFormModal, switchIpFormTab } from '../proxy/form.js';
import { onIpFilterStatus, onIpSearch, toggleIpSelect, toggleIpSelectAll } from '../proxy/list.js';
import { batchTestIp, testIpEntry } from '../proxy/probes.js';
import { closeIpResultModal } from '../proxy/result.js';
import { loadIpList } from '../proxy/service.js';
import { syncEmailProxyField, syncVolumeLabel } from '../settings/controls.js';
import {
  resetDataDir,
  resetResultOutputDir,
  selectDataDir,
  selectResultOutputDir,
} from '../settings/directories.js';
import {
  clearFingerprintCache,
  clearPersistentLogs,
  openLogsDirectory,
} from '../settings/maintenance.js';
import { saveAppSettings } from '../settings/persistence.js';
import { toggleTheme } from '../settings/theme.js';
import { startTask, stopTask } from '../tasks/controller.js';
import { closeNewTaskModal, openNewTaskModal } from '../tasks/dialog.js';
import { copyLogs } from '../tasks/logs.js';
import { closeConfirmModal, confirmAction } from '../ui/confirm.js';
import { toggleDropdown } from '../ui/dropdown.js';
import { closeApp, maximizeApp, minimizeApp } from '../ui/window.js';

const actions = {
  addICloudAccounts: addICloudAccounts,
  addOutlookAccounts: addOutlookAccounts,
  batchDeleteIp: batchDeleteIp,
  batchTestIp: batchTestIp,
  changeOutlookPage: (element) => changeOutlookPage(Number(element.dataset.value)),
  checkUpdateManually: checkUpdateManually,
  clearAllICloudAccounts: clearAllICloudAccounts,
  clearAllOutlookAccounts: clearAllOutlookAccounts,
  clearFingerprintCache: clearFingerprintCache,
  clearPersistentLogs: clearPersistentLogs,
  clearRegisteredOutlookAccounts: (element) =>
    clearRegisteredOutlookAccounts(element.dataset.value),
  closeAddICloudModal: closeAddICloudModal,
  closeAddOutlookModal: closeAddOutlookModal,
  closeApp: closeApp,
  closeConfirmModal: closeConfirmModal,
  closeIpFormModal: closeIpFormModal,
  closeIpResultModal: closeIpResultModal,
  closeNewTaskModal: closeNewTaskModal,
  closeUpdateModal: closeUpdateModal,
  confirmAction: confirmAction,
  copyLogs: copyLogs,
  cycleLanguage: cycleLanguage,
  deleteCloudMailConfig: (element) => deleteCloudMailConfig(Number(element.dataset.value)),
  deleteICloudAccount: (element) => deleteICloudAccount(element.dataset.value),
  deleteIpEntry: (element) => deleteIpEntry(element.dataset.value),
  deleteMoeMailConfig: (element) => deleteMoeMailConfig(Number(element.dataset.value)),
  deleteOutlookAccount: (element) => deleteOutlookAccount(element.dataset.value),
  editIpEntry: (element) => editIpEntry(element.dataset.value),
  importICloudFile: importICloudFile,
  importOutlookFile: importOutlookFile,
  inlineAddCloudMail: inlineAddCloudMail,
  inlineAddMailNest: inlineAddMailNest,
  inlineAddMoeMail: inlineAddMoeMail,
  inlineTestCloudMail: inlineTestCloudMail,
  inlineTestMailNest: inlineTestMailNest,
  inlineTestMoeMail: inlineTestMoeMail,
  loadIpList: loadIpList,
  maximizeApp: maximizeApp,
  minimizeApp: minimizeApp,
  onIpFilterStatus: onIpFilterStatus,
  onIpSearch: onIpSearch,
  openAddICloudModal: openAddICloudModal,
  openAddOutlookModal: openAddOutlookModal,
  openIpFormModal: openIpFormModal,
  openLogsDirectory: openLogsDirectory,
  openNewTaskModal: openNewTaskModal,
  openReleasePage: openReleasePage,
  openURL: (element) => getAppApi().OpenURL(element.dataset.value),
  resetDataDir: resetDataDir,
  resetResultOutputDir: resetResultOutputDir,
  saveAppSettings: saveAppSettings,
  selectAllCloudMailDomains: selectAllCloudMailDomains,
  selectAllMoeMailDomains: selectAllMoeMailDomains,
  selectDataDir: selectDataDir,
  selectEmailProvider: (element) => selectEmailProvider(element.dataset.value),
  selectResultOutputDir: selectResultOutputDir,
  startTask: startTask,
  stopTask: stopTask,
  submitIpForm: submitIpForm,
  switchIpFormTab: (element) => switchIpFormTab(element.dataset.value),
  switchPage: (element) => switchPage(element.dataset.value),
  syncEmailProxyField: syncEmailProxyField,
  syncVolumeLabel: syncVolumeLabel,
  testCloudMailConfigByIndex: (element) =>
    testCloudMailConfigByIndex(Number(element.dataset.value)),
  testIpEntry: (element) => testIpEntry(element.dataset.value),
  testMoeMailConfigByIndex: (element) => testMoeMailConfigByIndex(Number(element.dataset.value)),
  toggleCloudMailDomain: (element) => toggleCloudMailDomain(element.dataset.value),
  toggleDropdown: (element) => toggleDropdown(element),
  toggleIpEnabled: (element) => toggleIpEnabled(element.dataset.value, element.checked),
  toggleIpSelect: (element) => toggleIpSelect(element.dataset.value, element),
  toggleIpSelectAll: (element) => toggleIpSelectAll(element),
  toggleMoeMailDomain: (element) => toggleMoeMailDomain(element.dataset.value),
  toggleTheme: toggleTheme,
};
/**
 * 通过动作白名单分发事件，动态重渲染的元素无需重新绑定监听器。
 * @param {Document|HTMLElement} [root=document] 事件委托根节点。
 */
export function bindActions(root = document) {
  for (const [eventType, attribute] of [
    ['click', 'data-action'],
    ['input', 'data-input-action'],
    ['change', 'data-change-action'],
  ]) {
    root.addEventListener(eventType, (event) => {
      const element = event.target.closest?.('[' + attribute + ']');
      if (!element || element.disabled) return;
      const action = actions[element.getAttribute(attribute)];
      if (!action) return;
      // 仅拦截操作链接的导航，保留复选框等控件的浏览器默认行为。
      if (element.tagName === 'A') event.preventDefault();
      action(element);
    });
  }
  root.addEventListener('dropdown:change', (event) => {
    const { action, value } = event.detail;
    actions[action]?.({ dataset: { value } });
  });
}
