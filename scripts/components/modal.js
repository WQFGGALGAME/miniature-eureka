/* ============================================================
   MERIDIAN · components/modal
   原生 dialog：确认框（Promise） + 快捷键帮助
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;

  var confirmDlg, confirmTitle, confirmMsg, okBtn, cancelBtn;
  var helpDlg, helpGrid, helpClose;
  var resolver = null;

  function init() {
    confirmDlg = u.$('#confirm-dialog');
    confirmTitle = u.$('#confirm-title');
    confirmMsg = u.$('#confirm-message');
    okBtn = u.$('#confirm-ok');
    cancelBtn = u.$('#confirm-cancel');

    helpDlg = u.$('#shortcuts-dialog');
    helpGrid = u.$('#shortcut-grid');
    helpClose = u.$('#shortcuts-close');

    okBtn.addEventListener('click', function () { settle(true); });
    cancelBtn.addEventListener('click', function () { settle(false); });
    confirmDlg.addEventListener('cancel', function () { settle(false); });
    confirmDlg.addEventListener('close', function () { if (resolver) settle(false); });

    helpClose.addEventListener('click', closeShortcuts);
    helpDlg.addEventListener('close', function () {});
  }

  function settle(result) {
    var r = resolver;
    resolver = null;
    if (typeof confirmDlg.close === 'function' && confirmDlg.open) confirmDlg.close();
    if (r) r(result);
  }

  function confirm(opts) {
    opts = opts || {};
    confirmTitle.textContent = opts.title || '确认操作';
    confirmMsg.textContent = opts.message || '';
    okBtn.textContent = opts.okLabel || '确认';
    cancelBtn.textContent = opts.cancelLabel || '取消';
    okBtn.className = opts.danger === false ? 'btn btn--primary' : 'btn btn--danger';
    if (typeof confirmDlg.showModal === 'function') confirmDlg.showModal();
    return new Promise(function (res) {
      resolver = res;
      requestAnimationFrame(function () { try { okBtn.focus(); } catch (e) {} });
    });
  }

  /* ---------------- 快捷键帮助 ---------------- */
  function renderShortcuts(groups) {
    helpGrid.innerHTML = '';
    groups.forEach(function (g) {
      helpGrid.appendChild(u.h('div', { class: 'sc-head' }, g.name));
      g.rows.forEach(function (row) {
        var keys = row.keys.map(function (k) { return u.h('kbd', {}, k); });
        helpGrid.appendChild(u.h('div', { class: 'sc-row' },
          u.h('span', { class: 'sc-title' }, row.title),
          u.h('span', { class: 'sc-keys' }, keys)
        ));
      });
    });
  }

  function openShortcuts() {
    renderShortcuts(App.keyboard.getShortcutGroups());
    if (typeof helpDlg.showModal === 'function') helpDlg.showModal();
  }
  function closeShortcuts() { if (helpDlg.open && typeof helpDlg.close === 'function') helpDlg.close(); }

  App.modal = {
    init: init,
    confirm: confirm,
    openShortcuts: openShortcuts,
    closeShortcuts: closeShortcuts
  };
})(window);
