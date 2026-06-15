/* =====================================================================
   state.js — central data model + observable store + undo/redo history

   v2 model — multi-sheet:
     A project holds a BANK of sheets (each with its own image + slicing).
     One sheet is "active" (the one shown in the central grid / slicing form).
     Each animation frame remembers WHICH sheet it came from ({sheetId,row,col}),
     so a single animation can mix frames from several sheets. On export, used
     frames are repacked into one atlas (see atlas.js) for the game.
   ===================================================================== */
(function (HA) {
  'use strict';

  var GAME_DIRECTIONS = ['down', 'up', 'left', 'right'];
  var GAME_ANIMATION_KEYS = [
    'idle_down', 'idle_up', 'idle_left', 'idle_right',
    'walk_down', 'walk_up', 'walk_left', 'walk_right',
    'attack_down', 'attack_up', 'attack_left', 'attack_right',
    'guard_down', 'guard_up', 'guard_left', 'guard_right'
  ];
  var GAME_OPTIONAL_KEYS = ['guard_up', 'guard_left', 'guard_right'];
  var DEFAULT_ANIMATION_NAMES = GAME_ANIMATION_KEYS.slice();

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9);
  }

  function defaultSlicing() {
    return {
      spriteWidth: 48, spriteHeight: 48,
      columns: 8, rows: 6,
      marginX: 0, marginY: 0,
      spacingX: 0, spacingY: 0,
      inset: 0
    };
  }

  function defaultSheet(name) {
    return { id: uid('sheet'), name: name || '', imageDataUrl: null, slicing: defaultSlicing() };
  }

  // The "project" is exactly what gets serialised to disk.
  function defaultProject() {
    var sheet = defaultSheet('');
    return {
      version: 2,
      sheets: [sheet],
      activeSheetId: sheet.id,
      animations: [],               // [{ id, name, frames:[{sheetId,row,col}], fps, loop, locked }]
      preview: { fps: 8, loop: true, scale: 4 },
      export: {
        format: 'js', varName: 'HERO_SPRITE_MAP', pretty: true, includeEmpty: false, padIds: 2,
        // "Jeux-Math-o" preset / atlas repack settings
        game: {
          sheet: './assets/sprites/hero-sheet.png',
          cell: 0,                 // target atlas cell (0 = auto: largest used sprite)
          atlasCols: 8,            // columns of the generated atlas
          flipRightFromLeft: false,
          fpsWalk: 8, fpsIdle: 3,
          comment: ''
        }
      }
    };
  }

  var store = {
    state: {
      project: defaultProject(),
      runtime: {
        image: null,                // active sheet's loaded Image (mirror, for the grid/overlay)
        imageLoaded: false,
        imageWidth: 0,
        imageHeight: 0,
        sheetImages: {},            // sheetId -> Image (resolves frames from ANY sheet)
        cells: [],                  // computed SpriteCell[] for the active sheet
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

    /* ---------------------- active sheet helpers ---------------------- */
    activeSheet: function () {
      var p = this.state.project;
      return p.sheets.find(function (s) { return s.id === p.activeSheetId; }) || p.sheets[0];
    },
    sheetById: function (id) {
      return this.state.project.sheets.find(function (s) { return s.id === id; }) || null;
    },
    activeSlicing: function () {
      var s = this.activeSheet();
      return s ? s.slicing : null;
    },

    /* ---------------------- history (undo / redo) ---------------------- */
    _snapshot: function () {
      var p = this.state.project;
      return JSON.stringify({ sheets: p.sheets, animations: p.animations, activeSheetId: p.activeSheetId });
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
      p.sheets = snap.sheets;
      p.animations = snap.animations;
      p.activeSheetId = snap.activeSheetId;
      if (!p.sheets.some(function (s) { return s.id === p.activeSheetId; })) {
        p.activeSheetId = p.sheets[0] ? p.sheets[0].id : null;
      }
      if (!p.animations.some(function (a) { return a.id === store.state.runtime.selectedAnimationId; })) {
        store.state.runtime.selectedAnimationId = p.animations[0] ? p.animations[0].id : null;
      }
      HA.sheet.clearCache();
      this.syncActiveImage();
      this.recomputeCells();
    },

    // Keep runtime.image (and dims) pointing at the active sheet's loaded image.
    syncActiveImage: function () {
      var rt = this.state.runtime;
      var a = this.activeSheet();
      var img = a ? rt.sheetImages[a.id] : null;
      rt.image = img || null;
      rt.imageLoaded = !!img;
      rt.imageWidth = img ? img.naturalWidth : 0;
      rt.imageHeight = img ? img.naturalHeight : 0;
    },

    recomputeCells: function () {
      var a = this.activeSheet();
      this.state.runtime.cells = a ? HA.slicer.computeCells(a.slicing) : [];
    }
  };

  HA.DEFAULT_ANIMATION_NAMES = DEFAULT_ANIMATION_NAMES;
  HA.GAME_ANIMATION_KEYS = GAME_ANIMATION_KEYS;
  HA.GAME_OPTIONAL_KEYS = GAME_OPTIONAL_KEYS;
  HA.GAME_DIRECTIONS = GAME_DIRECTIONS;
  HA.uid = uid;
  HA.defaultSlicing = defaultSlicing;
  HA.defaultSheet = defaultSheet;
  HA.defaultProject = defaultProject;
  HA.store = store;
  // convenience shortcuts
  HA.activeSheet = function () { return store.activeSheet(); };
  HA.sheetById = function (id) { return store.sheetById(id); };
  HA.activeSlicing = function () { return store.activeSlicing(); };
  // Stable hue (0-359) for a sheet id — used to colour multi-sheet badges.
  HA.sheetHue = function (id) {
    var h = 0; id = String(id || '');
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % 360;
  };

})(window.HA = window.HA || {});
