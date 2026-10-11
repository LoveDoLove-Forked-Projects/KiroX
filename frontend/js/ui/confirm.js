/** @file 通用确认弹窗与一次性确认回调。 */

const confirmState = {
  callback: null,
};

export function showConfirmModal(title, message, btnText, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-action-btn').textContent = btnText || '确认';
  confirmState.callback = callback;
  document.getElementById('confirm-modal').classList.add('show');
}

export function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('show');
  confirmState.callback = null;
}

export function confirmAction() {
  const cb = confirmState.callback;
  closeConfirmModal();
  if (cb) cb();
}
