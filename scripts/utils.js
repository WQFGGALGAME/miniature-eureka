/* ============================================================
   MERIDIAN · utils
   全局命名空间 / 常量 / DOM 构建器 / 时间 / 函数工具 / 模糊匹配
   ============================================================ */
(function (global) {
  'use strict';

  var App = global.App || (global.App = {});

  /* ---------------- 常量 ---------------- */
  App.CONST = {
    STORAGE_KEY: 'meridian.state.v1',
    PREFS_KEY: 'meridian.prefs.v1',
    HISTORY_LIMIT: 60,
    FILTERS: { ALL: 'all', ACTIVE: 'active', COMPLETED: 'completed' },
    PRIORITY_CYCLE: [2, 3, 1],
    PRIORITIES: {
      1: { key: 'low', label: '低', short: '低' },
      2: { key: 'mid', label: '中', short: '中' },
      3: { key: 'high', label: '高', short: '高' }
    }
  };

  /* ---------------- 选择器 ---------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------------- DOM 构建器 ---------------- */
  function appendChild(target, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { appendChild(target, c); }); return; }
    if (child instanceof Node) { target.appendChild(child); return; }
    target.appendChild(document.createTextNode(String(child)));
  }

  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var val = props[key];
      if (val == null || val === false) return;
      if (key === 'class' || key === 'className') { el.className = val; }
      else if (key === 'dataset') { Object.keys(val).forEach(function (d) { el.dataset[d] = val[d]; }); }
      else if (key === 'html') { el.innerHTML = val; }
      else if (key === 'text') { el.textContent = val; }
      else if (key.indexOf('on') === 0 && typeof val === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (val === true) { el.setAttribute(key, ''); }
      else { el.setAttribute(key, val); }
    });
    for (var i = 2; i < arguments.length; i++) appendChild(el, arguments[i]);
    return el;
  }

  function svg(ns) {
    return function (tag, props) {
      var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      props = props || {};
      Object.keys(props).forEach(function (k) {
        if (props[k] != null && props[k] !== false) el.setAttribute(k, props[k]);
      });
      for (var i = 2; i < arguments.length; i++) {
        var c = arguments[i];
        if (c == null) continue;
        if (typeof c === 'string') el.appendChild(document.createTextNode(c));
        else el.appendChild(c);
      }
      return el;
    };
  }
  var hsvg = svg();

  /* ---------------- ID / 拷贝 / 转义 ---------------- */
  function uid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function clone(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  /* ---------------- 函数工具 ---------------- */
  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function throttle(fn, wait) {
    var last = 0, timer = null, ctx, args;
    function invoke(time) { last = time; fn.apply(ctx, args); }
    return function () {
      var now = Date.now();
      ctx = this; args = arguments;
      var remaining = wait - (now - last);
      if (remaining <= 0) {
        clearTimeout(timer); timer = null; invoke(now);
      } else if (!timer) {
        timer = setTimeout(function () { timer = null; invoke(Date.now()); }, remaining);
      }
    };
  }

  function rafThrottle(fn) {
    var queued = false, lastArgs;
    return function () {
      lastArgs = arguments;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn.apply(null, lastArgs);
      });
    };
  }

  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  /* ---------------- 时间 ---------------- */
  var DAY = 86400000;

  function dayKey(d) {
    d = d instanceof Date ? d : new Date(d);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function startOfDay(d) {
    d = d ? new Date(d) : new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  function isToday(ts) { return startOfDay(ts) === startOfDay(new Date()); }

  function parseDue(str) {
    if (!str) return null;
    var parts = str.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 0, 0);
    return d.getTime();
  }

  function isOverdue(dueTs, completed) {
    return !completed && dueTs != null && dueTs < Date.now();
  }

  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  function formatDue(ts) {
    if (ts == null) return '';
    var today = startOfDay(new Date());
    var that = startOfDay(ts);
    var diff = Math.round((that - today) / DAY);
    var d = new Date(ts);
    var base = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    if (diff === 0) return '今天';
    if (diff === 1) return '明天';
    if (diff === -1) return '昨天';
    if (diff > 1 && diff < 7) return '周' + WEEK[d.getDay()] + ' · ' + base;
    return base;
  }

  function formatClock(d) {
    function p(n) { return String(n).padStart(2, '0'); }
    return {
      time: p(d.getHours()) + ':' + p(d.getMinutes()),
      date: (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + WEEK[d.getDay()]
    };
  }

  function formatTime12(ts) {
    var d = new Date(ts);
    function p(n) { return String(n).padStart(2, '0'); }
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------------- 模糊匹配（子序列 + 评分） ---------------- */
  function fuzzyMatch(query, text) {
    query = (query || '').trim().toLowerCase();
    text = (text || '').toLowerCase();
    if (!query) return { match: true, score: 0 };
    if (text.indexOf(query) !== -1) {
      return { match: true, score: 100 - text.indexOf(query) - query.length * 0.1 };
    }
    var qi = 0, score = 0, lastIdx = -1, streak = 0;
    for (var ti = 0; ti < text.length && qi < query.length; ti++) {
      if (text[ti] === query[qi]) {
        score += 1 + streak * 0.6;
        if (ti === lastIdx + 1) streak++; else streak = 0;
        if (ti === 0 || /[\s#/]/.test(text[ti - 1])) score += 2;
        lastIdx = ti; qi++;
      }
    }
    return { match: qi === query.length, score: qi === query.length ? score : -1 };
  }

  /* ---------------- 下载 / 文件 ---------------- */
  function downloadBlob(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsText(file);
    });
  }

  /* ---------------- 特性检测 ---------------- */
  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function systemPrefersDark() {
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function supportsViewTransitions() {
    return typeof document.startViewTransition === 'function';
  }

  /* ---------------- 导出 ---------------- */
  App.utils = {
    $: $, $$: $$, h: h, hsvg: hsvg,
    uid: uid, clone: clone, escapeHtml: escapeHtml, clamp: clamp,
    debounce: debounce, throttle: throttle, rafThrottle: rafThrottle, wait: wait,
    DAY: DAY, dayKey: dayKey, startOfDay: startOfDay, isToday: isToday,
    parseDue: parseDue, isOverdue: isOverdue, formatDue: formatDue,
    formatClock: formatClock, formatTime12: formatTime12,
    fuzzyMatch: fuzzyMatch, downloadBlob: downloadBlob, readFileAsText: readFileAsText,
    prefersReducedMotion: prefersReducedMotion, systemPrefersDark: systemPrefersDark,
    supportsViewTransitions: supportsViewTransitions
  };
})(window);
