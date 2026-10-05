/* ============================================================
   MERIDIAN · command palette
   Ctrl/Cmd+K：动态命令 / 模糊过滤 / 分组 / 键盘导航
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;

  var dlg, input, listEl;
  var commandBuilder = function () { return []; };
  var filtered = [];
  var activeIndex = 0;
  var opened = false;

  function init() {
    dlg = u.$('#command-palette');
    input = u.$('#palette-input');
    listEl = u.$('#palette-list');
    if (!dlg) return;

    input.addEventListener('input', function () { render(); });
    input.addEventListener('keydown', onKeyDown);
    dlg.addEventListener('close', onClose);

    // 鼠标交互（事件委托）
    listEl.addEventListener('mouseover', function (e) {
      var opt = e.target.closest('.palette__item');
      if (!opt) return;
      var idx = Number(opt.dataset.index);
      if (idx !== activeIndex) { activeIndex = idx; updateActive(); }
    });
    listEl.addEventListener('click', function (e) {
      var opt = e.target.closest('.palette__item');
      if (!opt) return;
      execute(Number(opt.dataset.index));
    });
  }

  function setCommands(builder) { commandBuilder = builder; }

  function open() {
    if (opened) return;
    opened = true;
    input.value = '';
    render();
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    requestAnimationFrame(function () { try { input.focus(); } catch (e) {} });
  }

  function close() {
    if (!opened) return;
    opened = false;
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  function toggle() { opened ? close() : open(); }

  function onClose() {
    opened = false;
    input.value = '';
  }

  /* ---------------- 过滤与渲染 ---------------- */
  function computeFiltered() {
    var all = commandBuilder() || [];
    var q = input.value.trim();
    var scored = [];
    all.forEach(function (cmd) {
      var text = cmd.label + ' ' + (cmd.keywords || '') + ' ' + (cmd.group || '');
      var r = u.fuzzyMatch(q, text);
      if (r.match) scored.push({ cmd: cmd, score: r.score });
    });
    if (q) scored.sort(function (a, b) { return b.score - a.score; });
    return scored;
  }

  function render() {
    var result = computeFiltered();
    filtered = result.map(function (r) { return r.cmd; });
    activeIndex = filtered.length ? Math.min(activeIndex, filtered.length - 1) : 0;
    listEl.innerHTML = '';

    if (!filtered.length) {
      listEl.appendChild(u.h('li', { class: 'palette__empty' }, '没有匹配的命令'));
      input.removeAttribute('aria-activedescendant');
      return;
    }

    var groups = {};
    var order = [];
    filtered.forEach(function (cmd, i) {
      var g = cmd.group || '其它';
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push({ cmd: cmd, index: i });
    });

    order.forEach(function (g) {
      listEl.appendChild(u.h('li', { class: 'palette__group', role: 'presentation' }, g));
      groups[g].forEach(function (entry) {
        var cmd = entry.cmd;
        var hint = Array.isArray(cmd.keys)
          ? cmd.keys.map(function (k) { return u.h('kbd', {}, k); })
          : [];
        var li = u.h('li', {
          class: 'palette__item',
          role: 'option',
          id: 'pal-opt-' + entry.index,
          dataset: { index: entry.index },
          'aria-selected': 'false'
        },
          u.h('span', { class: 'p-icon' }, cmd.icon || ''),
          u.h('span', { class: 'p-label' }, cmd.label),
          u.h('span', { class: 'p-hint' }, hint)
        );
        listEl.appendChild(li);
      });
    });
    updateActive();
  }

  function updateActive() {
    u.$$('.palette__item', listEl).forEach(function (el) {
      var isMe = Number(el.dataset.index) === activeIndex;
      el.classList.toggle('is-active', isMe);
      el.setAttribute('aria-selected', isMe ? 'true' : 'false');
      if (isMe) {
        input.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function execute(i) {
    var cmd = filtered[i];
    if (!cmd) return;
    close();
    try { cmd.fn(); } catch (e) { if (global.console) console.error('command error', e); }
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = (activeIndex + 1) % Math.max(filtered.length, 1); updateActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = (activeIndex - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1); updateActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); execute(activeIndex); }
    else if (e.key === 'Tab') { e.preventDefault(); activeIndex = (activeIndex + (e.shiftKey ? -1 : 1) + filtered.length) % Math.max(filtered.length, 1); updateActive(); }
  }

  function isOpen() { return opened; }

  App.commandPalette = {
    init: init, setCommands: setCommands,
    open: open, close: close, toggle: toggle, isOpen: isOpen
  };
})(window);
