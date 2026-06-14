/* =====================================================================
   state.js — central data model + observable store + undo/redo history
   ===================================================================== */
(function (HA) {
  'use strict';

  var DEFAULT_ANIMATION_NAMES = [
    'idle_down', 'idle_up', 'idle_left', 'idle_right',
    'walk_down', 'walk_up', 'walk_left', 'walk_right',
    'attack_down', 'attack_up', 'attack_left', 'attack_right',
    'guard_down', 'hurt', 'death', 'cast_spell', 'dash_left', 'dash_right'
  ];

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9);
  }

  // The "project" is exactly what gets serialised to disk.
  function defaultProject() {
    return {
      version: 1,
      spriteSheetName: '',
      imageDataUrl: null,
      slicing: {
        spriteWidth: 48, spriteHeight: 48,
        columns: 8, rows: 6,
        marginX: 0, marginY: 0,
        spacingX: 0, spacingY: 0
      },
      animations: [],               // [{ id, name, frames:[{spriteId,row,col}], fps, loop }]
      preview: { fps: 8, loop: true, scale: 4 },
      export: { format: 'js', varName: 'HERO_SPRITE_MAP', pretty: true, includeEmpty: false, padIds: 2 }
    };
  }

  var store = {
    state: {
      project: defaultProject(),
      runtime: {
        image: null,
        imageLoaded: false,
        imageWidth: 0,
        imageHeight: 0,
        cells: [],                  // computed SpriteCell[]
        selectedAnimationId: null,
        selectedSpriteIds: new Set(),
        lastClickedSpriteId: null,
        spriteZoom: 72
      }
    },

    _listeners: new Set(),
    _history: [],
    _future: [],

    subscribe: function (fn) {
      this._listeners.add(fn);
      return function () { store._listeners.delete(fn); };
    },

    emit: function (reason) {
      this._listeners.forEach(function (fn) {
        try { fn(store.state, reason); } catch (e) { console.error('listener error', e); }
      });
    },

    /* ---------------------- history (undo / redo) ---------------------- */
    _snapshot: function () {
      var p = this.state.project;
      return JSON.stringify({ slicing: p.slicing, animations: p.animations });
    },
    pushHistory: function () {
      this._history.push(this._snapshot());
      if (this._history.length > 100) this._history.shift();
      this._future.length = 0;
    },
    canUndo: function () { return this._history.length > 0; },
    canRedo: function () { return this._future.length > 0; },
    undo: function () {
      if (!this._history.length) return false;
      this._future.push(this._snapshot());
      this._restore(JSON.parse(this._history.pop()));
      this.emit('history');
      return true;
    },
    redo: function () {
      if (!this._future.length) return false;
      this._history.push(this._snapshot());
      this._restore(JSON.parse(this._future.pop()));
      this.emit('history');
      return true;
    },
    _restore: function (snap) {
      var p = this.state.project;
      p.slicing = snap.slicing;
      p.animations = snap.animations;
      // a removed animation may have been selected
      if (!p.animations.some(function (a) { return a.id === store.state.runtime.selectedAnimationId; })) {
        store.state.runtime.selectedAnimationId = p.animations[0] ? p.animations[0].id : null;
      }
      HA.sheet.clearCache();
      this.recomputeCells();
    },

    recomputeCells: function () {
      this.state.runtime.cells = HA.slicer.computeCells(this.state.project.slicing);
    }
  };

  HA.DEFAULT_ANIMATION_NAMES = DEFAULT_ANIMATION_NAMES;
  HA.uid = uid;
  HA.defaultProject = defaultProject;
  HA.store = store;

})(window.HA = window.HA || {});
