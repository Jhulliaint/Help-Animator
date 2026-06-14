/* =====================================================================
   parse.js — manual frame entry parser
   Accepts:
     "0, 1, 2, 3"          -> sprite ids
     "00 01 02 03"         -> sprite ids (zero padded, space separated)
     "[0,0], [0,1], [0,2]" -> [row, col] coordinates
   ===================================================================== */
(function (HA) {
  'use strict';

  function parseFrames(text) {
    var result = { frames: [], errors: [] };
    if (!text || !text.trim()) return result;

    var s = HA.store.state.project.slicing;
    var cols = Math.max(1, s.columns | 0);
    var rows = Math.max(1, s.rows | 0);
    var maxId = cols * rows - 1;

    // 1) coordinate form [row, col]
    var bracketRe = /\[\s*(\d+)\s*,\s*(\d+)\s*\]/g;
    var m, foundBracket = false;
    while ((m = bracketRe.exec(text)) !== null) {
      foundBracket = true;
      var row = parseInt(m[1], 10);
      var col = parseInt(m[2], 10);
      if (row < 0 || col < 0 || row >= rows || col >= cols) {
        result.errors.push('[' + row + ', ' + col + '] hors grille');
      } else {
        result.frames.push({ spriteId: row * cols + col, row: row, col: col });
      }
    }
    if (foundBracket) return result;

    // 2) plain integer ids
    var tokens = text.split(/[^0-9]+/).filter(function (t) { return t.length; });
    tokens.forEach(function (t) {
      var id = parseInt(t, 10);
      if (isNaN(id) || id < 0 || id > maxId) {
        result.errors.push('#' + t + ' hors grille');
      } else {
        result.frames.push({ spriteId: id, row: Math.floor(id / cols), col: id % cols });
      }
    });
    return result;
  }

  HA.parse = { parseFrames: parseFrames };

})(window.HA = window.HA || {});
