/* =====================================================================
   actions.js — command layer. Every state mutation goes through here so
   undo-history and autosave stay consistent. Multi-sheet aware.
   ===================================================================== */
(function (HA) {
  'use strict';

  function P() { return HA.store.state.project; }
  function RT() { return HA.store.state.runtime; }
  function AS() { return HA.store.activeSheet(); }
  function activeId() { return P().activeSheetId; }
  function cols() { return Math.max(1, (AS() ? AS().slicing.columns : 8) | 0); }

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

  // A frame remembers its source sheet. New frames default to the active sheet.
  function normalizeFrame(f) {
    var c = cols();
    var row = f.row, col = f.col;
    if ((row == null || col == null) && f.spriteId != null) {
      row = Math.floor(f.spriteId / c); col = f.spriteId % c;
    }
    return { sheetId: f.sheetId || activeId(), row: row, col: col };
  }

  function extractAnimations(obj) {
    if (!obj || typeof obj !== 'object') return [];
    var c = cols();
    if (Array.isArray(obj.animations)) {
      return obj.animations.map(function (a) {
        return {
          name: a.name || 'animation',
          frames: (a.frames || []).map(function (f) {
            var row = f.row, col = f.col;
            if ((row == null || col == null) && f.spriteId != null) { row = Math.floor(f.spriteId / c); col = f.spriteId % c; }
            return { row: row, col: col };   // sheetId stamped on merge (active sheet)
          }),
          fps: a.fps, loop: a.loop, locked: a.locked
        };
      });
    }
    var map = (obj.animations && typeof obj.animations === 'object') ? obj.animations : obj;
    return Object.keys(map).filter(function (k) { return Array.isArray(map[k]); }).map(function (name) {
      return {
        name: name,
        frames: map[name].filter(function (p) { return Array.isArray(p) && p.length >= 2; })
          .map(function (p) { return { row: p[0], col: p[1] }; }),
        fps: 8, loop: true, locked: false
      };
    });
  }

  var actions = {

    /* ----------------------------- slicing (active sheet) --------------- */
    updateSlicing: function (patch) {
      var s = AS(); if (!s) return;
      Object.assign(s.slicing, patch);
      HA.sheet.clearCache();
      HA.store.recomputeCells();
      after('slicing');
    },
    deriveGrid: function () {
      var rt = RT(); if (!rt.imageLoaded) return;
      var d = HA.slicer.deriveColumnsRows(rt.imageWidth, rt.imageHeight, AS().slicing);
      this.updateSlicing(d);
    },
    deriveSize: function () {
      var rt = RT(); if (!rt.imageLoaded) return;
      var d = HA.slicer.deriveSpriteSize(rt.imageWidth, rt.imageHeight, AS().slicing);
      this.updateSlicing(d);
    },

    /* ----------------------------- sheets (image bank) ------------------ */
    // Import an image: fill the active sheet if it's empty, else add a new sheet.
    importImage: function (name, dataUrl) {
      return HA.sheet.loadImageFromDataUrl(dataUrl).then(function (img) {
        var target = AS();
        if (target && target.imageDataUrl) {     // active already has an image -> new sheet
          target = HA.defaultSheet(name);
          P().sheets.push(target);
          P().activeSheetId = target.id;
        }
        target.name = name;
        target.imageDataUrl = dataUrl;
        RT().sheetImages[target.id] = img;
        HA.sheet.clearCache();
        HA.store.syncActiveImage();
        HA.store.recomputeCells();
        RT().selectedSpriteIds.clear();
        after('image');
        return target;
      });
    },
    setActiveSheet: function (id) {
      if (!HA.store.sheetById(id)) return;
      P().activeSheetId = id;
      HA.sheet.clearCache();
      HA.store.syncActiveImage();
      HA.store.recomputeCells();
      RT().selectedSpriteIds.clear();
      RT().lastClickedSpriteId = null;
      after('sheet-active');
    },
    renameSheet: function (id, name) {
      var s = HA.store.sheetById(id); if (!s) return;
      s.name = (name || '').trim() || s.name;
      after('sheet-rename');
    },
    removeSheet: function (id) {
      var p = P();
      if (p.sheets.length <= 1) { return false; }   // keep at least one
      var i = p.sheets.findIndex(function (s) { return s.id === id; });
      if (i < 0) return false;
      HA.store.pushHistory();
      p.sheets.splice(i, 1);
      delete RT().sheetImages[id];
      // drop frames that referenced the removed sheet
      p.animations.forEach(function (a) {
        a.frames = a.frames.filter(function (f) { return f.sheetId !== id; });
      });
      if (p.activeSheetId === id) p.activeSheetId = p.sheets[0].id;
      HA.sheet.clearCache();
      HA.store.syncActiveImage();
      HA.store.recomputeCells();
      RT().selectedSpriteIds.clear();
      after('sheet-remove');
      return true;
    },

    /* --------------------------- animations --------------------------- */
    addAnimation: function (name) {
      HA.store.pushHistory();
      var anim = { id: HA.uid('anim'), name: uniqueName(name || 'nouvelle_anim'), frames: [], fps: P().preview.fps || 8, loop: true, locked: false };
      P().animations.push(anim);
      RT().selectedAnimationId = anim.id;
      after('anim-add');
      return anim.id;
    },
    addDefaultAnimations: function () {
      HA.store.pushHistory();
      HA.DEFAULT_ANIMATION_NAMES.forEach(function (n) {
        if (!P().animations.some(function (a) { return a.name === n; })) {
          P().animations.push({ id: HA.uid('anim'), name: n, frames: [], fps: P().preview.fps || 8, loop: true, locked: false });
        }
      });
      if (!RT().selectedAnimationId && P().animations[0]) RT().selectedAnimationId = P().animations[0].id;
      after('anim-add');
    },
    mergeAnimationsFromText: function (text) {
      var list = extractAnimations(JSON.parse(text));
      if (!list.length) return 0;
      HA.store.pushHistory();
      list.forEach(function (a) {
        P().animations.push({
          id: HA.uid('anim'),
          name: uniqueName(a.name),
          frames: (a.frames || []).map(normalizeFrame),   // stamped to active sheet
          fps: a.fps || 8,
          loop: a.loop !== false,
          locked: !!a.locked
        });
      });
      if (!RT().selectedAnimationId && P().animations[0]) RT().selectedAnimationId = P().animations[0].id;
      after('anim-add');
      return list.length;
    },
    mirrorRightFromLeft: function () {
      HA.store.pushHistory();
      if (!P().export.game) P().export.game = HA.defaultProject().export.game;
      P().export.game.flipRightFromLeft = true;
      var created = 0;
      ['idle', 'walk', 'attack', 'guard'].forEach(function (base) {
        var left = P().animations.find(function (a) { return a.name === base + '_left'; });
        if (left && left.frames.length) {
          var right = P().animations.find(function (a) { return a.name === base + '_right'; });
          if (!right) {
            P().animations.push({ id: HA.uid('anim'), name: base + '_right', frames: [], fps: P().preview.fps || 8, loop: true, locked: false });
            created++;
          }
        }
      });
      after('anim-add');
      return created;
    },
    removeAnimation: function (id) {
      var a = getAnim(id);
      if (a && a.locked) return;
      HA.store.pushHistory();
      var i = P().animations.findIndex(function (x) { return x.id === id; });
      if (i >= 0) P().animations.splice(i, 1);
      if (RT().selectedAnimationId === id) {
        RT().selectedAnimationId = P().animations[0] ? P().animations[0].id : null;
      }
      after('anim-remove');
    },
    clearAllAnimations: function () {
      HA.store.pushHistory();
      var kept = P().animations.filter(function (a) { return a.locked; });
      P().animations = kept;
      if (!kept.some(function (a) { return a.id === RT().selectedAnimationId; })) {
        RT().selectedAnimationId = kept[0] ? kept[0].id : null;
      }
      after('anim-remove');
    },
    renameAnimation: function (id, name) {
      var a = getAnim(id); if (!a || a.locked) return;
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
    setAnimLocked: function (id, locked) {
      var a = getAnim(id); if (!a) return;
      HA.store.pushHistory();
      a.locked = !!locked;
      after('anim-lock');
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
      var a = getAnim(animId); if (!a || a.locked) return;
      HA.store.pushHistory();
      var f = normalizeFrame(frame);
      if (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= a.frames.length) a.frames.splice(atIndex, 0, f);
      else a.frames.push(f);
      after('frame-change');
    },
    addFrames: function (animId, frames, replace) {
      var a = getAnim(animId); if (!a || a.locked) return;
      HA.store.pushHistory();
      var list = frames.map(normalizeFrame);
      a.frames = replace ? list : a.frames.concat(list);
      after('frame-change');
    },
    addSpritesToAnimation: function (animId, spriteIds) {
      var a = getAnim(animId); if (!a || a.locked || !spriteIds.length) return;
      var c = cols(); var sid = activeId();
      HA.store.pushHistory();
      spriteIds.forEach(function (id) {
        a.frames.push({ sheetId: sid, row: Math.floor(id / c), col: id % c });
      });
      after('frame-change');
    },
    insertFrames: function (animId, frames, atIndex) {
      var a = getAnim(animId); if (!a || a.locked || !frames.length) return;
      HA.store.pushHistory();
      var list = frames.map(normalizeFrame);
      var at = (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= a.frames.length) ? atIndex : a.frames.length;
      a.frames.splice.apply(a.frames, [at, 0].concat(list));
      after('frame-change');
    },
    removeFrame: function (animId, index) {
      var a = getAnim(animId); if (!a || a.locked) return;
      HA.store.pushHistory();
      a.frames.splice(index, 1);
      after('frame-change');
    },
    moveFrame: function (animId, from, to) {
      var a = getAnim(animId); if (!a || a.locked) return;
      if (from === to) return;
      HA.store.pushHistory();
      var item = a.frames.splice(from, 1)[0];
      var dest = to;
      if (from < to) dest = to - 1;
      dest = Math.max(0, Math.min(a.frames.length, dest));
      a.frames.splice(dest, 0, item);
      after('frame-change');
    },
    clearFrames: function (animId) {
      var a = getAnim(animId); if (!a || a.locked) return;
      HA.store.pushHistory();
      a.frames = [];
      after('frame-change');
    },

    /* ------------------------- export settings ------------------------- */
    updateExport: function (patch) {
      Object.assign(P().export, patch);
      after('export-opt');
    },
    updateExportGame: function (patch) {
      if (!P().export.game) P().export.game = HA.defaultProject().export.game;
      Object.assign(P().export.game, patch);
      after('export-opt');
    },
    updatePreview: function (patch) {
      Object.assign(P().preview, patch);
      after('preview-opt');
    }
  };

  HA.actions = actions;

})(window.HA = window.HA || {});
