/* ============================================================
   MERIDIAN · dnd
   拖拽排序（HTML5 DnD） + 键盘可访问重排 + FLIP
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;

  var listEl = null;
  var dragId = null;
  var grab = null; // { id, f } 键盘拾取状态

  function items(exceptId) {
    return u.$$('.task-item', listEl).filter(function (el) { return el.dataset.id !== exceptId; });
  }

  function clearIndicators() {
    u.$$('.task-item', listEl).forEach(function (el) {
      el.classList.remove('is-drop-before', 'is-drop-after');
    });
  }

  /* ---------------- HTML5 拖拽 ---------------- */
  function dragStart(e) {
    var item = e.target.closest('.task-item');
    if (!item) return;
    // 从控件发起则取消拖拽
    if (e.target.closest('button, input, textarea, a, .task-checkbox')) { e.preventDefault(); return; }
    dragId = item.dataset.id;
    item.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); } catch (err) {}
  }

  function positionFor(y, exceptId) {
    var rows = items(exceptId);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return { el: rows[i], position: 'before' };
    }
    var last = rows[rows.length - 1];
    return last ? { el: last, position: 'after' } : null;
  }

  function dragOver(e) {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearIndicators();
    var pos = positionFor(e.clientY, dragId);
    if (pos) pos.el.classList.add(pos.position === 'before' ? 'is-drop-before' : 'is-drop-after');
  }

  function drop(e) {
    if (!dragId) return;
    e.preventDefault();
    var pos = positionFor(e.clientY, dragId);
    var id = dragId;
    finishDrag();
    if (pos) App.store.moveTask(id, pos.el.dataset.id, pos.position);
  }

  function dragEnd() { finishDrag(); }

  function finishDrag() {
    dragId = null;
    u.$$('.task-item', listEl).forEach(function (el) {
      el.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after');
    });
  }

  /* ---------------- 键盘可访问重排 ---------------- */
  function visibleIds() {
    return App.store.getVisibleTasks().map(function (t) { return t.id; });
  }

  function announce(msg) {
    var el = u.$('#sr-announcer');
    if (el) el.textContent = msg;
  }

  function paintGrab() {
    clearIndicators();
    var dragging = u.$$('.task-item', listEl).find(function (el) { return el.dataset.id === grab.id; });
    if (dragging) dragging.classList.add('is-grabbed');

    var ids = visibleIds();
    var others = ids.filter(function (id) { return id !== grab.id; });
    var f = u.clamp(grab.f, 0, others.length);
    if (f < others.length) {
      var target = u.$$('.task-item', listEl).find(function (el) { return el.dataset.id === others[f]; });
      if (target) target.classList.add('is-drop-before');
    } else if (others.length) {
      var last = u.$$('.task-item', listEl).find(function (el) { return el.dataset.id === others[others.length - 1]; });
      if (last) last.classList.add('is-drop-after');
    }
  }

  function beginGrab(id, gripEl) {
    var ids = visibleIds();
    var selfIdx = ids.indexOf(id);
    grab = { id: id, f: selfIdx, grip: gripEl };
    paintGrab();
    var total = ids.length;
    announce('已拾取任务，第 ' + (selfIdx + 1) + ' 项，共 ' + total + ' 项。上下方向键移动，回车或空格放下，Esc 取消。');
  }

  function endGrab(commit) {
    if (!grab) return;
    var g = grab;
    if (commit) {
      var ids = visibleIds();
      var others = ids.filter(function (id) { return id !== g.id; });
      var f = u.clamp(g.f, 0, others.length);
      if (f < others.length) App.store.moveTask(g.id, others[f], 'before');
      else if (others.length) App.store.moveTask(g.id, others[others.length - 1], 'after');
    }
    grab = null;
    clearIndicators();
    u.$$('.task-item', listEl).forEach(function (el) { el.classList.remove('is-grabbed'); });
    if (g.grip) { try { g.grip.focus(); } catch (e) {} }
  }

  function keyDown(e) {
    var grip = e.target.closest && e.target.closest('.task-grip');
    if (!grip && !grab) return;
    var item = e.target.closest('.task-item');
    var key = e.key;

    if (!grab && (key === ' ' || key === 'Enter') && grip) {
      e.preventDefault();
      beginGrab(item.dataset.id, grip);
      return;
    }
    if (!grab) return;

    e.preventDefault();
    if (key === 'ArrowUp') { grab.f = u.clamp(grab.f - 1, 0, visibleIds().length - 1); paintGrab(); }
    else if (key === 'ArrowDown') { grab.f = u.clamp(grab.f + 1, 0, visibleIds().length - 1); paintGrab(); }
    else if (key === ' ' || key === 'Enter') { announce('已放下任务。'); endGrab(true); }
    else if (key === 'Escape') { announce('已取消移动。'); endGrab(false); }
  }

  /* ---------------- FLIP ---------------- */
  function flip(container, renderFn) {
    if (u.prefersReducedMotion()) { renderFn(); return; }
    var before = {};
    u.$$(':scope > [data-id]', container).forEach(function (el) { before[el.dataset.id] = el.getBoundingClientRect(); });
    renderFn();
    u.$$(':scope > [data-id]', container).forEach(function (el) {
      var b = before[el.dataset.id];
      if (!b) return;
      var a = el.getBoundingClientRect();
      var dx = b.left - a.left, dy = b.top - a.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.animate(
        [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'translate(0,0)' }],
        { duration: 300, easing: 'cubic-bezier(0.22,1,0.36,1)' }
      );
    });
  }

  function init(el) {
    listEl = el;
    listEl.addEventListener('dragstart', dragStart);
    listEl.addEventListener('dragover', dragOver);
    listEl.addEventListener('drop', drop);
    listEl.addEventListener('dragend', dragEnd);
    listEl.addEventListener('keydown', keyDown);
  }

  function isGrabbing() { return !!grab; }
  function cancelGrab() { if (grab) endGrab(false); }

  App.dnd = { init: init, flip: flip, isGrabbing: isGrabbing, cancelGrab: cancelGrab };
})(window);
