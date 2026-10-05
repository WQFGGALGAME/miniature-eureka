/* ============================================================
   MERIDIAN · store
   闭包状态容器：任务 CRUD / 撤销重做 / 发布订阅 / 持久化 / 选择器
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;
  var C = App.CONST;

  /* ---------------- 初始示例数据（首次启动，展示星座与交互） ---------------- */
  function seedTasks() {
    var now = Date.now();
    return [
      { id: u.uid(), title: '校准今日的星图，写下三件最重要的事', notes: '这是一条示例任务，勾选后会点亮为星座中的一颗星。', tag: '引导', priority: 3, due: null, completed: false, createdAt: now - 1000 * 60 * 42, completedAt: null },
      { id: u.uid(), title: '体验拖拽：按住左侧手柄重新排序', notes: '', tag: '引导', priority: 2, due: null, completed: false, createdAt: now - 1000 * 60 * 30, completedAt: null },
      { id: u.uid(), title: '按 Ctrl+K 唤起命令面板', notes: '也可以按 N 快速新建、/ 聚焦搜索。', tag: '引导', priority: 2, due: null, completed: false, createdAt: now - 1000 * 60 * 20, completedAt: null },
      { id: u.uid(), title: '完成的第一件事（示例）', notes: '', tag: '引导', priority: 1, due: null, completed: true, createdAt: now - 1000 * 60 * 60, completedAt: now - 1000 * 60 * 12 }
    ];
  }

  function defaultState() { return { tasks: seedTasks(), ui: { filter: C.FILTERS.ALL, search: '', tagFilter: null, selectedId: null, expandedId: null } }; }
  function defaultPrefs() {
    return {
      theme: 'dark',
      sound: false,
      onboarded: false
    };
  }

  /* ---------------- 私有状态 ---------------- */
  var persisted = App.storage.load(C.STORAGE_KEY, null);
  var state;
  if (persestedIsUsable(persisted)) {
    state = { tasks: Array.isArray(persisted.tasks) ? persisted.tasks : [], ui: Object.assign(defaultState().ui, persisted.ui || {}) };
  } else {
    state = defaultState();
  }

  var prefs = App.storage.load(C.PREFS_KEY, null) || defaultPrefs();
  prefs = Object.assign(defaultPrefs(), prefs);

  function persestedIsUsable(p) { return p && typeof p === 'object' && Array.isArray(p.tasks); }

  var listeners = [];
  var past = [];
  var future = [];

  /* ---------------- 订阅 ---------------- */
  function subscribe(fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i !== -1) listeners.splice(i, 1); }; }
  function notify(change) {
    change = change || { type: 'tasks' };
    listeners.forEach(function (fn) { try { fn(getState(), change); } catch (e) { if (global.console) console.error('listener error', e); } });
  }

  function getState() { return state; }
  function getPrefs() { return prefs; }
  function getUI() { return state.ui; }

  /* ---------------- 持久化 ---------------- */
  function persistState() { App.storage.save(C.STORAGE_KEY, { tasks: state.tasks, ui: state.ui }); }
  function persistPrefs() { App.storage.save(C.PREFS_KEY, prefs); }

  /* ---------------- 历史 ---------------- */
  function snapshot() { return u.clone(state.tasks); }
  function pushHistory() {
    past.push(snapshot());
    if (past.length > C.HISTORY_LIMIT) past.shift();
    future.length = 0;
  }
  function canUndo() { return past.length > 0; }
  function canRedo() { return future.length > 0; }

  function commit(mutator, change) {
    pushHistory();
    mutator();
    state.tasks = normalizeTasks(state.tasks);
    persistState();
    notify(Object.assign({ type: 'tasks' }, change || {}));
  }

  /* 不记录历史的内部替换（跨标签同步等） */
  function replaceTasksSilently(tasks, change) {
    state.tasks = normalizeTasks(tasks);
    persistState();
    notify(Object.assign({ type: 'tasks', silent: true }, change || {}));
  }

  function normalizeTasks(tasks) {
    return tasks.map(function (t) {
      return {
        id: t.id || u.uid(),
        title: String(t.title == null ? '' : t.title),
        notes: String(t.notes || ''),
        tag: String(t.tag || ''),
        priority: [1, 2, 3].indexOf(Number(t.priority)) !== -1 ? Number(t.priority) : 2,
        due: t.due == null ? null : Number(t.due),
        completed: !!t.completed,
        createdAt: Number(t.createdAt) || Date.now(),
        completedAt: t.completedAt == null ? null : Number(t.completedAt)
      };
    });
  }

  /* ---------------- 任务动作 ---------------- */
  function addTask(input) {
    var title = (input.title || '').trim();
    if (!title) return null;
    var task = {
      id: u.uid(),
      title: title,
      notes: (input.notes || '').trim(),
      tag: (input.tag || '').trim(),
      priority: Number(input.priority) || 2,
      due: input.due == null ? null : Number(input.due),
      completed: false,
      createdAt: Date.now(),
      completedAt: null
    };
    commit(function () { state.tasks.push(task); }, { action: 'add', taskId: task.id });
    return task;
  }

  function findIndex(id) {
    for (var i = 0; i < state.tasks.length; i++) if (state.tasks[i].id === id) return i;
    return -1;
  }

  function toggleComplete(id, force) {
    var idx = findIndex(id);
    if (idx === -1) return;
    var task = state.tasks[idx];
    var next = force == null ? !task.completed : force;
    commit(function () {
      task.completed = next;
      task.completedAt = next ? Date.now() : null;
    }, { action: next ? 'complete' : 'uncomplete', taskId: id });
  }

  function updateTask(id, patch) {
    var idx = findIndex(id);
    if (idx === -1) return;
    var had = state.tasks[idx];
    commit(function () {
      var t = state.tasks[idx];
      if (patch.title != null) t.title = String(patch.title).trim() || t.title;
      if (patch.notes != null) t.notes = String(patch.notes);
      if (patch.tag != null) t.tag = String(patch.tag).trim();
      if (patch.priority != null) t.priority = Number(patch.priority);
      if (patch.due !== undefined) t.due = patch.due == null ? null : Number(patch.due);
    }, { action: 'update', taskId: id });
  }

  function deleteTask(id) {
    var idx = findIndex(id);
    if (idx === -1) return;
    var removed = state.tasks[idx];
    commit(function () { state.tasks.splice(idx, 1); }, { action: 'delete', taskId: id, removed: removed });
  }

  /* 重排：把 id 移动到 targetId 之前/之后；targetId 为 null 则移到末尾 */
  function moveTask(id, targetId, position) {
    if (id === targetId) return;
    var from = findIndex(id);
    if (from === -1) return;
    commit(function () {
      var task = state.tasks.splice(from, 1)[0];
      if (targetId == null) { state.tasks.push(task); return; }
      var to = findIndex(targetId);
      if (to === -1) { state.tasks.push(task); return; }
      var insertAt = position === 'after' ? to + 1 : to;
      state.tasks.splice(insertAt, 0, task);
    }, { action: 'reorder' });
  }

  /* 用完整有序 id 列表重排（键盘移动用） */
  function reorderByIds(ids) {
    var map = {};
    state.tasks.forEach(function (t) { map[t.id] = t; });
    var next = ids.map(function (id) { return map[id]; }).filter(Boolean);
    state.tasks.forEach(function (t) { if (ids.indexOf(t.id) === -1) next.push(t); });
    commit(function () { state.tasks = next; }, { action: 'reorder' });
  }

  function clearCompleted() {
    var count = state.tasks.filter(function (t) { return t.completed; }).length;
    if (!count) return 0;
    commit(function () { state.tasks = state.tasks.filter(function (t) { return !t.completed; }); }, { action: 'clear-completed' });
    return count;
  }

  function importTasks(incoming, mode) {
    var clean = normalizeTasks(u.clone(incoming));
    commit(function () {
      if (mode === 'replace') state.tasks = clean;
      else {
        var existing = {};
        state.tasks.forEach(function (t) { existing[t.title + '|' + t.createdAt] = true; });
        clean.forEach(function (t) { if (!existing[t.title + '|' + t.createdAt]) state.tasks.push(t); });
      }
    }, { action: 'import' });
    return clean.length;
  }

  /* ---------------- 撤销 / 重做 ---------------- */
  function undo() {
    if (!past.length) return false;
    future.push(snapshot());
    state.tasks = past.pop();
    persistState();
    notify({ type: 'history', action: 'undo' });
    return true;
  }
  function redo() {
    if (!future.length) return false;
    past.push(snapshot());
    state.tasks = future.pop();
    persistState();
    notify({ type: 'history', action: 'redo' });
    return true;
  }

  /* ---------------- UI / Prefs ---------------- */
  function setUI(patch, changeOpts) {
    Object.assign(state.ui, patch);
    persistState();
    notify(Object.assign({ type: 'ui' }, changeOpts || {}));
  }
  function setPrefs(patch) {
    Object.assign(prefs, patch);
    persistPrefs();
    notify({ type: 'prefs' });
  }

  function selectTask(id) { setUI({ selectedId: id }); }
  function toggleExpanded(id) {
    setUI({ expandedId: state.ui.expandedId === id ? null : id });
  }

  /* ---------------- 选择器 ---------------- */
  function getTask(id) {
    var i = findIndex(id);
    return i === -1 ? null : state.tasks[i];
  }

  function getVisibleTasks() {
    var ui = state.ui;
    var q = ui.search.trim().toLowerCase();
    return state.tasks.filter(function (t) {
      if (ui.filter === C.FILTERS.ACTIVE && t.completed) return false;
      if (ui.filter === C.FILTERS.COMPLETED && !t.completed) return false;
      if (ui.tagFilter && t.tag !== ui.tagFilter) return false;
      if (q) {
        var hay = (t.title + ' ' + t.notes + ' ' + t.tag).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function getCounts() {
    var all = state.tasks.length, done = 0;
    state.tasks.forEach(function (t) { if (t.completed) done++; });
    return { all: all, active: all - done, completed: done };
  }

  function getAllTags() {
    var map = {};
    state.tasks.forEach(function (t) { if (t.tag) map[t.tag] = (map[t.tag] || 0) + 1; });
    return Object.keys(map).map(function (name) { return { name: name, count: map[name] }; })
      .sort(function (a, b) { return b.count - a.count || (a.name < b.name ? -1 : 1); });
  }

  function calcStreak() {
    var days = {};
    state.tasks.forEach(function (t) {
      days[u.dayKey(new Date(t.createdAt))] = true;
      if (t.completedAt) days[u.dayKey(new Date(t.completedAt))] = true;
    });
    var cursor = u.startOfDay(new Date());
    if (!days[u.dayKey(new Date(cursor))]) cursor -= u.DAY;
    var streak = 0;
    while (days[u.dayKey(new Date(cursor))]) { streak++; cursor -= u.DAY; }
    return streak;
  }

  function getStats() {
    var counts = getCounts();
    var todayDone = state.tasks.filter(function (t) { return t.completedAt && u.isToday(t.completedAt); }).length;
    var total = counts.all, done = counts.completed;
    var rate = total ? Math.round((done / total) * 100) : 0;
    return {
      remaining: counts.active,
      todayDone: todayDone,
      total: total,
      done: done,
      rate: rate,
      streak: calcStreak()
    };
  }

  /* ---------------- 跨标签同步 ---------------- */
  App.storage.onExternalChange(function (key, data) {
    if (key === C.STORAGE_KEY && data && persestedIsUsable(data)) {
      state.ui = Object.assign(state.ui, data.ui || {});
      replaceTasksSilently(data.tasks, { external: true });
    } else if (key === C.PREFS_KEY && data) {
      prefs = Object.assign(defaultPrefs(), data);
      notify({ type: 'prefs', external: true });
    }
  });

  /* ---------------- 导出 ---------------- */
  App.store = {
    subscribe: subscribe, notify: notify,
    getState: getState, getPrefs: getPrefs, getUI: getUI,
    addTask: addTask, toggleComplete: toggleComplete, updateTask: updateTask, deleteTask: deleteTask,
    moveTask: moveTask, reorderByIds: reorderByIds, clearCompleted: clearCompleted, importTasks: importTasks,
    undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo,
    setUI: setUI, setPrefs: setPrefs, selectTask: selectTask, toggleExpanded: toggleExpanded,
    getTask: getTask, getVisibleTasks: getVisibleTasks, getCounts: getCounts,
    getAllTags: getAllTags, getStats: getStats,
    persistState: persistState, replaceTasksSilently: replaceTasksSilently
  };
})(window);
