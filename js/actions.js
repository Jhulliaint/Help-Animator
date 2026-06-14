/* =====================================================================
   actions.js — command layer. Every state mutation goes through here so
   undo-history and autosave stay consistent.
   ===================================================================== */
(function (HA) {
  'use strict';

  function P() { return HA.store.state.project; }
  function RT() { return HA.store.state.runtime; }

  function after(reason) {
    HA.store.emit(reason);
    HA.project.autosave();
  }

  function getAnim(id) {
    return P().animations.find(function (a) { return a.id === id; });
  }

  function clamp(v, lo, hi) {
    v = +v; if (isNaN(v)) v = lo;
    return Math.max(lo, Math.min(hi, v));
  }

  function uniqueName(name, ownId) {
    name = (name || '').trim() || 'animation';
    var exists = function (n) {
      return P().animations.some(function (a) { return a.name === n && a.id !== ownId; });
    };
    if (!exists(name)) return name;
    var i = 2;
    while (exists(name + '_' + i)) i++;
    return name + '_' + i;
  }

  function normalizeFrame(f) {
    var cols = Math.max(1, P().slicing.columns | 0);
    var id = f.spriteId, row = f.row, col = f.col;
    if (id != null && (row == null || col == null)) { row = Math.floor(id / cols); col = id % cols; }
    if (id == null && row != null && col != null) { id = row * cols + col; }
    return { spriteId: id, row: row, col: col };
  }

  var actions = {

    /* ----------------------------- slicing ----------------------------- */
    // Slicing edits are applied live and are intentionally *not* pushed to
    // history (they would flood the undo stack while typing).
    updateSlicing: function (patch) {
      Object.assign(P().slicing, patch);
      HA.sheet.clearCache();
      HA.store.recomputeCells();
      after('slicing');
    },
    deriveGrid: function () {
      var rt = RT();
      if (!rt.imageLoaded) return;
      var d = HA.slicer.deriveColumnsRows(rt.imageWidth, rt.imageHeight, P().slicing);
      this.updateSlicing(d);
    },
    deriveSize: function () {
      var rt = RT();
      if (!rt.imageLoaded) return;
      var d = HA.slicer.deriveSpriteSize(rt.imageWidth, rt.imageHeight, P().slicing);
      this.updateSlicing(d);
    },

    /* ----------------------------- image ----------------------------- */
    setImage: function (name, dataUrl) {
      return HA.sheet.loadImageFromDataUrl(dataUrl).then(function (img) {
        var rt = RT();
        rt.image = img;
        rt.imageLoaded = true;
        rt.imageWidth = img.naturalWidth;
        rt.imageHeight = img.naturalHeight;
        P().imageDataUrl = dataUrl;
        P().spriteSheetName = name;
        HA.sheet.clearCache();
        HA.store.recomputeCells();
        after('image');
        return img;
      });
    },

    /* --------------------------- animations --------------------------- */
    addAnimation: function (name) {
      HA.store.pushHistory();
      var anim = { id: HA.uid('anim'), name: uniqueName(name || 'nouvelle_anim'), frames: [], fps: P().preview.fps || 8, loop: true };
      P().animations.push(anim);
      RT().selectedAnimationId = anim.id;
      after('anim-add');
      return anim.id;
    },
    addDefaultAnimations: function () {
      HA.store.pushHistory();
      HA.DEFAULT_ANIMATION_NAMES.forEach(function (n) {
        if (!P().animations.some(function (a) { return a.name === n; })) {
          P().animations.push({ id: HA.uid('anim'), name: n, frames: [], fps: P().preview.fps || 8, loop: true });
        }
      });
      if (!RT().selectedAnimationId && P().animations[0]) RT().selectedAnimationId = P().animations[0].id;
      after('anim-add');
    },
    removeAnimation: function (id) {
      HA.store.pushHistory();
      var i = P().animations.findIndex(function (a) { return a.id === id; });
      if (i >= 0) P().animations.splice(i, 1);
      if (RT().selectedAnimationId === id) {
        RT().selectedAnimationId = P().animations[0] ? P().animations[0].id : null;
      }
      after('anim-remove');
    },
    clearAllAnimations: function () {
      HA.store.pushHistory();
      P().animations = [];
      RT().selectedAnimationId = null;
      after('anim-remove');
    },
    renameAnimation: function (id, name) {
      var a = getAnim(id); if (!a) return;
      HA.store.pushHistory();
      a.name = uniqueName(name, id);
      after('anim-rename');
    },
    moveAnimation: function (id, dir) {
      var list = P().animations;
      var i = list.findIndex(function (a) { return a.id === id; });
      var j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      HA.store.pushHistory();
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
      after('anim-move');
    },
    setAnimFps: function (id, fps) {
      var a = getAnim(id); if (!a) return;
      a.fps = clamp(fps, 1, 60);
      after('anim-fps');
    },
    setAnimLoop: function (id, loop) {
      var a = getAnim(id); if (!a) return;
      a.loop = !!loop;
      after('anim-loop');
    },
    selectAnimation: function (id) {
      RT().selectedAnimationId = id;
      HA.store.emit('anim-select');
    },

    /* ----------------------------- frames ----------------------------- */
    addFrame: function (animId, frame, atIndex) {
      var a = getAnim(animId); if (!a) return;
      HA.store.pushHistory();
      var f = normalizeFrame(frame);
      if (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= a.frames.length) {
        a.frames.splice(atIndex, 0, f);
      } else {
        a.frames.push(f);
      }
      after('frame-change');
    },
    addFrames: function (animId, frames, replace) {
      var a = getAnim(animId); if (!a) return;
      HA.store.pushHistory();
      var list = frames.map(normalizeFrame);
      a.frames = replace ? list : a.frames.concat(list);
      after('frame-change');
    },
    addSpritesToAnimation: function (animId, spriteIds) {
      var a = getAnim(animId); if (!a || !spriteIds.length) return;
      var cols = Math.max(1, P().slicing.columns | 0);
      HA.store.pushHistory();
      spriteIds.forEach(function (id) {
        a.frames.push({ spriteId: id, row: Math.floor(id / cols), col: id % cols });
      });
      after('frame-change');
    },
    // Insert several frames at a given index (used for multi-sprite drops).
    insertFrames: function (animId, frames, atIndex) {
      var a = getAnim(animId); if (!a || !frames.length) return;
      HA.store.pushHistory();
      var list = frames.map(normalizeFrame);
      var at = (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= a.frames.length) ? atIndex : a.frames.length;
      a.frames.splice.apply(a.frames, [at, 0].concat(list));
      after('frame-change');
    },
    removeFrame: function (animId, index) {
      var a = getAnim(animId); if (!a) return;
      HA.store.pushHistory();
      a.frames.splice(index, 1);
      after('frame-change');
    },
    // Move frame from "from" to land before original index "to".
    moveFrame: function (animId, from, to) {
      var a = getAnim(animId); if (!a) return;
      if (from === to || from + 1 === to) {
        // dropping right where it already is -> no-op
        if (from === to) return;
      }
      HA.store.pushHistory();
      var item = a.frames.splice(from, 1)[0];
      var dest = to;
      if (from < to) dest = to - 1;
      dest = Math.max(0, Math.min(a.frames.length, dest));
      a.frames.splice(dest, 0, item);
      after('frame-change');
    },
    clearFrames: function (animId) {
      var a = getAnim(animId); if (!a) return;
      HA.store.pushHistory();
      a.frames = [];
      after('frame-change');
    },

    /* ------------------------- export settings ------------------------- */
    updateExport: function (patch) {
      Object.assign(P().export, patch);
      after('export-opt');
    },
    updatePreview: function (patch) {
      Object.assign(P().preview, patch);
      after('preview-opt');
    }
  };

  HA.actions = actions;

})(window.HA = window.HA || {});
