/* =====================================================================
   exporter.js — generate the HERO_SPRITE_MAP string (JS / JSON / TS / game)
   ===================================================================== */
(function (HA) {
  'use strict';

  // animations -> { name: [[row,col], ...] }
  function buildMap(project, includeEmpty) {
    var map = {};
    project.animations.forEach(function (a) {
      if (!includeEmpty && (!a.frames || !a.frames.length)) return;
      map[a.name] = (a.frames || []).map(function (f) { return [f.row, f.col]; });
    });
    return map;
  }

  function pairsPretty(pairs, indent) {
    if (!pairs.length) return '[]';
    var inner = pairs.map(function (p) { return indent + '  [' + p[0] + ', ' + p[1] + ']'; });
    return '[\n' + inner.join(',\n') + '\n' + indent + ']';
  }
  function pairsCompact(pairs) {
    return '[' + pairs.map(function (p) { return '[' + p[0] + ', ' + p[1] + ']'; }).join(', ') + ']';
  }

  // body for JS / TS object literals (unquoted keys, blank line between entries)
  function objectBody(map, pretty) {
    var keys = Object.keys(map);
    if (!keys.length) return '{}';
    var indent = '  ';
    var entries = keys.map(function (k) {
      var key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
      var val = pretty ? pairsPretty(map[k], indent) : pairsCompact(map[k]);
      return indent + key + ': ' + val;
    });
    return '{\n' + entries.join(pretty ? ',\n\n' : ',\n') + '\n}';
  }

  // body for strict JSON (quoted keys); keeps each pair list inline for readability
  function jsonBody(map, pretty) {
    var keys = Object.keys(map);
    if (!keys.length) return '{}';
    if (!pretty) return JSON.stringify(map);
    var indent = '  ';
    var entries = keys.map(function (k) {
      return indent + JSON.stringify(k) + ': ' + pairsCompact(map[k]);
    });
    return '{\n' + entries.join(',\n') + '\n}';
  }

  function clampInt(v, def, lo) {
    v = parseInt(v, 10);
    if (isNaN(v)) return def;
    lo = (lo == null) ? 1 : lo;
    return v < lo ? lo : v;
  }

  // animations object indented under `baseIndent`, with each pair-list inline.
  function jsonAnimations(map, pretty, baseIndent) {
    var keys = Object.keys(map);
    if (!keys.length) return '{}';
    if (!pretty) return JSON.stringify(map);
    var ind = baseIndent + '  ';
    var entries = keys.map(function (k) {
      return ind + JSON.stringify(k) + ': ' + pairsCompact(map[k]);
    });
    return '{\n' + entries.join(',\n') + '\n' + baseIndent + '}';
  }

  // "Jeux-Math-o" preset: the exact JSON shape the game's SpriteAnimator loads
  // -> { sheet, cell, cols, flipRightFromLeft, fps:{walk,idle}, animations }.
  function gameMapString(project) {
    var g = project.export.game || {};
    var s = project.slicing;
    var explicitCell = clampInt(g.cell, 0, 0);
    var cell = explicitCell > 0 ? explicitCell : clampInt(s.spriteWidth, 1);
    var cols = clampInt(s.columns, 1);
    var sheet = g.sheet || './assets/sprites/hero-sheet.png';
    var fpsWalk = clampInt(g.fpsWalk, 8);
    var fpsIdle = clampInt(g.fpsIdle, 3);
    var flip = !!g.flipRightFromLeft;
    var map = buildMap(project, project.export.includeEmpty);

    if (!project.export.pretty) {
      var out = {};
      if (g.comment) out._comment = g.comment;
      out.sheet = sheet; out.cell = cell; out.cols = cols;
      out.flipRightFromLeft = flip;
      out.fps = { walk: fpsWalk, idle: fpsIdle };
      out.animations = map;
      return JSON.stringify(out) + '\n';
    }

    var rows = [];
    if (g.comment) rows.push('  "_comment": ' + JSON.stringify(g.comment));
    rows.push('  "sheet": ' + JSON.stringify(sheet));
    rows.push('  "cell": ' + cell);
    rows.push('  "cols": ' + cols);
    rows.push('  "flipRightFromLeft": ' + flip);
    rows.push('  "fps": { "walk": ' + fpsWalk + ', "idle": ' + fpsIdle + ' }');
    rows.push('  "animations": ' + jsonAnimations(map, true, '  '));
    return '{\n' + rows.join(',\n') + '\n}\n';
  }

  function exportString(project) {
    var opt = project.export;
    var name = (opt.varName || 'HERO_SPRITE_MAP').trim() || 'HERO_SPRITE_MAP';

    if (opt.format === 'game') {
      return gameMapString(project);
    }
    var map = buildMap(project, opt.includeEmpty);
    if (opt.format === 'json') {
      return jsonBody(map, opt.pretty) + '\n';
    }
    if (opt.format === 'ts') {
      return 'export const ' + name + ' = ' + objectBody(map, opt.pretty) + ' as const;\n';
    }
    return 'const ' + name + ' = ' + objectBody(map, opt.pretty) + ';\n';
  }

  function fileExtension(format) {
    return (format === 'json' || format === 'game') ? 'json' : (format === 'ts' ? 'ts' : 'js');
  }

  HA.exporter = {
    buildMap: buildMap,
    exportString: exportString,
    gameMapString: gameMapString,
    fileExtension: fileExtension
  };

})(window.HA = window.HA || {});
