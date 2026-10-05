/* ============================================================
   MERIDIAN · audio
   原生 Web Audio 合成音效（懒加载 / 手势解锁 / 低音量 / 包络）
   ============================================================ */
(function (global) {
  'use strict';
  var App = global.App;

  var ctx = null;
  var master = null;
  var enabled = false;
  var MASTER_VOL = 0.26;

  /* 音效配方：频率序列、波形、单音时长 */
  var RECIPES = {
    add:       { freqs: [523.25, 659.25], type: 'triangle', dur: 0.085, gap: 0.05, vol: 0.9 },
    complete:  { freqs: [659.25, 880.0, 1174.7], type: 'sine', dur: 0.1, gap: 0.06, vol: 1 },
    uncomplete:{ freqs: [740, 523.25], type: 'sine', dur: 0.09, gap: 0.05, vol: 0.8 },
    delete:    { freqs: [311, 207], type: 'triangle', dur: 0.1, gap: 0.05, vol: 0.8 },
    undo:      { freqs: [466, 349], type: 'sine', dur: 0.08, gap: 0.04, vol: 0.75 },
    redo:      { freqs: [349, 466], type: 'sine', dur: 0.08, gap: 0.04, vol: 0.75 },
    open:      { freqs: [600, 760], type: 'sine', dur: 0.06, gap: 0.03, vol: 0.6 },
    error:     { freqs: [220, 196], type: 'square', dur: 0.12, gap: 0.06, vol: 0.4 },
    tick:      { freqs: [880], type: 'sine', dur: 0.03, gap: 0, vol: 0.35 }
  };

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      return true;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? MASTER_VOL : 0;
      master.connect(ctx.destination);
      return true;
    } catch (e) { ctx = null; return false; }
  }

  function setEnabled(v) {
    enabled = !!v;
    if (!ctx) return;
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(enabled ? MASTER_VOL : 0, now + 0.08);
  }

  function playTone(freq, start, dur, type, vol) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);

    // 低频再削一档，避免笔记本破音
    var peak = (vol || 0.8) * (freq < 240 ? 0.55 : 1);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.012);          // attack ≥5ms
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);     // release

    osc.connect(gain); gain.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function play(name) {
    if (!enabled) return;
    var recipe = RECIPES[name];
    if (!recipe) return;
    if (!ensure()) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    var t = ctx.currentTime + 0.01;
    recipe.freqs.forEach(function (f, i) {
      playTone(f, t + i * (recipe.dur + recipe.gap), recipe.dur, recipe.type, recipe.vol);
    });
  }

  /* 在任意用户手势中调用，提前解锁（即使当前静音也建立上下文） */
  function unlock() { if (ensure()) { if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} } } }

  App.audio = { play: play, setEnabled: setEnabled, unlock: unlock, ensure: ensure };
})(window);
