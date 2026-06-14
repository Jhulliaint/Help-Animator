/* =====================================================================
   validate.js — pure pre-export checks (no DOM)
   Surfaces the gap between what the tool produces and what Jeux-Math-o
   actually expects, so the exported map drops into the game cleanly.
   Returns { issues: [{ level:'error'|'warn'|'info', msg }], counts }.
   ===================================================================== */
(function (HA) {
  'use strict';

  function run(project, runtime) {
    var issues = [];
    var s = project.slicing;
    var cols = Math.max(1, s.columns | 0);
    var rows = Math.max(1, s.rows | 0);

    // index animations by name (names are unique by construction)
    var byName = {};
    project.animations.forEach(function (a) { byName[a.name] = a; });

    /* 1) frames outside the grid -------------------------------------- */
    project.animations.forEach(function (a) {
      (a.frames || []).forEach(function (f, i) {
        if (f.row < 0 || f.col < 0 || f.row >= rows || f.col >= cols) {
          issues.push({
            level: 'error',
            msg: '« ' + a.name + ' » frame #' + (i + 1) + ' [' + f.row + ',' + f.col +
                 '] hors grille (' + rows + ' lignes × ' + cols + ' colonnes)'
          });
        }
      });
    });

    /* 2) non-square cells (the game draws a single square `cell`) ------ */
    if (s.spriteWidth !== s.spriteHeight) {
      issues.push({
        level: 'warn',
        msg: 'Sprites non carrés (' + s.spriteWidth + '×' + s.spriteHeight +
             ') — le jeu suppose une cellule carrée. Le preset exporte cell = largeur (' + s.spriteWidth + ').'
      });
    }

    /* 3) grid larger than the loaded image ---------------------------- */
    if (runtime && runtime.imageLoaded) {
      var needW = s.marginX + cols * s.spriteWidth + Math.max(0, cols - 1) * s.spacingX;
      var needH = s.marginY + rows * s.spriteHeight + Math.max(0, rows - 1) * s.spacingY;
      if (needW > runtime.imageWidth + 0.5 || needH > runtime.imageHeight + 0.5) {
        issues.push({
          level: 'warn',
          msg: 'La grille (' + needW + '×' + needH + ' px) dépasse l\'image (' +
               runtime.imageWidth + '×' + runtime.imageHeight + ' px) — vérifiez taille/colonnes/lignes.'
        });
      }
    }

    /* 4) animation keys the game expects, but missing or empty -------- */
    var flip = !!(project.export && project.export.game && project.export.game.flipRightFromLeft);
    (HA.GAME_ANIMATION_KEYS || []).forEach(function (key) {
      var a = byName[key];
      var empty = !a || !a.frames || !a.frames.length;
      if (!empty) return;

      // _right may legitimately be empty when mirrored from _left.
      if (flip && /_right$/.test(key)) {
        var leftKey = key.replace(/_right$/, '_left');
        var left = byName[leftKey];
        if (left && left.frames && left.frames.length) {
          issues.push({
            level: 'info',
            msg: '« ' + key + ' » ' + (a ? 'vide' : 'absente') + ' — OK : miroir de ' + leftKey + ' (flipRightFromLeft).'
          });
          return;
        }
      }

      var optional = (HA.GAME_OPTIONAL_KEYS || []).indexOf(key) >= 0;
      var level = optional ? 'info' : (key === 'idle_down' ? 'error' : 'warn');
      var why = optional ? ' — optionnelle (repli sur idle).'
        : (key === 'idle_down' ? ' — requise (repli ultime du jeu).' : ' — attendue par le jeu.');
      issues.push({ level: level, msg: '« ' + key + ' » ' + (a ? 'vide' : 'absente') + why });
    });

    var counts = { error: 0, warn: 0, info: 0 };
    issues.forEach(function (it) { counts[it.level] = (counts[it.level] || 0) + 1; });
    return { issues: issues, counts: counts };
  }

  HA.validate = { run: run };

})(window.HA = window.HA || {});
