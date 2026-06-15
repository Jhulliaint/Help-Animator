/* =====================================================================
   presets.js — saved slicing "découpes", reusable across sheets/projects.
   A preset = { id, name, sheetName, slicing, savedAt }. It is keyed by the
   image file name so loading the same sheet restores its slicing.

   Persistence: localStorage (always) + an optional repo file
   `slicing-presets.json` that is best-effort fetched on boot (works on
   http/Vercel; file:// fetch is blocked, so it's silently ignored there)
   and produced by "Exporter" so it can be committed to the repo.
   ===================================================================== */
(function (HA) {
  'use strict';

  var KEY = 'help-animator:slicing-presets:v1';
  var SEED_URL = './slicing-presets.json';
  var list = [];

  function uid() { return 'preset_' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var t = localStorage.getItem(KEY);
      list = t ? JSON.parse(t) : [];
    } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* quota / disabled */ }
  }

  function all() { return list.slice(); }
  function get(id) { return list.find(function (p) { return p.id === id; }); }

  // Most recently saved preset that targets this exact file name.
  function findForSheet(sheetName) {
    if (!sheetName) return null;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].sheetName === sheetName) return list[i];
    }
    return null;
  }

  function normalize(p) {
    return {
      id: p.id || uid(),
      name: p.name || p.sheetName || 'découpe',
      sheetName: p.sheetName || '',
      slicing: clone(p.slicing),
      savedAt: p.savedAt || Date.now()
    };
  }

  // Save the current project's slicing. One preset per sheet name: saving
  // again for the same sheet overwrites it (keeping the custom display name).
  function saveCurrent(name) {
    var p = HA.store.state.project;
    var sheetName = p.spriteSheetName || '';
    var existing = sheetName ? findForSheet(sheetName) : null;
    if (existing) {
      existing.slicing = clone(p.slicing);
      existing.savedAt = Date.now();
      if (name) existing.name = name;
      persist();
      return existing;
    }
    var preset = normalize({ name: name, sheetName: sheetName, slicing: p.slicing });
    list.push(preset);
    persist();
    return preset;
  }

  function apply(id) {
    var p = get(id);
    if (!p) return false;
    HA.actions.updateSlicing(clone(p.slicing));
    return true;
  }

  function rename(id, name) {
    var p = get(id);
    if (!p || !name) return;
    p.name = name;
    persist();
  }

  function remove(id) {
    var i = list.findIndex(function (p) { return p.id === id; });
    if (i >= 0) { list.splice(i, 1); persist(); }
  }

  function exportJSON() { return JSON.stringify(list, null, 2) + '\n'; }

  // Merge presets from a JSON array; existing ids are updated in place.
  function importJSON(text) {
    var incoming = JSON.parse(text);
    if (!Array.isArray(incoming)) return 0;
    var n = 0;
    incoming.forEach(function (raw) {
      if (!raw || !raw.slicing) return;
      var rec = normalize(raw);
      var idx = list.findIndex(function (x) { return x.id === rec.id; });
      if (idx >= 0) list[idx] = rec; else list.push(rec);
      n++;
    });
    if (n) persist();
    return n;
  }

  // Best-effort merge of presets committed to the repo. Never overwrites a
  // locally edited preset (merge by id). Returns a Promise<number added>.
  function loadSeed() {
    if (typeof fetch !== 'function') return Promise.resolve(0);
    return fetch(SEED_URL)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (seed) {
        if (!Array.isArray(seed)) return 0;
        var n = 0;
        seed.forEach(function (raw) {
          if (!raw || !raw.slicing || !raw.id) return;
          if (!get(raw.id)) { list.push(normalize(raw)); n++; }
        });
        if (n) persist();
        return n;
      })
      .catch(function () { return 0; });
  }

  load();

  HA.presets = {
    all: all, get: get, findForSheet: findForSheet,
    saveCurrent: saveCurrent, apply: apply, rename: rename, remove: remove,
    exportJSON: exportJSON, importJSON: importJSON, loadSeed: loadSeed
  };

})(window.HA = window.HA || {});
