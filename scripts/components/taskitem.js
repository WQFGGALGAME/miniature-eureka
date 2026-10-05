/* ============================================================
   MERIDIAN · components/task item
   任务项渲染与行内交互（勾选 / 行内编辑 / 展开详情 / 删除）
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;
  var P = App.CONST.PRIORITIES;

  var ICONS = {
    grip: '<svg viewBox="0 0 24 24" width="16" height="16"><g fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></g></svg>',
    check: '<svg class="check" viewBox="0 0 24 24" width="13" height="13"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    flag: '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M5 3h2v9.4H5zm0 10.6h2L6 21H5zM9 3v2l6 1.8V3zm0 10.6h8c1.4 0 2.3-1 2.3-2.3 0-1-.6-1.7-1.5-2L9 6.9z"/></svg>',
    tag: '<svg viewBox="0 0 24 24" width="11" height="11"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M3 12 12 3h8v8l-9 9z"/><circle cx="16.5" cy="7.5" r="1.3" fill="currentColor"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" width="11" height="11"><rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="currentColor" stroke-width="1.7"/><line x1="7.5" y1="3" x2="7.5" y2="6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><line x1="16.5" y1="3" x2="16.5" y2="6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    notes: '<svg viewBox="0 0 24 24" width="11" height="11"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M6 4h12v16l-3-2-3 2-3-2-3 2z"/><line x1="8.5" y1="9" x2="15.5" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="8.5" y1="12.5" x2="15.5" y2="12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    chevron: '<svg class="chevron" viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13"/></svg>'
  };

  function toDateInput(ts) {
    var d = new Date(ts);
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ---------------- 元信息行 ---------------- */
  function buildMeta(task) {
    var meta = u.h('div', { class: 'task-meta' });

    var prio = u.h('span', {
      class: 'meta-prio',
      dataset: { p: task.priority },
      html: ICONS.flag
    }, P[task.priority].label);
    meta.appendChild(prio);

    if (task.tag) {
      meta.appendChild(u.h('span', { class: 'meta-chip', html: ICONS.tag }, task.tag));
    }
    if (task.due != null) {
      var overdue = u.isOverdue(task.due, task.completed);
      meta.appendChild(u.h('span', {
        class: 'meta-due' + (overdue ? ' is-overdue' : ''),
        html: ICONS.calendar
      }, u.formatDue(task.due) + (overdue ? ' · 逾期' : '')));
    }
    if (task.notes) {
      meta.appendChild(u.h('span', { class: 'meta-notes', html: ICONS.notes }, '有备注'));
    }
    return meta;
  }

  /* ---------------- 展开详情 ---------------- */
  function buildDetails(task) {
    var box = u.h('div', { class: 'task-details' });

    var notes = u.h('textarea', {
      class: 'notes-input',
      placeholder: '补充一点背景…',
      'aria-label': '任务备注'
    }, task.notes);
    notes.addEventListener('input', u.debounce(function () {
      App.store.updateTask(task.id, { notes: notes.value });
    }, 420));
    box.appendChild(u.h('div', { class: 'details-row' },
      u.h('label', {}, '备注'), notes));

    var grid = u.h('div', { class: 'details-grid' });

    var tagInput = u.h('input', {
      class: 'tag-input', type: 'text',
      placeholder: '如：工作 / 家',
      value: task.tag,
      'aria-label': '标签'
    });
    tagInput.addEventListener('change', function () {
      App.store.updateTask(task.id, { tag: tagInput.value.trim() });
    });
    grid.appendChild(u.h('div', { class: 'details-row' },
      u.h('label', {}, '标签（星区）'), tagInput));

    var dateInput = u.h('input', {
      class: 'tag-input', type: 'date',
      'aria-label': '截止日期',
      value: task.due != null ? toDateInput(task.due) : ''
    });
    dateInput.addEventListener('change', function () {
      App.store.updateTask(task.id, { due: dateInput.value ? u.parseDue(dateInput.value) : null });
    });
    grid.appendChild(u.h('div', { class: 'details-row' },
      u.h('label', {}, '截止日期'), dateInput));

    box.appendChild(grid);

    // 优先级分段
    var segmented = u.h('div', { class: 'segmented', role: 'group', 'aria-label': '优先级' });
    [3, 2, 1].forEach(function (pv) {
      var btn = u.h('button', {
        type: 'button',
        class: task.priority === pv ? 'is-on-' + pv : ''
      }, P[pv].label);
      btn.addEventListener('click', function () {
        App.store.updateTask(task.id, { priority: pv });
      });
      segmented.appendChild(btn);
    });
    box.appendChild(u.h('div', { class: 'details-row' },
      u.h('label', {}, '优先级'), segmented));

    return box;
  }

  /* ---------------- 行内标题编辑 ---------------- */
  function enableTitleEdit(task, titleEl) {
    if (titleEl.dataset.editing === '1') return;
    titleEl.dataset.editing = '1';
    var input = u.h('input', { class: 'title-input', type: 'text', value: task.title, 'aria-label': '编辑任务标题' });
    titleEl.hidden = true;
    titleEl.parentNode.insertBefore(input, titleEl.nextSibling);
    requestAnimationFrame(function () { input.focus(); input.select(); });

    var done = false;
    function save() {
      if (done) return; done = true;
      var val = input.value.trim();
      if (val && val !== task.title) App.store.updateTask(task.id, { title: val });
      cleanup(val === task.title || !val);
    }
    function cleanup(restore) {
      if (input.parentNode) input.parentNode.removeChild(input);
      titleEl.hidden = false;
      delete titleEl.dataset.editing;
    }
    input.addEventListener('blur', save);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      else if (e.key === 'Escape') { done = true; cleanup(true); }
    });
  }

  /* ---------------- 渲染单个任务 ---------------- */
  function renderTask(task, ui) {
    var expanded = ui.expandedId === task.id;
    var selected = ui.selectedId === task.id;

    var classes = ['task-item'];
    if (task.completed) classes.push('is-completed');
    if (expanded) classes.push('is-expanded');
    if (selected) classes.push('is-selected');

    var grip = u.h('button', {
      class: 'task-grip', type: 'button',
      'aria-label': '拖拽手柄：' + task.title + '，空格可拾取重排',
      html: ICONS.grip
    });

    var checkbox = u.h('button', {
      class: 'task-checkbox', type: 'button',
      'aria-label': (task.completed ? '标记为未完成：' : '标记完成：') + task.title,
      'aria-pressed': task.completed ? 'true' : 'false',
      html: ICONS.check
    });
    checkbox.addEventListener('click', function (e) {
      e.stopPropagation();
      App.store.selectTask(task.id);
      App.store.toggleComplete(task.id);
    });

    var title = u.h('span', { class: 'task-title' }, task.title);
    title.addEventListener('dblclick', function () { enableTitleEdit(task, title); });
    var body = u.h('div', { class: 'task-body' }, title, buildMeta(task));
    body.addEventListener('click', function () { App.store.selectTask(task.id); });

    var expandBtn = u.h('button', {
      class: 'task-action', type: 'button',
      'aria-label': (expanded ? '收起详情：' : '展开详情：') + task.title,
      'aria-expanded': expanded ? 'true' : 'false',
      html: ICONS.chevron
    });
    expandBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      App.store.toggleExpanded(task.id);
    });

    var deleteBtn = u.h('button', {
      class: 'task-action task-action--danger', type: 'button',
      'aria-label': '删除任务：' + task.title,
      html: ICONS.trash
    });
    deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      requestDelete(task);
    });

    var actions = u.h('div', { class: 'task-actions' }, expandBtn, deleteBtn);

    var li = u.h('li', {
      class: classes.join(' '),
      dataset: { id: task.id, priority: task.priority },
      draggable: 'true'
    }, grip, checkbox, body, actions);

    if (expanded) li.appendChild(buildDetails(task));
    return li;
  }

  function requestDelete(task) {
    App.modal.confirm({
      title: '移除这颗星位？',
      message: '「' + task.title + '」将被删除。此操作可通过 Ctrl+Z 撤销。',
      okLabel: '删除',
      danger: true
    }).then(function (ok) {
      if (ok) App.store.deleteTask(task.id);
    });
  }

  App.taskItem = { renderTask: renderTask, ICONS: ICONS };
})(window);
