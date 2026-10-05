/* ============================================================
   MERIDIAN · keyboard
   快捷键引擎：组合键 / 序列键 / 输入与弹层避让 / 帮助数据
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;

  var bindings = [];
  var seqState = { active: false, first: null, timer: null };
  var suspended = false;
  var SEQ_TIMEOUT = 900;

  function isTyping(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  }

  function anyDialogOpen() {
    return !!document.querySelector('dialog[open]');
  }

  function parseCombo(combo) {
    if (combo.indexOf(' ') !== -1) {
      return { sequence: combo.split(/\s+/).map(function (k) { return k.toLowerCase(); }) };
    }
    var parts = combo.split('+').map(function (p) { return p.trim().toLowerCase(); });
    var spec = { key: parts.pop(), ctrl: false, alt: false, shift: false, meta: false };
    parts.forEach(function (p) {
      if (p === 'ctrl' || p === 'control' || p === 'mod' || p === 'cmd' || p === 'meta') { spec.ctrl = true; }
      else if (p === 'alt' || p === 'option') { spec.alt = true; }
      else if (p === 'shift') { spec.shift = true; }
    });
    return spec;
  }

  function register(opts) {
    var spec = parseCombo(opts.combo);
    var b = {
      spec: spec,
      fn: opts.fn,
      title: opts.title || opts.combo,
      group: opts.group || '通用',
      combo: opts.combo
    };
    bindings.push(b);
    return function () {
      var i = bindings.indexOf(b);
      if (i !== -1) bindings.splice(i, 1);
    };
  }

  function matchFlat(e, spec) {
    if (spec.ctrl && !(e.ctrlKey || e.metaKey)) return false;
    if (!spec.ctrl && (e.ctrlKey || e.metaKey)) return false;
    if (spec.alt !== e.altKey) return false;
    if (spec.shift !== e.shiftKey) return false;
    return e.key.toLowerCase() === spec.key;
  }

  function resetSequence() {
    seqState.active = false; seqState.first = null;
    if (seqState.timer) { clearTimeout(seqState.timer); seqState.timer = null; }
  }

  function describeCombo(combo) {
    return combo.split('+').map(function (p) {
      var map = { ctrl: 'Ctrl', mod: 'Ctrl', cmd: 'Ctrl', meta: 'Ctrl', alt: 'Alt', shift: 'Shift', ' ': '…' };
      return map[p] || (p.length === 1 ? p.toUpperCase() : p);
    });
  }

  function handle(e) {
    var key = e.key.toLowerCase();

    // 序列键推进（即便在等待中也优先处理）
    if (seqState.active) {
      var handled = advanceSequence(e);
      if (handled) { e.preventDefault(); return; }
    }

    var typing = isTyping(e.target);
    var dialogOpen = anyDialogOpen();

    for (var i = 0; i < bindings.length; i++) {
      var b = bindings[i];
      if (b.spec.sequence) continue;
      var spec = b.spec;

      // 输入框中：仅放行带 Ctrl 的组合
      if (typing && !spec.ctrl) continue;
      // 弹层打开时：仅放行 Ctrl 组合（Esc 由 dialog 自行处理）
      if (dialogOpen && !spec.ctrl) continue;
      if (suspended && !spec.ctrl) continue;

      if (matchFlat(e, spec)) {
        e.preventDefault();
        try { b.fn(e); } catch (err) { if (global.console) console.error('hotkey error', err); }
        return;
      }
    }

    // 序列键起点（非输入、非弹层）
    if (!typing && !dialogOpen && !suspended) {
      for (var j = 0; j < bindings.length; j++) {
        var s = bindings[j].spec;
        if (s.sequence && s.sequence[0] === key && !(e.ctrlKey || e.metaKey || e.altKey)) {
          beginSequence(bindings[j]);
          e.preventDefault();
          return;
        }
      }
    }
  }

  function beginSequence(b) {
    seqState.active = true;
    seqState.first = b;
    if (seqState.timer) clearTimeout(seqState.timer);
    seqState.timer = setTimeout(resetSequence, SEQ_TIMEOUT);
  }

  function advanceSequence(e) {
    var seq = seqState.first.spec.sequence;
    var key = e.key.toLowerCase();
    if (key === 'escape') { resetSequence(); return true; }
    if (key === seq[1]) {
      var fn = seqState.first.fn;
      resetSequence();
      try { fn(e); } catch (err) { if (global.console) console.error('seq error', err); }
      return true;
    }
    // 其它键：取消序列（但不吞键）
    resetSequence();
    return false;
  }

  function setSuspended(v) { suspended = !!v; }

  /* 帮助数据：按组聚合 */
  function getShortcutGroups() {
    var groups = {};
    bindings.forEach(function (b) {
      if (b.spec.sequence) return;
      if (!groups[b.group]) groups[b.group] = [];
      groups[b.group].push({ title: b.title, keys: describeCombo(b.combo) });
    });
    // 序列键单独展示
    var seq = bindings.filter(function (b) { return b.spec.sequence; });
    if (seq.length) {
      groups['序列'] = seq.map(function (b) {
        return { title: b.title, keys: b.spec.sequence.map(function (k) { return k.toUpperCase(); }) };
      });
    }
    return Object.keys(groups).map(function (name) { return { name: name, rows: groups[name] }; });
  }

  global.addEventListener('keydown', handle);

  App.keyboard = {
    register: register,
    setSuspended: setSuspended,
    isTyping: isTyping,
    getShortcutGroups: getShortcutGroups,
    resetSequence: resetSequence
  };
})(window);
