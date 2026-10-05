/* ============================================================
   MERIDIAN · main 入口
   ============================================================ */
(function () {
  'use strict';

  function start() {
    if (!window.App || !window.App.app) {
      if (window.console) console.error('MERIDIAN: 模块加载失败');
      return;
    }
    try {
      window.App.app.init();
    } catch (e) {
      if (window.console) console.error('MERIDIAN: 启动失败', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
