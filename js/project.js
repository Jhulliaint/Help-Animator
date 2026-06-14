/* =====================================================================
   project.js — save / load project files + localStorage autosave
   A project file is a self-contained JSON (image embedded as data URL).
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
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function saveToFile() {
    var p = HA.store.state.project;
    var base = (p.spriteSheetName || 'projet').replace(/\.[^.]+$/, '') || 'projet';
    download(base + '.spritemap.json', serialize(), 'application/json');
  }

  function loadProjectObject(obj) {
    var def = HA.defaultProject();
    var p = Object.assign(def, obj || {});
    p.slicing = Object.assign(HA.defaultProject().slicing, (obj && obj.slicing) || {});
    p.preview = Object.assign(HA.defaultProject().preview, (obj && obj.preview) || {});
    p.export = Object.assign(HA.defaultProject().export, (obj && obj.export) || {});
    p.export.game = Object.assign(HA.defaultProject().export.game, (obj && obj.export && obj.export.game) || {});
    p.animations = ((obj && obj.animations) || []).map(function (a) {
      return {
        id: a.id || HA.uid('anim'),
        name: a.name || 'animation',
        frames: (a.frames || []).map(function (f) {
          return { spriteId: f.spriteId, row: f.row, col: f.col };
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
    HA.store._history.length = 0;
    HA.store._future.length = 0;
    HA.sheet.clearCache();

    function finish() {
      HA.store.recomputeCells();
      HA.store.emit('project-loaded');
    }

    if (p.imageDataUrl) {
      return HA.sheet.loadImageFromDataUrl(p.imageDataUrl).then(function (img) {
        rt.image = img;
        rt.imageLoaded = true;
        rt.imageWidth = img.naturalWidth;
        rt.imageHeight = img.naturalHeight;
        finish();
      }).catch(function (e) {
        console.warn('Image du projet illisible', e);
        rt.image = null; rt.imageLoaded = false;
        finish();
      });
    }
    rt.image = null; rt.imageLoaded = false;
    finish();
    return Promise.resolve();
  }

  function loadFromText(text) {
    return loadProjectObject(JSON.parse(text));
  }

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
