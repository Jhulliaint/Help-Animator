/* =====================================================================
   state.js — central data model + observable store + undo/redo history
   ===================================================================== */
(function (HA) {
  'use strict';

  // The complete set of animation keys Jeux-Math-o's Hero._animKey() can ask for:
  // {state}_{direction} with state ∈ {idle,walk,attack,guard}, dir ∈ {down,up,left,right}.
  // Keeping the tool's defaults identical to the game's keys means a freshly
  // created project already lines up with what the game's SpriteAnimator expects.
  var GAME_DIRECTIONS = ['down', 'up', 'left', 'right'];
  var GAME_ANIMATION_KEYS = [
    'idle_down', 'idle_up', 'idle_left', 'idle_right',
    'walk_down', 'walk_up', 'walk_left', 'walk_right',
    'attack_down', 'attack_up', 'attack_left', 'attack_right',
    'guard_down', 'guard_up', 'guard_left', 'guard_right'
  ];
  // The game ships guard_down; the other guard directions fall back to idle_<dir>
  // gracefully, so the validator flags them as optional (info, not a warning).
  var GAME_OPTIONAL_KEYS = ['guard_up', 'guard_left', 'guard_right'];
  var DEFAULT_ANIMATION_NAMES = GAME_ANIMATION_KEYS.slice();

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
        spacingX: 0, spacingY: 0,
        inset: 0
      },
      animations: [],               // [{ id, name, frames:[{spriteId,row,col}], fps, loop }]
      preview: { fps: 8, loop: true, scale: 4 },
      export: {
        format: 'js', varName: 'HERO_SPRITE_MAP', pretty: true, includeEmpty: false, padIds: 2,
        // Settings for the "Jeux-Math-o" export preset (the game's SpriteAnimator JSON).
        game: {
          sheet: './assets/sprites/hero-sheet.png',
          cell: 0,                 // 0 = auto: use the current sprite width (square cell)
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
  HA.GAME_ANIMATION_KEYS = GAME_ANIMATION_KEYS;
  HA.GAME_OPTIONAL_KEYS = GAME_OPTIONAL_KEYS;
  HA.GAME_DIRECTIONS = GAME_DIRECTIONS;
  HA.uid = uid;
  HA.defaultProject = defaultProject;
  HA.store = store;

})(window.HA = window.HA || {});
