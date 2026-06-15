/* =====================================================================
   atlas.js — repacks the frames actually used by the animations into ONE
   regular grid (the "atlas"), so multi-sheet projects export a single
   hero-sheet.png the game can load unchanged.

   plan()          : pure layout (distinct used frames -> slot [R,C]); no DOM.
   buildAnimations(): animation map ({name:[[R,C]...]}) against that layout.
   render()        : DOM — draws the packed PNG (each source cell scaled to the
                     target cell, nearest-neighbour) and returns a data URL.
   ===================================================================== */
(function (HA) {
  'use strict';

  function key(f) { return f.sheetId + ':' + f.row + ':' + f.col; }

  // Distinct frames used across ALL animations, assigned a slot in a grid.
  function plan(project) {
    var g = project.export.game || {};
    var entries = [];
    var index = {};                 // "sheetId:row:col" -> slot number
    var sheetsUsed = {};

    project.animations.forEach(function (a) {
      (a.frames || []).forEach(function (f) {
        var k = key(f);
        if (index[k] == null) {
          index[k] = entries.length;
          entries.push({ sheetId: f.sheetId, row: f.row, col: f.col, key: k });
        }
        sheetsUsed[f.sheetId] = 1;
      });
    });

    var atlasCols = Math.max(1, (g.atlasCols | 0) || 8);

    // target square cell: explicit, else the largest used source sprite.
    var auto = 0;
    entries.forEach(function (e) {
      var sh = HA.store.sheetById(e.sheetId);
      if (sh) auto = Math.max(auto, sh.slicing.spriteWidth | 0, sh.slicing.spriteHeight | 0);
    });
    var cell = (g.cell && g.cell > 0) ? (g.cell | 0) : (auto || 64);

    entries.forEach(function (e, i) { e.slot = i; e.R = Math.floor(i / atlasCols); e.C = i % atlasCols; });

    return {
      entries: entries, index: index,
      cols: atlasCols, rows: Math.max(1, Math.ceil(entries.length / atlasCols)),
      cell: cell, count: entries.length,
      multi: Object.keys(sheetsUsed).length > 1,
      sheets: Object.keys(sheetsUsed)
    };
  }

  function buildAnimations(project, p, includeEmpty) {
    var map = {};
    project.animations.forEach(function (a) {
      if (!includeEmpty && (!a.frames || !a.frames.length)) return;
      map[a.name] = (a.frames || []).map(function (f) {
        var slot = p.index[key(f)];
        return [Math.floor(slot / p.cols), slot % p.cols];
      });
    });
    return map;
  }

  // Browser-only: produce the packed PNG. Scales each source cell to the target
  // cell with nearest-neighbour so pixel-art stays crisp.
  function render(project, p) {
    var canvas = document.createElement('canvas');
    canvas.width = p.cols * p.cell;
    canvas.height = p.rows * p.cell;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    p.entries.forEach(function (e) {
      HA.sheet.drawFrame(ctx, { sheetId: e.sheetId, row: e.row, col: e.col },
        e.C * p.cell, e.R * p.cell, p.cell, p.cell);
    });
    return canvas.toDataURL('image/png');
  }

  HA.atlas = { plan: plan, buildAnimations: buildAnimations, render: render };

})(window.HA = window.HA || {});
