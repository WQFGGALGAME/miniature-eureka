/* ============================================================
   MERIDIAN · app
   装配 / 渲染协调 / 主题音效 / 命令 / 快捷键 / 数据动作
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;
  var store = App.store;

  var listEl, emptyEl, qaForm, qaInput, qaPrioBtn, qaDate, qaP = 2;

  var ICON = {
    plus: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="16.2" y1="16.2" x2="21" y2="21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    theme: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M11 5 6 9H3v6h3l5 4V5z"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
    filter: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M4 6h16M7 12h10M10 18h4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="m6 6 12 12M18 6L6 18"/></svg>',
    help: '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M9.6 9.2a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.6"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>'
  };

  /* ============================================================
     主题 / 音效
     ============================================================ */
  function setThemeDataset(theme) { document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark'; }

  function applyTheme(theme) {
    document.documentElement.classList.add('theme-transition');
    setThemeDataset(theme);
    store.setPrefs({ theme: theme });
    App.starfield.refreshTheme();
    setTimeout(function () { document.documentElement.classList.remove('theme-transition'); }, 520);
  }
  function toggleTheme() {
    var next = store.getPrefs().theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    App.audio.play('open');
  }

  function applySound(v) {
    store.setPrefs({ sound: v });
    App.audio.setEnabled(v);
    u.$('#btn-sound').setAttribute('aria-checked', v ? 'true' : 'false');
    if (v) { App.audio.unlock(); App.audio.play('open'); }
  }
  function toggleSound() { applySound(!store.getPrefs().sound); }

  /* ============================================================
     渲染
     ============================================================ */
  function currentEditingId() {
    var a = document.activeElement;
    var item = a && a.closest && a.closest('.task-item');
    return item ? item.dataset.id : null;
  }

  function renderList(visible, ui) {
    var oldMap = {};
    u.$$('.task-item', listEl).forEach(function (el) { oldMap[el.dataset.id] = el; });
    var editId = currentEditingId();
    var newcomers = [];

    listEl.innerHTML = '';
    visible.forEach(function (t, i) {
      var node;
      if (t.id === editId && oldMap[t.id]) node = oldMap[t.id];
      else {
        node = App.taskItem.renderTask(t, ui);
        if (!oldMap[t.id]) newcomers.push({ node: node, i: i });
      }
      listEl.appendChild(node);
    });

    newcomers.forEach(function (o) {
      if (u.prefersReducedMotion()) return;
      o.node.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translate(0,0)' }],
        { duration: 380, delay: Math.min(o.i * 45, 320), easing: 'cubic-bezier(0.22,1,0.36,1)' }
      );
    });
  }

  function updateEmpty(visible, ui) {
    if (visible.length) { emptyEl.hidden = true; listEl.hidden = false; return; }
    listEl.hidden = true;
    emptyEl.hidden = false;
    var title = u.$('#empty-title'), note = u.$('#empty-note');
    if (ui.search) { title.textContent = '没有找到匹配的星位'; note.textContent = '换个关键词，或清除搜索条件。'; }
    else if (ui.tagFilter) { title.textContent = '「' + ui.tagFilter + '」星区暂无任务'; note.textContent = '清除标签筛选查看全部。'; }
    else if (ui.filter === 'completed') { title.textContent = '还没有点亮的星'; note.textContent = '完成的任务会出现在这里，并连成星座。'; }
    else if (ui.filter === 'active') { title.textContent = '没有进行中的任务'; note.textContent = '所有任务都已完成，或去添加新的事。'; }
    else { title.textContent = '这片天区还没有星位'; note.textContent = '在上方写下第一件事，按回车安放。'; }
  }

  function render(state, change) {
    change = change || {};
    if (change.type === 'prefs') {
      setThemeDataset(store.getPrefs().theme);
      App.starfield.refreshTheme();
      u.$('#btn-sound').setAttribute('aria-checked', store.getPrefs().sound ? 'true' : 'false');
      return;
    }

    var ui = state.ui;
    var visible = store.getVisibleTasks();

    App.dnd.flip(listEl, function () { renderList(visible, ui); });
    updateEmpty(visible, ui);

    var counts = store.getCounts();
    App.toolbar.syncTabs(ui.filter);
    App.toolbar.syncCounts(counts);

    var stats = store.getStats();
    App.stats.update(stats);
    App.stats.renderTags(store.getAllTags(), ui.tagFilter);

    App.starfield.sync(state.tasks);

    u.$('#status-text').textContent =
      '共 ' + counts.all + ' 项 · 进行中 ' + counts.active + ' · 已点亮 ' + counts.completed;
  }

  /* ============================================================
     数据动作
     ============================================================ */
  App.actions = {
    exportData: function () {
      var payload = { app: 'MERIDIAN', version: 1, exportedAt: new Date().toISOString(), tasks: store.getState().tasks };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      u.downloadBlob('meridian-starchart-' + u.dayKey(new Date()) + '.json', blob);
      App.toast.success('已导出星图 JSON');
      App.audio.play('tick');
    },

    importData: function (file) {
      u.readFileAsText(file).then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { App.toast.error('文件无法解析，不是有效的 JSON'); App.audio.play('error'); return; }
        var tasks = Array.isArray(data) ? data : data.tasks;
        if (!Array.isArray(tasks)) { App.toast.error('文件中未找到任务数据'); App.audio.play('error'); return; }
        App.modal.confirm({
          title: '导入 ' + tasks.length + ' 项任务？',
          message: '将以合并方式导入（按内容去重），不会删除现有任务。',
          okLabel: '导入', danger: false
        }).then(function (ok) {
          if (!ok) return;
          var n = store.importTasks(tasks, 'merge');
          App.toast.success('已导入 ' + n + ' 项任务');
          App.audio.play('add');
        });
      }).catch(function () { App.toast.error('读取文件失败'); });
    },

    clearCompleted: function () {
      var n = store.getCounts().completed;
      if (!n) { App.toast.info('没有已完成的任务'); return; }
      App.modal.confirm({
        title: '清除所有已完成？',
        message: '将移除 ' + n + ' 项已完成任务，可通过 Ctrl+Z 撤销。',
        okLabel: '清除'
      }).then(function (ok) {
        if (ok) { store.clearCompleted(); App.toast.success('已清除完成项'); App.audio.play('delete'); }
      });
    },

    clearAll: function () {
      if (!store.getCounts().all) { App.toast.info('已经是空的了'); return; }
      App.modal.confirm({
        title: '清空全部任务？',
        message: '所有任务都将被移除，星图会回到空白。此操作可通过 Ctrl+Z 撤销。',
        okLabel: '全部清空'
      }).then(function (ok) {
        if (ok) { store.importTasks([], 'replace'); App.toast.success('已清空全部任务'); App.audio.play('delete'); }
      });
    },

    showGuide: function () { App.modal.openShortcuts(); }
  };

  /* ============================================================
     命令面板命令
     ============================================================ */
  function buildCommands() {
    var setFilter = function (f) { return function () { store.setUI({ filter: f }); }; };
    return [
      { group: '任务', label: '新建任务', icon: ICON.plus, keys: ['N'], keywords: 'add new create 添加 新建', fn: function () { focusQuick(); } },
      { group: '任务', label: '搜索任务', icon: ICON.search, keys: ['/'], keywords: 'search find 搜索', fn: function () { App.toolbar.focusSearch(); } },

      { group: '筛选', label: '查看全部任务', icon: ICON.filter, keys: ['G', 'A'], keywords: 'all filter 全部', fn: setFilter('all') },
      { group: '筛选', label: '只看进行中', icon: ICON.filter, keys: ['G', 'O'], keywords: 'active ongoing 进行中', fn: setFilter('active') },
      { group: '筛选', label: '只看已完成', icon: ICON.filter, keys: ['G', 'D'], keywords: 'completed done 完成', fn: setFilter('completed') },
      { group: '筛选', label: '清除已完成任务', icon: ICON.trash, keywords: 'clear completed 清除', fn: App.actions.clearCompleted },

      { group: '外观', label: '切换明暗主题', icon: ICON.theme, keys: ['T'], keywords: 'theme dark light 主题', fn: toggleTheme },
      { group: '外观', label: '切换操作音效', icon: ICON.sound, keys: ['S'], keywords: 'sound audio 音效', fn: toggleSound },

      { group: '数据', label: '导出星图 JSON', icon: ICON.download, keywords: 'export 导出', fn: App.actions.exportData },
      { group: '数据', label: '导入星图 JSON', icon: ICON.download, keywords: 'import 导入', fn: function () { u.$('input[type=file]') ? u.$$('input[type=file]').pop().click() : null; } },
      { group: '数据', label: '清空全部任务', icon: ICON.trash, keywords: 'delete all 清空', fn: App.actions.clearAll },

      { group: '帮助', label: '查看键盘快捷键', icon: ICON.help, keys: ['?'], keywords: 'help shortcuts 帮助 快捷键', fn: App.actions.showGuide }
    ];
  }

  /* ============================================================
     表单
     ============================================================ */
  function focusQuick() { try { qaInput.focus(); } catch (e) {} }

  function cyclePriority() {
    var cycle = App.CONST.PRIORITY_CYCLE;
    qaP = cycle[cycle.indexOf(qaP)];
    qaPrioBtn.dataset.p = String(qaP);
    u.$('#qa-priority-label').textContent = App.CONST.PRIORITIES[qaP].label;
    qaPrioBtn.setAttribute('aria-label', '选择优先级，当前为' + App.CONST.PRIORITIES[qaP].label);
  }

  function bindForms() {
    qaForm = u.$('#quick-add');
    qaInput = u.$('#quick-input');
    qaPrioBtn = u.$('#qa-priority');
    qaDate = u.$('#qa-due');
    qaPrioBtn.dataset.p = '2';

    qaPrioBtn.addEventListener('click', cyclePriority);

    qaForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = qaInput.value.trim();
      if (!title) { qaInput.focus(); return; }
      var task = store.addTask({
        title: title,
        priority: qaP,
        due: qaDate.value ? u.parseDue(qaDate.value) : null
      });
      if (task) {
        qaInput.value = ''; qaDate.value = '';
        App.audio.play('add');
        qaInput.focus();
      }
    });
  }

  /* ============================================================
     快捷键
     ============================================================ */
  function registerHotkeys() {
    var kb = App.keyboard;
    kb.register({ combo: 'ctrl+k', title: '打开命令面板', group: '通用', fn: function () { App.commandPalette.toggle(); } });
    kb.register({ combo: 'ctrl+z', title: '撤销', group: '编辑', fn: function () { if (store.undo()) App.audio.play('undo'); } });
    kb.register({ combo: 'ctrl+shift+z', title: '重做', group: '编辑', fn: function () { if (store.redo()) App.audio.play('redo'); } });
    kb.register({ combo: 'ctrl+y', title: '重做（替代）', group: '编辑', fn: function () { if (store.redo()) App.audio.play('redo'); } });

    kb.register({ combo: 'n', title: '聚焦新建任务', group: '导航', fn: focusQuick });
    kb.register({ combo: '/', title: '聚焦搜索', group: '导航', fn: function () { App.toolbar.focusSearch(); } });
    kb.register({ combo: 't', title: '切换明暗主题', group: '外观', fn: toggleTheme });
    kb.register({ combo: 's', title: '切换操作音效', group: '外观', fn: toggleSound });
    kb.register({ combo: '?', title: '打开快捷键帮助', group: '通用', fn: App.actions.showGuide });

    kb.register({ combo: 'g a', title: '筛选：全部', group: '筛选', fn: function () { store.setUI({ filter: 'all' }); } });
    kb.register({ combo: 'g o', title: '筛选：进行中', group: '筛选', fn: function () { store.setUI({ filter: 'active' }); } });
    kb.register({ combo: 'g d', title: '筛选：已完成', group: '筛选', fn: function () { store.setUI({ filter: 'completed' }); } });

    kb.register({ combo: 'delete', title: '删除选中任务', group: '编辑', fn: function () {
      var id = store.getUI().selectedId;
      if (id) { var t = store.getTask(id); if (t) App.taskItem && deleteViaConfirm(t); }
    }});
  }

  function deleteViaConfirm(task) {
    App.modal.confirm({
      title: '移除这颗星位？',
      message: '「' + task.title + '」将被删除，可通过 Ctrl+Z 撤销。',
      okLabel: '删除'
    }).then(function (ok) { if (ok) store.deleteTask(task.id); });
  }

  /* ============================================================
     时钟
     ============================================================ */
  function tickClock() {
    var c = u.formatClock(new Date());
    var t = u.$('#clock-time'), d = u.$('#clock-date');
    if (t) t.textContent = c.time;
    if (d) d.textContent = c.date;
  }

  /* ============================================================
     启动
     ============================================================ */
  function init() {
    listEl = u.$('#task-list');
    emptyEl = u.$('#empty-state');

    // 尽早应用已保存主题，避免闪烁
    setThemeDataset(store.getPrefs().theme);

    bindForms();
    App.starfield.init();
    App.dnd.init(listEl);
    App.commandPalette.init();
    App.commandPalette.setCommands(buildCommands);
    App.toast.init();
    App.modal.init();
    App.stats.init();
    App.toolbar.init();

    registerHotkeys();
    store.subscribe(render);
    render(store.getState());

    tickClock();
    setInterval(tickClock, 1000);

    // 首次引导
    if (!store.getPrefs().onboarded) {
      setTimeout(function () {
        App.toast.info('示例任务可在「操作」中清除，Ctrl+K 唤起命令面板', { duration: 4200 });
        store.setPrefs({ onboarded: true });
      }, 700);
    }

    // 任意点击/按键解锁音频上下文（为开启音效做准备）
    var unlockOnce = function () { App.audio.unlock(); document.removeEventListener('pointerdown', unlockOnce); };
    document.addEventListener('pointerdown', unlockOnce);
  }

  App.app = { init: init, render: render, focusQuick: focusQuick };
})(window);
