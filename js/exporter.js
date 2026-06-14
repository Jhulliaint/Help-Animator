/* =====================================================================
   exporter.js — generate the HERO_SPRITE_MAP string (JS / JSON / TS)
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

  function exportString(project) {
    var opt = project.export;
    var map = buildMap(project, opt.includeEmpty);
    var name = (opt.varName || 'HERO_SPRITE_MAP').trim() || 'HERO_SPRITE_MAP';

    if (opt.format === 'json') {
      return jsonBody(map, opt.pretty) + '\n';
    }
    if (opt.format === 'ts') {
      return 'export const ' + name + ' = ' + objectBody(map, opt.pretty) + ' as const;\n';
    }
    return 'const ' + name + ' = ' + objectBody(map, opt.pretty) + ';\n';
  }

  function fileExtension(format) {
    return format === 'json' ? 'json' : (format === 'ts' ? 'ts' : 'js');
  }

  HA.exporter = {
    buildMap: buildMap,
    exportString: exportString,
    fileExtension: fileExtension
  };

})(window.HA = window.HA || {});
