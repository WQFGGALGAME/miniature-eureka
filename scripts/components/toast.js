/* ============================================================
   MERIDIAN · components/toast
   轻量通知：类型图标 / 自动消失 / 离场动画
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;

  var region;
  var MAX = 3;
  var DEFAULT_DURATION = 2600;

  var ICONS = {
    info: '<svg viewBox="0 0 24 24" width="17" height="17"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.8" r="0.6" fill="currentColor"/></svg>',
    success: '<svg viewBox="0 0 24 24" width="17" height="17"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="m8 12.2 2.6 2.6L16.2 9.4"/></svg>',
    danger: '<svg viewBox="0 0 24 24" width="17" height="17"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 3.2 21.5 20H2.5z"/><line x1="12" y1="10" x2="12" y2="14.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17.4" r="0.6" fill="currentColor"/></svg>'
  };

  function init() { region = u.$('#toast-region'); }

  function dismiss(el) {
    if (!el || el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    function remove() { if (el.parentNode) el.parentNode.removeChild(el); }
    el.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 400);
  }

  function show(message, opts) {
    if (!region) init();
    opts = opts || {};
    var type = opts.type || 'info';

    while (region.children.length >= MAX) dismiss(region.firstElementChild);

    var el = u.h('div', {
      class: 'toast toast--' + type,
      role: type === 'danger' ? 'alert' : 'status'
    },
      u.h('span', { class: 't-icon', html: ICONS[type] || ICONS.info }),
      u.h('span', { class: 't-msg' }, message)
    );
    region.appendChild(el);

    var duration = opts.duration == null ? DEFAULT_DURATION : opts.duration;
    if (duration > 0) setTimeout(function () { dismiss(el); }, duration);
    return el;
  }

  App.toast = {
    init: init,
    show: show,
    info: function (m, o) { return show(m, Object.assign({ type: 'info' }, o)); },
    success: function (m, o) { return show(m, Object.assign({ type: 'success' }, o)); },
    error: function (m, o) { return show(m, Object.assign({ type: 'danger' }, o)); }
  };
})(window);
