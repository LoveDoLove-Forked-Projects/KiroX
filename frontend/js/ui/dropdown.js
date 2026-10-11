/** @file 自定义下拉控件、程序赋值与变更事件。 */

/**
 * 打开下拉菜单并按视口定位，避免被弹窗的 overflow 裁剪。
 * @param {HTMLElement} triggerEl 下拉触发元素。
 * @param {Event} [ev] 需要阻止冒泡的调用事件。
 */
export function toggleDropdown(triggerEl, ev) {
  if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
  const wrap = triggerEl.closest('.custom-dropdown');
  if (!wrap) return;
  const wasOpen = wrap.classList.contains('open');
  closeAllDropdowns();
  if (!wasOpen) {
    wrap.classList.add('open');
    const t = wrap.querySelector('.dropdown-selected');
    if (t) t.classList.add('active');
    const o = wrap.querySelector('.dropdown-options');
    if (o) {
      const r = (t || wrap).getBoundingClientRect();
      const placement = wrap.getAttribute('data-dropdown-placement');
      o.style.position = 'fixed';
      o.style.left = r.left + 'px';
      o.style.width = r.width + 'px';
      o.style.right = 'auto';
      if (placement === 'top') {
        o.style.top = 'auto';
        o.style.bottom = window.innerHeight - r.top + 4 + 'px';
        o.style.maxHeight = Math.min(320, Math.max(80, r.top - 8)) + 'px';
      } else {
        o.style.top = r.bottom + 4 + 'px';
        o.style.bottom = 'auto';
        o.style.maxHeight = 'min(320px, calc(100vh - ' + (r.bottom + 8) + 'px))';
      }
      o.style.overflowY = 'auto';
      o.classList.add('show');
    }
  }
}

export function selectDropdownOption(el, ev) {
  if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
  const wrap = el.closest('.custom-dropdown');
  if (!wrap) return;
  const val = el.getAttribute('data-value') || '';
  const labelEl = el.querySelector('[data-dropdown-label]');
  const label = ((labelEl || el).textContent || '').trim();
  wrap.dataset.value = val;
  const txt = wrap.querySelector('.dropdown-selected-text');
  if (txt) {
    if (wrap.hasAttribute('data-rich-options')) txt.innerHTML = el.innerHTML;
    else {
      txt.textContent = label;
      const i18nKey = el.getAttribute('data-i18n');
      if (i18nKey) txt.setAttribute('data-i18n', i18nKey);
      else txt.removeAttribute('data-i18n');
    }
  }
  wrap.querySelectorAll('.dropdown-option').forEach(function (o) {
    o.classList.toggle('selected', o === el);
  });
  closeAllDropdowns();
  const action = wrap.getAttribute('data-dropdown-action');
  if (action)
    wrap.dispatchEvent(
      new CustomEvent('dropdown:change', { bubbles: true, detail: { action, value: val, label } }),
    );
  wrap.dispatchEvent(new Event('change', { bubbles: true }));
}

export function closeAllDropdowns() {
  document.querySelectorAll('.custom-dropdown.open').forEach(function (c) {
    c.classList.remove('open');
    const t = c.querySelector('.dropdown-selected');
    if (t) t.classList.remove('active');
    const o = c.querySelector('.dropdown-options');
    if (o) {
      o.classList.remove('show');

      o.style.position = '';
      o.style.top = '';
      o.style.bottom = '';
      o.style.left = '';
      o.style.width = '';
      o.style.right = '';
      o.style.maxHeight = '';
      o.style.overflowY = '';
    }
  });
}

/**
 * 同步值、选中项与显示文本；程序赋值不触发用户 change 事件。
 * @param {HTMLElement|null} wrap 自定义下拉容器。
 * @param {string} val 目标选项值。
 */
export function setDropdownValue(wrap, val) {
  if (!wrap) return;
  const opt = Array.prototype.find.call(
    wrap.querySelectorAll('.dropdown-option'),
    function (option) {
      return option.getAttribute('data-value') === String(val);
    },
  );
  wrap.dataset.value = val;
  const txt = wrap.querySelector('.dropdown-selected-text');
  if (opt) {
    if (txt) {
      if (wrap.hasAttribute('data-rich-options')) txt.innerHTML = opt.innerHTML;
      else {
        txt.textContent = (opt.textContent || '').trim();
        const i18nKey = opt.getAttribute('data-i18n');
        if (i18nKey) txt.setAttribute('data-i18n', i18nKey);
        else txt.removeAttribute('data-i18n');
      }
    }
  } else {
    if (txt && val !== '') txt.textContent = val;
  }
  wrap.querySelectorAll('.dropdown-option').forEach(function (o) {
    o.classList.toggle('selected', o.getAttribute('data-value') === val);
  });
}

export function initializeDropdowns() {
  document.addEventListener('click', function (e) {
    const t = e.target;
    const option = t && t.closest ? t.closest('.dropdown-option') : null;
    if (option) {
      selectDropdownOption(option, e);
      return;
    }
    if (!(t && t.closest) || !t.closest('.custom-dropdown')) closeAllDropdowns();
  });
}
