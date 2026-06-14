/* =====================================================================
   preview.js — bottom dock animation player
   ===================================================================== */
(function (HA) {
  'use strict';

  var canvas, ctx, nameEl, frameInfoEl, playBtn, mirrorBtn;
  var fpsRange, fpsNum, scaleRange, loopChk;

  var mirror = false;
  var playing = false;
  var frameIndex = 0;
  var acc = 0;
  var lastTs = 0;
  var rafId = null;
  var watchedAnimId = null;

  function currentAnim() {
    var rt = HA.store.state.runtime;
    return HA.store.state.project.animations.find(function (a) { return a.id === rt.selectedAnimationId; }) || null;
  }

  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? '⏸' : '▶';
    if (on) {
      lastTs = performance.now();
      loop(lastTs);
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function loop(ts) {
    if (!playing) return;
    var anim = currentAnim();
    var dt = ts - lastTs;
    lastTs = ts;

    if (anim && anim.frames.length) {
      var fps = anim.fps || 8;
      acc += dt;
      var step = 1000 / fps;
      while (acc >= step) {
        acc -= step;
        frameIndex++;
        if (frameIndex >= anim.frames.length) {
          if (anim.loop) {
            frameIndex = 0;
          } else {
            frameIndex = anim.frames.length - 1;
            setPlaying(false);
            draw();
            return;
          }
        }
      }
      draw();
    }
    rafId = requestAnimationFrame(loop);
  }

  function clampFrame(anim) {
    if (!anim || !anim.frames.length) { frameIndex = 0; return; }
    if (frameIndex >= anim.frames.length) frameIndex = 0;
    if (frameIndex < 0) frameIndex = anim.frames.length - 1;
  }

  function draw() {
    var anim = currentAnim();
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!anim) {
      nameEl.textContent = '— aucune animation —';
      frameInfoEl.textContent = 'frame 0 / 0';
      return;
    }
    nameEl.textContent = anim.name;
    clampFrame(anim);

    if (!anim.frames.length) {
      frameInfoEl.textContent = 'frame 0 / 0';
      return;
    }
    frameInfoEl.textContent = 'frame ' + (frameIndex + 1) + ' / ' + anim.frames.length;

    var frame = anim.frames[frameIndex];
    var s = HA.store.state.project.slicing;
    var scale = HA.store.state.project.preview.scale || 4;
    var dw = s.spriteWidth * scale;
    var dh = s.spriteHeight * scale;
    // fit inside canvas
    var fit = Math.min(w / dw, h / dh, 1);
    dw *= fit; dh *= fit;
    var dx = (w - dw) / 2;
    var dy = (h - dh) / 2;

    var drawn;
    if (mirror) {
      // flip horizontally in place (centered sprite stays centered)
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      drawn = HA.sheet.drawFrame(ctx, frame, dx, dy, dw, dh);
      ctx.restore();
    } else {
      drawn = HA.sheet.drawFrame(ctx, frame, dx, dy, dw, dh);
    }
    if (!drawn) {
      ctx.fillStyle = '#6f688f';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[' + frame.row + ', ' + frame.col + ']', w / 2, h / 2);
    }
  }

  /* --------------------------- controls --------------------------- */

  function syncControlsFromAnim() {
    var anim = currentAnim();
    var fps = anim ? anim.fps : (HA.store.state.project.preview.fps || 8);
    var loop = anim ? anim.loop : true;
    fpsRange.value = Math.min(30, fps);
    fpsNum.value = fps;
    loopChk.checked = loop;
    scaleRange.value = HA.store.state.project.preview.scale || 4;
  }

  function onFps(v) {
    var anim = currentAnim();
    v = Math.max(1, Math.min(60, +v || 8));
    fpsNum.value = v;
    fpsRange.value = Math.min(30, v);
    if (anim) HA.actions.setAnimFps(anim.id, v);
    HA.actions.updatePreview({ fps: v });
  }

  function step(dir) {
    var anim = currentAnim();
    if (!anim || !anim.frames.length) return;
    setPlaying(false);
    frameIndex = (frameIndex + dir + anim.frames.length) % anim.frames.length;
    draw();
  }

  function init() {
    canvas = document.getElementById('preview-canvas');
    ctx = canvas.getContext('2d');
    nameEl = document.getElementById('prev-name');
    frameInfoEl = document.getElementById('prev-frame-info');
    playBtn = document.getElementById('btn-play');
    mirrorBtn = document.getElementById('btn-prev-mirror');
    fpsRange = document.getElementById('prev-fps-range');
    fpsNum = document.getElementById('prev-fps');
    scaleRange = document.getElementById('prev-scale');
    loopChk = document.getElementById('prev-loop');

    playBtn.addEventListener('click', function () { setPlaying(!playing); });
    if (mirrorBtn) {
      mirrorBtn.addEventListener('click', function () {
        mirror = !mirror;
        mirrorBtn.classList.toggle('active', mirror);
        mirrorBtn.setAttribute('aria-pressed', mirror ? 'true' : 'false');
        draw();
      });
    }
    document.getElementById('btn-prev').addEventListener('click', function () { step(-1); });
    document.getElementById('btn-next').addEventListener('click', function () { step(1); });
    fpsRange.addEventListener('input', function () { onFps(fpsRange.value); });
    fpsNum.addEventListener('change', function () { onFps(fpsNum.value); });
    scaleRange.addEventListener('input', function () {
      HA.actions.updatePreview({ scale: +scaleRange.value });
      draw();
    });
    loopChk.addEventListener('change', function () {
      var anim = currentAnim();
      if (anim) HA.actions.setAnimLoop(anim.id, loopChk.checked);
      HA.actions.updatePreview({ loop: loopChk.checked });
    });

    HA.store.subscribe(function (state, reason) {
      var anim = currentAnim();
      var animId = anim ? anim.id : null;
      if (animId !== watchedAnimId) {     // switched animation -> restart
        watchedAnimId = animId;
        frameIndex = 0; acc = 0;
        syncControlsFromAnim();
      }
      if (reason === 'anim-fps' || reason === 'anim-loop' || reason === 'project-loaded') {
        syncControlsFromAnim();
      }
      draw();
    });

    syncControlsFromAnim();
    draw();
    setPlaying(true);
  }

  HA.preview = { init: init };

})(window.HA = window.HA || {});
