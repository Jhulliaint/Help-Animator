/* =====================================================================
   validate.js — pure pre-export checks (no DOM). Multi-sheet aware.
   Returns { issues: [{ level:'error'|'warn'|'info', msg }], counts }.
   ===================================================================== */
(function (HA) {
  'use strict';

  function run(project, runtime) {
    var issues = [];
    var sheets = project.sheets || [];
    var multiSheet = false;

    function sheetById(id) { return sheets.find(function (s) { return s.id === id; }) || null; }
    function sheetLabel(s) { return sheets.length > 1 ? (' [' + (s.name || 'planche') + ']') : ''; }

    // index animations by name + figure out how many sheets are actually used
    var byName = {};
    var usedSheets = {};
    project.animations.forEach(function (a) {
      byName[a.name] = a;
      (a.frames || []).forEach(function (f) { usedSheets[f.sheetId] = 1; });
    });
    multiSheet = Object.keys(usedSheets).length > 1;

    /* 1) frames outside their own sheet's grid -------------------------- */
    project.animations.forEach(function (a) {
      (a.frames || []).forEach(function (f, i) {
        var sh = sheetById(f.sheetId);
        if (!sh) {
          issues.push({ level: 'error', msg: '« ' + a.name + ' » frame #' + (i + 1) + ' : planche source introuvable' });
          return;
        }
        var rows = Math.max(1, sh.slicing.rows | 0);
        var cols = Math.max(1, sh.slicing.columns | 0);
        if (f.row < 0 || f.col < 0 || f.row >= rows || f.col >= cols) {
          issues.push({
            level: 'error',
            msg: '« ' + a.name + ' » frame #' + (i + 1) + ' [' + f.row + ',' + f.col + '] hors grille' + sheetLabel(sh) +
                 ' (' + rows + '×' + cols + ')'
          });
        }
      });
    });

    /* 2) non-square cells — only matters when NOT repacking (single sheet),
          because the atlas repack scales every frame to a square cell ------ */
    if (!multiSheet) {
      Object.keys(usedSheets).forEach(function (id) {
        var sh = sheetById(id);
        if (sh && sh.slicing.spriteWidth !== sh.slicing.spriteHeight) {
          issues.push({
            level: 'warn',
            msg: 'Sprites non carrés' + sheetLabel(sh) + ' (' + sh.slicing.spriteWidth + '×' + sh.slicing.spriteHeight +
                 ') — le jeu suppose une cellule carrée. Le preset exporte cell = largeur.'
          });
        }
      });
    }

    /* 3) grid larger than the loaded image (per sheet) ------------------ */
    var images = (runtime && runtime.sheetImages) || {};
    sheets.forEach(function (sh) {
      var img = images[sh.id];
      if (!img || !img.naturalWidth) return;
      var s = sh.slicing;
      var cols = Math.max(1, s.columns | 0), rows = Math.max(1, s.rows | 0);
      var needW = s.marginX + cols * s.spriteWidth + Math.max(0, cols - 1) * s.spacingX;
      var needH = s.marginY + rows * s.spriteHeight + Math.max(0, rows - 1) * s.spacingY;
      if (needW > img.naturalWidth + 0.5 || needH > img.naturalHeight + 0.5) {
        issues.push({
          level: 'warn',
          msg: 'La grille' + sheetLabel(sh) + ' (' + needW + '×' + needH + ' px) dépasse l\'image (' +
               img.naturalWidth + '×' + img.naturalHeight + ' px).'
        });
      }
    });

    /* 4) expected game keys present & non-empty ------------------------ */
    var flip = !!(project.export && project.export.game && project.export.game.flipRightFromLeft);
    (HA.GAME_ANIMATION_KEYS || []).forEach(function (k) {
      var a = byName[k];
      var empty = !a || !a.frames || !a.frames.length;
      if (!empty) return;
      if (flip && /_right$/.test(k)) {
        var left = byName[k.replace(/_right$/, '_left')];
        if (left && left.frames && left.frames.length) {
          issues.push({ level: 'info', msg: '« ' + k + ' » ' + (a ? 'vide' : 'absente') + ' — OK : miroir de ' + k.replace(/_right$/, '_left') + ' (flipRightFromLeft).' });
          return;
        }
      }
      var optional = (HA.GAME_OPTIONAL_KEYS || []).indexOf(k) >= 0;
      var level = optional ? 'info' : (k === 'idle_down' ? 'error' : 'warn');
      var why = optional ? ' — optionnelle (repli sur idle).' : (k === 'idle_down' ? ' — requise (repli ultime du jeu).' : ' — attendue par le jeu.');
      issues.push({ level: level, msg: '« ' + k + ' » ' + (a ? 'vide' : 'absente') + why });
    });

    /* 5) atlas info (multi-sheet repack) ------------------------------- */
    if (multiSheet && HA.atlas) {
      var p = HA.atlas.plan(project);
      issues.push({
        level: 'info',
        msg: 'Atlas : ' + p.sheets.length + ' planches → 1 feuille générée ' + p.cols + '×' + p.rows +
             ' cases de ' + p.cell + ' px (' + p.count + ' frames). Téléchargez la planche générée + la map.'
      });
    }

    var counts = { error: 0, warn: 0, info: 0 };
    issues.forEach(function (it) { counts[it.level] = (counts[it.level] || 0) + 1; });
    return { issues: issues, counts: counts };
  }

  HA.validate = { run: run };

})(window.HA = window.HA || {});
