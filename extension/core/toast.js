// core/toast.js - UI toast notification system

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const iconEl = document.createElement('span');
  iconEl.className = 'toast-icon';
  iconEl.innerText = icons[type] || 'ℹ️';

  const messageEl = document.createElement('span');
  messageEl.className = 'toast-message';
  messageEl.innerText = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => {
    removeToast(toast);
  };

  toast.appendChild(iconEl);
  toast.appendChild(messageEl);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  setTimeout(() => {
    removeToast(toast);
  }, duration);

  function removeToast(el) {
    if (el.parentNode) {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => {
        el.remove();
      }, { once: true });
    }
  }
}
window.showToast = showToast;
