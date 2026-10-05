/* ============================================================
   MERIDIAN · components/stats
   Bento 仪表（进度环 / 统计） + 标签云
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;
  var u = App.utils;

  var CIRC = 2 * Math.PI * 50; // r=50
  var els = {};
  var tagCloudEl;

  function init() {
    els.ringBar = u.$('#ring-bar');
    els.percent = u.$('#ring-percent');
    els.remaining = u.$('#stat-remaining');
    els.today = u.$('#stat-today');
    els.todayFoot = u.$('#stat-today-foot');
    els.streak = u.$('#stat-streak');
    els.streakFoot = u.$('#stat-streak-foot');
    els.total = u.$('#stat-total');
    els.done = u.$('#stat-done');
    els.rateFoot = u.$('#stat-rate-foot');
    tagCloudEl = u.$('#tag-cloud');
  }

  function update(s) {
    if (!els.ringBar) init();

    var offset = CIRC * (1 - s.rate / 100);
    els.ringBar.style.strokeDashoffset = String(offset);
    els.percent.textContent = s.rate + '%';

    els.remaining.textContent = s.remaining;
    els.today.textContent = s.todayDone;
    els.todayFoot.textContent = s.todayDone ? '今日已点亮 ' + s.todayDone + ' 颗' : '今天尚未点亮';

    els.streak.textContent = s.streak;
    els.streakFoot.textContent = s.streak > 0 ? '连续 ' + s.streak + ' 天保持记录' : '从今天开始累积';

    els.total.textContent = s.total;
    els.done.textContent = s.done;
    els.rateFoot.textContent = s.total ? '已点亮 ' + s.done + ' / ' + s.total : '尚无记录';
  }

  /* ---------------- 标签云 ---------------- */
  function renderTags(tags, activeTag) {
    tagCloudEl.innerHTML = '';
    if (!tags.length) {
      tagCloudEl.appendChild(u.h('span', { class: 'tag-cloud__empty' }, '暂无标签，展开任务可设置星区'));
      return;
    }
    tags.forEach(function (t) {
      var chip = u.h('button', {
        class: 'tag-chip' + (activeTag === t.name ? ' is-active' : ''),
        type: 'button',
        'aria-pressed': activeTag === t.name ? 'true' : 'false'
      }, t.name, u.h('span', { class: 'tag-chip__count', style: 'opacity:.6;font-family:var(--font-mono)' }, String(t.count)));
      chip.addEventListener('click', function () {
        var next = activeTag === t.name ? null : t.name;
        App.store.setUI({ tagFilter: next });
      });
      tagCloudEl.appendChild(chip);
    });
  }

  App.stats = { init: init, update: update, renderTags: renderTags };
})(window);
