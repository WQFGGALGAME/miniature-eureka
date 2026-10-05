/* ============================================================
   MERIDIAN · starfield
   Canvas 星图：轨道 / 子午准星 / 任务星位 / 完成→点亮连成星座
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;

  var PALETTES = {
    dark: {
      orbit: ['rgba(232,163,77,0.055)', 'rgba(92,198,214,0.05)', 'rgba(232,163,77,0.04)'],
      reticle: 'rgba(232,163,77,0.07)',
      line: 'rgba(232,163,77,0.30)',
      dim: 'rgba(198,208,228,0.34)',
      active: '#f2b65c', activeGlow: 'rgba(242,182,92,0.9)',
      teal: '#63cbd9'
    },
    light: {
      orbit: ['rgba(150,100,25,0.06)', 'rgba(47,143,166,0.06)', 'rgba(150,100,25,0.05)'],
      reticle: 'rgba(150,100,25,0.1)',
      line: 'rgba(150,98,24,0.32)',
      dim: 'rgba(60,72,104,0.3)',
      active: '#b97a1e', activeGlow: 'rgba(185,122,30,0.7)',
      teal: '#2f8fa6'
    }
  };

  function hash01(str, salt) {
    var s = str + '::' + salt;
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 100000) / 100000;
  }

  function Star(task) {
    var mx = 0.08, my = 0.1;
    this.id = task.id;
    this.nx = mx + hash01(task.id, 'x') * (1 - mx * 2);
    this.ny = my + hash01(task.id, 'y') * (1 - my * 2 - 0.12);
    this.tw = hash01(task.id, 'tw') * Math.PI * 2;
    this.completed = task.completed;
    this.completedAt = task.completedAt;
    this.life = 0;
    this.x = 0; this.y = 0;
  }

  function createStarfield(canvas) {
    var ctx = canvas.getContext('2d');
    var stars = [];
    var raf = null;
    var start = performance.now();
    var w = 0, h = 0, dpr = 1;
    var edges = [];
    var visible = true;
    var reduced = u.prefersReducedMotion();

    function palette() {
      var theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      return PALETTES[theme];
    }

    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      w = canvas.clientWidth || global.innerWidth;
      h = canvas.clientHeight || global.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutStars();
      if (reduced) renderOnce();
    }

    function layoutStars() {
      stars.forEach(function (s) {
        s.x = s.nx * w;
        s.y = s.ny * h;
      });
      edges = buildEdges();
    }

    function sync(tasks, newlyCompletedIds) {
      var map = {};
      tasks.forEach(function (t) { map[t.id] = t; });

      // 移除已不存在的
      stars = stars.filter(function (s) { return map[s.id]; });

      var have = {};
      stars.forEach(function (s) { have[s.id] = true; });

      tasks.forEach(function (t) {
        if (!have[t.id]) stars.push(new Star(t));
      });
      stars.forEach(function (s) {
        var t = map[s.id];
        if (s.completed !== t.completed) {
          s.completed = t.completed;
          s.completedAt = t.completedAt;
          if (t.completed) s.life = 1;
        }
      });
      if (newlyCompletedIds && newlyCompletedIds.length) {
        stars.forEach(function (s) { if (newlyCompletedIds.indexOf(s.id) !== -1) s.life = 1; });
      }
      layoutStars();
      if (reduced) renderOnce();
      else loop();
    }

    function activeStars() {
      return stars.filter(function (s) { return s.completed; })
        .sort(function (a, b) { return (a.completedAt || 0) - (b.completedAt || 0); });
    }

    function buildEdges() {
      var list = activeStars();
      if (list.length < 2) return [];
      var remaining = list.slice(1);
      var cur = list[0];
      var out = [];
      while (remaining.length) {
        var bi = 0, bd = Infinity;
        for (var i = 0; i < remaining.length; i++) {
          var dx = cur.x - remaining[i].x, dy = cur.y - remaining[i].y;
          var d = dx * dx + dy * dy;
          if (d < bd) { bd = d; bi = i; }
        }
        var next = remaining.splice(bi, 1)[0];
        out.push([cur, next, Math.sqrt(bd)]);
        cur = next;
      }
      return out;
    }

    /* ---------------- 绘制 ---------------- */
    function drawOrbits(t, p) {
      var cx = w * 0.5, cy = h * 0.34;
      for (var i = 0; i < 3; i++) {
        var rx = Math.min(w, h) * (0.55 + i * 0.32);
        var ry = rx * 0.42;
        var rot = reduced ? (i * 0.4) : (i * 0.4 + t * 0.00002 * (i % 2 ? 1 : -1));
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
        ctx.strokeStyle = p.orbit[i];
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function drawReticle(p) {
      var x = w * 0.82, y = h * 0.18, r = Math.min(w, h) * 0.07;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.moveTo(x - r - 8, y); ctx.lineTo(x + r + 8, y);
      ctx.moveTo(x, y - r - 8); ctx.lineTo(x, y + r + 8);
      ctx.strokeStyle = p.reticle; ctx.lineWidth = 1; ctx.stroke();
    }

    function drawEdges(p) {
      ctx.beginPath();
      edges.forEach(function (e) { ctx.moveTo(e[0].x, e[0].y); ctx.lineTo(e[1].x, e[1].y); });
      ctx.strokeStyle = p.line; ctx.lineWidth = 1; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
    }

    function drawStars(t, p) {
      stars.forEach(function (s) {
        var flick = s.completed ? 1 : (0.7 + 0.3 * Math.sin(t * 0.002 + s.tw));
        if (s.completed) {
          var pulse = s.life > 0 ? (1 + s.life * 1.6) : 1;
          var r = 2.1 * pulse;
          ctx.save();
          ctx.shadowBlur = 12 + s.life * 18;
          ctx.shadowColor = p.activeGlow;
          ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          ctx.fillStyle = p.active; ctx.globalAlpha = flick; ctx.fill();
          ctx.restore();
          if (s.life > 0) {
            ctx.beginPath(); ctx.arc(s.x, s.y, r + (1 - s.life) * 26, 0, Math.PI * 2);
            ctx.strokeStyle = p.activeGlow; ctx.globalAlpha = s.life * 0.6; ctx.lineWidth = 1.4; ctx.stroke();
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.beginPath(); ctx.arc(s.x, s.y, 1.25, 0, Math.PI * 2);
          ctx.fillStyle = p.dim; ctx.globalAlpha = flick; ctx.fill(); ctx.globalAlpha = 1;
        }
      });
    }

    function frame(t, p) {
      ctx.clearRect(0, 0, w, h);
      drawOrbits(t, p);
      drawReticle(p);
      drawEdges(p);
      drawStars(t, p);
    }

    function renderOnce() {
      frame(0, palette());
    }

    function loop() {
      if (raf) return;
      function step(now) {
        frame(now - start, palette());
        stars.forEach(function (s) { if (s.life > 0) s.life = Math.max(0, s.life - 0.016); });
        if (visible) raf = requestAnimationFrame(step);
        else raf = null;
      }
      raf = requestAnimationFrame(step);
    }

    function stop() { visible = false; if (raf) { cancelAnimationFrame(raf); raf = null; } }
    function startLoop() { visible = true; if (!reduced) loop(); }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else { visible = true; if (!reduced) { loop(); } else renderOnce(); }
    });

    global.addEventListener('resize', u.debounce(resize, 150));

    resize();

    return { sync: sync, resize: resize, renderOnce: renderOnce, loop: startLoop, stop: stop };
  }

  var field = null;
  function init() {
    var canvas = u.$('#starfield');
    if (!canvas) return null;
    field = createStarfield(canvas);
    return field;
  }
  function sync(tasks, ids) { if (field) field.sync(tasks, ids); }
  function refreshTheme() { if (field) field.renderOnce(); }

  App.starfield = { init: init, sync: sync, refreshTheme: refreshTheme };
})(window);
