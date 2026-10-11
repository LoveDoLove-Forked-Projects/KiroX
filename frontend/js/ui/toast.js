/** @file 全局反馈消息的展示与自动移除。 */

export function showToast(msg, type) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-item' + (type === 'error' ? ' toast-error' : ' toast-success');

  const icon =
    type === 'error'
      ? '<svg viewBox="0 0 24 24" class="toast-icon"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
      : '<svg viewBox="0 0 24 24" class="toast-icon"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>';

  toast.innerHTML =
    icon +
    '<span class="toast-msg">' +
    msg +
    '</span>' +
    '<div class="toast-progress"><div class="toast-progress-bar"></div></div>';

  container.appendChild(toast);

  requestAnimationFrame(function () {
    toast.classList.add('show');
  });

  setTimeout(function () {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(function () {
      toast.remove();
    }, 400);
  }, 3000);
}
