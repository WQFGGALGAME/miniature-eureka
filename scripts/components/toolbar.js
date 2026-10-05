/* ============================================================
   MERIDIAN · components/toolbar
   筛选 tabs / 搜索 / 操作菜单（清除 / 导出 / 导入）
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;

  var tabsEl, searchEl, moreBtn, menuEl, fileInput;
  var menuOpen = false;

  var MENU = [
    { icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M5 13h14l-6 6"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M5 5h14"/></svg>', label: '导出星图（JSON）', action: 'exportData' },
    { icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M19 11H5l6-6"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M19 19H5"/></svg>', label: '导入星图（JSON）', action: 'importData' },
    { sep: true },
    { icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="m6 6 12 12M18 6L6 18"/></svg>', label: '清除所有已完成', action: 'clearCompleted', hint: [] },
    { icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13"/></svg>', label: '清空全部任务', action: 'clearAll', danger: true }
  ];

  function init() {
    tabsEl = u.$('.filter-tabs');
    searchEl = u.$('#search-input');
    moreBtn = u.$('#btn-more');

    tabsEl.addEventListener('click', function (e) {
      var tab = e.target.closest('.filter-tab');
      if (!tab) return;
      App.store.setUI({ filter: tab.dataset.filter });
    });

    searchEl.addEventListener('input', u.debounce(function () {
      App.store.setUI({ search: searchEl.value });
    }, 120));

    moreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu();
    });

    document.addEventListener('click', function (e) {
      if (menuOpen && menuEl && !menuEl.contains(e.target) && e.target !== moreBtn) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) closeMenu();
    });

    fileInput = u.h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (file && App.actions) App.actions.importData(file);
      fileInput.value = '';
    });
  }

  /* ---------------- 菜单 ---------------- */
  function buildMenu() {
    menuEl = u.h('div', { class: 'menu', role: 'menu' });
    MENU.forEach(function (m) {
      if (m.sep) { menuEl.appendChild(u.h('div', { class: 'menu__sep' })); return; }
      var item = u.h('button', {
        class: 'menu__item' + (m.danger ? ' menu__item--danger' : ''),
        type: 'button', role: 'menuitem'
      },
        u.h('span', { html: m.icon }),
        u.h('span', {}, m.label)
      );
      item.addEventListener('click', function () {
        closeMenu();
        if (m.action === 'importData') fileInput.click();
        else if (App.actions && typeof App.actions[m.action] === 'function') App.actions[m.action]();
      });
      menuEl.appendChild(item);
    });
    document.body.appendChild(menuEl);
  }

  function openMenu() {
    if (!menuEl) buildMenu();
    var r = moreBtn.getBoundingClientRect();
    menuEl.style.top = (r.bottom + 8) + 'px';
    menuEl.style.left = (r.right - menuEl.minWidth - 0) + 'px';
    // 右对齐
    menuEl.style.left = 'auto';
    menuEl.style.right = String(Math.max(global.innerWidth - r.right, 12)) + 'px';
    menuEl.style.position = 'fixed';
    menuOpen = true;
    moreBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    menuOpen = false;
    moreBtn.setAttribute('aria-expanded', 'false');
    if (menuEl) menuEl.remove();
    menuEl = null;
  }
  function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }

  /* ---------------- 状态同步 ---------------- */
  function syncTabs(filter) {
    u.$$('.filter-tab', tabsEl).forEach(function (tab) {
      var on = tab.dataset.filter === filter;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function syncCounts(c) {
    u.$('#count-all').textContent = c.all;
    u.$('#count-active').textContent = c.active;
    u.$('#count-completed').textContent = c.completed;
  }

  function focusSearch() { try { searchEl.focus(); } catch (e) {} }

  App.toolbar = {
    init: init,
    syncTabs: syncTabs, syncCounts: syncCounts,
    focusSearch: focusSearch,
    closeMenu: closeMenu
  };
})(window);
