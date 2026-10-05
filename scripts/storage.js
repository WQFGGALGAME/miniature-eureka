/* ============================================================
   MERIDIAN · storage
   localStorage 安全封装 + 跨标签页同步（storage 事件）
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;

  function isAvailable() {
    try {
      var k = '__meridian_test__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  var available = isAvailable();
  var memoryFallback = {};

  function save(key, value) {
    var raw;
    try { raw = JSON.stringify(value); }
    catch (e) { return false; }
    try {
      if (available) global.localStorage.setItem(key, raw);
      else memoryFallback[key] = raw;
      return true;
    } catch (e) {
      // 配额溢出等：尝试落内存并报告
      memoryFallback[key] = raw;
      return false;
    }
  }

  function load(key, fallback) {
    var raw = null;
    try { raw = available ? global.localStorage.getItem(key) : (memoryFallback[key] || null); }
    catch (e) { raw = memoryFallback[key] || null; }
    if (raw == null) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      // 损坏数据：不直接覆盖，交给上层决定；先返回兜底
      return fallback;
    }
  }

  function remove(key) {
    try {
      if (available) global.localStorage.removeItem(key);
      delete memoryFallback[key];
    } catch (e) { delete memoryFallback[key]; }
  }

  /* 跨标签页：其它标签写入时触发（本标签写入不触发） */
  var externalListeners = [];
  function onExternalChange(cb) {
    externalListeners.push(cb);
    return function () {
      var i = externalListeners.indexOf(cb);
      if (i !== -1) externalListeners.splice(i, 1);
    };
  }

  function handleStorageEvent(e) {
    if (!e.key) return;
    var data = null;
    if (e.newValue != null) { try { data = JSON.parse(e.newValue); } catch (err) { data = null; } }
    externalListeners.forEach(function (cb) {
      try { cb(e.key, data, e); } catch (err) { /* 监听器异常不影响其它 */ }
    });
  }

  if (global.addEventListener) global.addEventListener('storage', handleStorageEvent);

  App.storage = {
    save: save, load: load, remove: remove,
    onExternalChange: onExternalChange,
    isAvailable: function () { return available; }
  };
})(window);
