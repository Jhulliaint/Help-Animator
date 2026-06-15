/* =====================================================================
   project.js — save / load project files + localStorage autosave.
   A project file is self-contained JSON (each sheet's image embedded as a
   data URL). Loads v2 (multi-sheet) and migrates v1 (single image) on the fly.
   ===================================================================== */
(function (HA) {
  'use strict';

  var AUTOSAVE_KEY = 'help-animator:autosave:v1';

  function serialize() {
    return JSON.stringify(HA.store.state.project, null, 2);
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function saveToFile() {
    var a = HA.store.activeSheet();
    var base = ((a && a.name) || 'projet').replace(/\.[^.]+$/, '') || 'projet';
    download(base + '.spritemap.json', serialize(), 'application/json');
  }

  function loadProjectObject(obj) {
    obj = obj || {};
    var def = HA.defaultProject();
    var p = Object.assign({}, def, obj);

    if (Array.isArray(obj.sheets) && obj.sheets.length) {
      // v2 — multi-sheet
      p.sheets = obj.sheets.map(function (s) {
        return {
          id: s.id || HA.uid('sheet'),
          name: s.name || '',
          imageDataUrl: s.imageDataUrl || null,
          slicing: Object.assign(HA.defaultSlicing(), s.slicing || {})
        };
      });
      p.activeSheetId = (obj.activeSheetId && p.sheets.some(function (s) { return s.id === obj.activeSheetId; }))
        ? obj.activeSheetId : p.sheets[0].id;
    } else {
      // v1 migration — single image + slicing at the top level
      var sheet = {
        id: HA.uid('sheet'),
        name: obj.spriteSheetName || '',
        imageDataUrl: obj.imageDataUrl || null,
        slicing: Object.assign(HA.defaultSlicing(), obj.slicing || {})
      };
      p.sheets = [sheet];
      p.activeSheetId = sheet.id;
    }
    delete p.imageDataUrl; delete p.spriteSheetName; delete p.slicing;
    p.version = 2;

    p.preview = Object.assign(HA.defaultProject().preview, obj.preview || {});
    p.export = Object.assign(HA.defaultProject().export, obj.export || {});
    p.export.game = Object.assign(HA.defaultProject().export.game, (obj.export && obj.export.game) || {});

    var fallbackSheetId = p.sheets[0].id;
    function colsFor(sid) {
      var sh = p.sheets.find(function (s) { return s.id === sid; });
      return Math.max(1, (sh ? sh.slicing.columns : 8) | 0);
    }
    p.animations = ((obj && obj.animations) || []).map(function (a) {
      return {
        id: a.id || HA.uid('anim'),
        name: a.name || 'animation',
        frames: (a.frames || []).map(function (f) {
          var sid = f.sheetId || fallbackSheetId;
          var row = f.row, col = f.col;
          if ((row == null || col == null) && f.spriteId != null) {
            var c = colsFor(sid); row = Math.floor(f.spriteId / c); col = f.spriteId % c;
          }
          return { sheetId: sid, row: row, col: col };
        }),
        fps: a.fps || 8,
        loop: a.loop !== false,
        locked: !!a.locked
      };
    });

    HA.store.state.project = p;
    var rt = HA.store.state.runtime;
    rt.selectedSpriteIds.clear();
    rt.selectedAnimationId = p.animations[0] ? p.animations[0].id : null;
    rt.spriteZoom = rt.spriteZoom || 72;
    rt.sheetImages = {};
    HA.store._history.length = 0;
    HA.store._future.length = 0;
    HA.sheet.clearCache();

    function finish() {
      HA.store.syncActiveImage();
      HA.store.recomputeCells();
      HA.store.emit('project-loaded');
    }

    var loads = p.sheets.filter(function (s) { return s.imageDataUrl; }).map(function (s) {
      return HA.sheet.loadImageFromDataUrl(s.imageDataUrl)
        .then(function (img) { rt.sheetImages[s.id] = img; })
        .catch(function (e) { console.warn('Image de planche illisible', e); });
    });
    if (loads.length) return Promise.all(loads).then(finish);
    finish();
    return Promise.resolve();
  }

  function loadFromText(text) { return loadProjectObject(JSON.parse(text)); }

  function autosave() {
    try { localStorage.setItem(AUTOSAVE_KEY, serialize()); } catch (e) { /* quota / disabled */ }
  }
  function loadAutosave() {
    try {
      var t = localStorage.getItem(AUTOSAVE_KEY);
      if (t) return loadFromText(t);
    } catch (e) { /* ignore */ }
    return null;
  }
  function clearAutosave() {
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { /* ignore */ }
  }

  HA.project = {
    serialize: serialize,
    download: download,
    saveToFile: saveToFile,
    loadProjectObject: loadProjectObject,
    loadFromText: loadFromText,
    autosave: autosave,
    loadAutosave: loadAutosave,
    clearAutosave: clearAutosave
  };

})(window.HA = window.HA || {});
