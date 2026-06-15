/* =====================================================================
   app.js — application bootstrap & top-level wiring
   ===================================================================== */
(function (HA) {
  'use strict';

  /* ----------------------------- toasts ----------------------------- */
  HA.toast = function (msg, type) {
    var c = document.getElementById('toast-container');
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 300);
    }, 2600);
  };

  /* ----------------------------- clipboard ----------------------------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ----------------------------- image import ----------------------------- */
  function importImageFile(file) {
    if (!file || !/^image\//.test(file.type)) { HA.toast('Fichier image invalide', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      HA.actions.setImage(file.name, reader.result).then(function () {
        var p = HA.presets && HA.presets.findForSheet(file.name);
        if (p) {
          HA.presets.apply(p.id);
          refreshPresetSelect(p.id);
          HA.toast('Découpe « ' + p.name + ' » restaurée pour ' + file.name, 'ok');
        } else {
          HA.toast('Image chargée : ' + file.name, 'ok');
        }
      }).catch(function () { HA.toast('Impossible de charger l\'image', 'error'); });
    };
    reader.readAsDataURL(file);
  }

  // Generated demo sheet (no binary asset, file://-safe), laid out 8×5 like the game.
  function loadExample() {
    if (!HA.example) return;
    var url = HA.example.generateDataUrl();
    HA.actions.setImage('exemple-chevalier.png', url).then(function () {
      HA.actions.updateSlicing({
        spriteWidth: HA.example.CELL, spriteHeight: HA.example.CELL,
        columns: HA.example.COLS, rows: HA.example.ROWS,
        marginX: 0, marginY: 0, spacingX: 0, spacingY: 0
      });
      if (!HA.store.state.project.animations.length) HA.actions.addDefaultAnimations();
      HA.toast('Exemple chargé (8×5) — découpez, glissez, prévisualisez', 'ok');
    }).catch(function () { HA.toast('Impossible de générer l\'exemple', 'error'); });
  }

  /* ----------------------------- slicing form ----------------------------- */
  var SLICE_KEYS = ['spriteWidth', 'spriteHeight', 'columns', 'rows', 'marginX', 'marginY', 'spacingX', 'spacingY', 'inset'];

  function refreshSlicingInputs() {
    var s = HA.store.state.project.slicing;
    SLICE_KEYS.forEach(function (k) {
      var el = document.getElementById('sl-' + k);
      if (el && el !== document.activeElement) el.value = s[k];
    });
  }

  function bindSlicingForm() {
    document.querySelectorAll('.slice-input').forEach(function (el) {
      el.addEventListener('input', function () {
        var patch = {};
        var zeroMin = /^(marginX|marginY|spacingX|spacingY|inset)$/.test(el.dataset.key);
        patch[el.dataset.key] = Math.max(zeroMin ? 0 : 1, parseInt(el.value, 10) || 0);
        HA.actions.updateSlicing(patch);
      });
    });
    document.getElementById('btn-derive-grid').addEventListener('click', function () {
      if (!HA.store.state.runtime.imageLoaded) { HA.toast('Chargez d\'abord une image', 'info'); return; }
      HA.actions.deriveGrid();
      HA.toast('Grille déduite de la taille de sprite', 'ok');
    });
    document.getElementById('btn-derive-size').addEventListener('click', function () {
      if (!HA.store.state.runtime.imageLoaded) { HA.toast('Chargez d\'abord une image', 'info'); return; }
      HA.actions.deriveSize();
      HA.toast('Taille de sprite déduite de la grille', 'ok');
    });
  }

  /* ----------------------------- source overlay ----------------------------- */
  function drawSourceOverlay() {
    var wrap = document.getElementById('source-overlay-wrap');
    if (wrap.hidden) return;
    var rt = HA.store.state.runtime;
    var canvas = document.getElementById('source-overlay');
    if (!rt.image) { canvas.width = 0; canvas.height = 0; return; }
    canvas.width = rt.imageWidth;
    canvas.height = rt.imageHeight;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(rt.image, 0, 0);
    ctx.strokeStyle = 'rgba(54,226,226,.8)';
    ctx.lineWidth = 1;
    rt.cells.forEach(function (c) {
      ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.width - 1, c.height - 1);
    });
  }

  /* ----------------------------- export modal ----------------------------- */
  function openExport() {
    document.getElementById('export-modal').hidden = false;
    refreshExportUI();
    refreshExportText();
  }
  function closeExport() { document.getElementById('export-modal').hidden = true; }

  function refreshExportUI() {
    var p = HA.store.state.project;
    var e = p.export;
    document.querySelectorAll('input[name="exp-format"]').forEach(function (r) { r.checked = (r.value === e.format); });
    document.getElementById('exp-varname').value = e.varName;
    document.getElementById('exp-pretty').checked = e.pretty;
    document.getElementById('exp-empty').checked = e.includeEmpty;

    var g = e.game || {};
    document.getElementById('exp-game-sheet').value = g.sheet || '';
    var cellInput = document.getElementById('exp-game-cell');
    cellInput.value = (g.cell && g.cell > 0) ? g.cell : '';
    cellInput.placeholder = 'auto (' + p.slicing.spriteWidth + ')';
    document.getElementById('exp-game-fpswalk').value = g.fpsWalk || 8;
    document.getElementById('exp-game-fpsidle').value = g.fpsIdle || 3;
    document.getElementById('exp-game-flip').checked = !!g.flipRightFromLeft;

    updateExportPanels(e.format);
  }
  function updateExportPanels(format) {
    document.getElementById('export-game').hidden = (format !== 'game');
    // "Nom de variable" is meaningless for JSON / game output: hide it there.
    var varRow = document.getElementById('exp-varname').closest('.field');
    if (varRow) varRow.style.display = (format === 'js' || format === 'ts') ? '' : 'none';
  }
  function refreshExportText() {
    document.getElementById('export-text').value = HA.exporter.exportString(HA.store.state.project);
    refreshValidation();
  }
  function refreshValidation() {
    var hostEl = document.getElementById('export-validation');
    if (!hostEl || !HA.validate) return;
    var res = HA.validate.run(HA.store.state.project, HA.store.state.runtime);
    if (!res.issues.length) {
      hostEl.innerHTML = '<div class="vld ok">✅ Aucune anomalie — la map est prête pour Jeux-Math-o.</div>';
      return;
    }
    var rank = { error: 0, warn: 1, info: 2 };
    var sorted = res.issues.slice().sort(function (a, b) { return rank[a.level] - rank[b.level]; });
    var summary = '<div class="vld-summary">' +
      (res.counts.error ? '<span class="b err">⛔ ' + res.counts.error + '</span>' : '') +
      (res.counts.warn ? '<span class="b wrn">⚠️ ' + res.counts.warn + '</span>' : '') +
      (res.counts.info ? '<span class="b inf">ℹ️ ' + res.counts.info + '</span>' : '') +
      '</div>';
    var items = sorted.map(function (it) {
      var icon = it.level === 'error' ? '⛔' : (it.level === 'warn' ? '⚠️' : 'ℹ️');
      return '<li class="' + it.level + '">' + icon + ' ' + escapeHtml(it.msg) + '</li>';
    }).join('');
    hostEl.innerHTML = summary + '<ul class="vld-list">' + items + '</ul>';
  }

  function bindExportModal() {
    document.getElementById('btn-export').addEventListener('click', openExport);
    document.getElementById('btn-close-export').addEventListener('click', closeExport);
    document.getElementById('export-modal').addEventListener('click', function (ev) {
      if (ev.target.id === 'export-modal') closeExport();
    });
    document.querySelectorAll('input[name="exp-format"]').forEach(function (r) {
      r.addEventListener('change', function () { HA.actions.updateExport({ format: r.value }); refreshExportUI(); refreshExportText(); });
    });
    document.getElementById('exp-varname').addEventListener('input', function (e) {
      HA.actions.updateExport({ varName: e.target.value }); refreshExportText();
    });
    document.getElementById('exp-pretty').addEventListener('change', function (e) {
      HA.actions.updateExport({ pretty: e.target.checked }); refreshExportText();
    });
    document.getElementById('exp-empty').addEventListener('change', function (e) {
      HA.actions.updateExport({ includeEmpty: e.target.checked }); refreshExportText();
    });

    // --- Jeux-Math-o preset fields ---
    function bindGameField(id, key, asInt) {
      document.getElementById(id).addEventListener('input', function (e) {
        var v = asInt ? (e.target.value === '' ? 0 : (parseInt(e.target.value, 10) || 0)) : e.target.value;
        var patch = {}; patch[key] = v;
        HA.actions.updateExportGame(patch); refreshExportText();
      });
    }
    bindGameField('exp-game-sheet', 'sheet', false);
    bindGameField('exp-game-cell', 'cell', true);
    bindGameField('exp-game-fpswalk', 'fpsWalk', true);
    bindGameField('exp-game-fpsidle', 'fpsIdle', true);
    document.getElementById('exp-game-flip').addEventListener('change', function (e) {
      HA.actions.updateExportGame({ flipRightFromLeft: e.target.checked }); refreshExportText();
    });
    document.getElementById('btn-copy-export').addEventListener('click', function () {
      copyText(document.getElementById('export-text').value).then(function (ok) {
        HA.toast(ok === false ? 'Copie impossible' : 'Copié dans le presse-papiers', ok === false ? 'error' : 'ok');
      });
    });
    document.getElementById('btn-download-export').addEventListener('click', function () {
      var e = HA.store.state.project.export;
      var ext = HA.exporter.fileExtension(e.format);
      var name = (e.format === 'game')
        ? 'hero_sprite_map'
        : (e.varName || 'HERO_SPRITE_MAP').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      HA.project.download(name + '.' + ext, document.getElementById('export-text').value,
        ext === 'json' ? 'application/json' : 'text/plain');
      HA.toast('Fichier .' + ext + ' téléchargé', 'ok');
    });
  }

  /* ----------------------------- project actions ----------------------------- */
  function newProject() {
    if (!window.confirm('Créer un nouveau projet ? Les changements non sauvegardés seront perdus.')) return;
    HA.project.loadProjectObject(HA.defaultProject()).then(function () {
      HA.actions.addDefaultAnimations();
      HA.toast('Nouveau projet', 'info');
    });
  }
  function openProjectFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        HA.project.loadFromText(reader.result).then(function () {
          HA.toast('Projet chargé : ' + file.name, 'ok');
        });
      } catch (e) { HA.toast('Projet illisible (JSON invalide)', 'error'); }
    };
    reader.readAsText(file);
  }

  /* ----------------------------- top bar + history ----------------------------- */
  function updateHistoryButtons() {
    document.getElementById('btn-undo').disabled = !HA.store.canUndo();
    document.getElementById('btn-redo').disabled = !HA.store.canRedo();
  }

  function bindTopbar() {
    document.getElementById('btn-new').addEventListener('click', newProject);
    document.getElementById('btn-save').addEventListener('click', function () {
      HA.project.saveToFile(); HA.toast('Projet sauvegardé (.json)', 'ok');
    });
    document.getElementById('btn-open').addEventListener('click', function () {
      document.getElementById('file-project').click();
    });
    document.getElementById('btn-undo').addEventListener('click', function () {
      if (!HA.store.undo()) HA.toast('Rien à annuler', 'info');
    });
    document.getElementById('btn-redo').addEventListener('click', function () {
      if (!HA.store.redo()) HA.toast('Rien à rétablir', 'info');
    });
  }

  /* ----------------------------- center toolbar ----------------------------- */
  function bindCenterToolbar() {
    document.getElementById('btn-select-all').addEventListener('click', function () {
      var rt = HA.store.state.runtime;
      rt.cells.forEach(function (c) { rt.selectedSpriteIds.add(c.id); });
      HA.store.emit('select-sprite');
    });
    document.getElementById('btn-clear-select').addEventListener('click', function () {
      HA.store.state.runtime.selectedSpriteIds.clear();
      HA.store.emit('select-sprite');
    });
    document.getElementById('btn-add-selected').addEventListener('click', function () {
      var rt = HA.store.state.runtime;
      var animId = rt.selectedAnimationId;
      if (!animId) { HA.toast('Sélectionnez une animation à droite', 'info'); return; }
      var anim = HA.store.state.project.animations.find(function (a) { return a.id === animId; });
      if (anim && anim.locked) { HA.toast('Animation figée — déverrouillez pour ajouter', 'info'); return; }
      var ids = Array.from(rt.selectedSpriteIds).sort(function (a, b) { return a - b; });
      if (!ids.length) { HA.toast('Aucun sprite sélectionné', 'info'); return; }
      HA.actions.addSpritesToAnimation(animId, ids);
      HA.toast(ids.length + ' sprite(s) ajouté(s)', 'ok');
    });

    var zoom = document.getElementById('sprite-zoom');
    var zoomVal = document.getElementById('sprite-zoom-val');
    zoom.value = HA.store.state.runtime.spriteZoom;
    zoom.addEventListener('input', function () {
      HA.store.state.runtime.spriteZoom = +zoom.value;
      zoomVal.textContent = zoom.value + 'px';
      HA.store.emit('zoom');
    });

    var overlay = document.getElementById('toggle-overlay');
    overlay.addEventListener('change', function () {
      document.getElementById('source-overlay-wrap').hidden = !overlay.checked;
      drawSourceOverlay();
    });
  }

  /* ----------------------------- right panel header ----------------------------- */
  function bindRightHeader() {
    var nameInput = document.getElementById('anim-new-name');
    function add() {
      HA.actions.addAnimation(nameInput.value);
      nameInput.value = '';
      nameInput.focus();
    }
    document.getElementById('btn-add-anim').addEventListener('click', add);
    nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
    document.getElementById('btn-add-default').addEventListener('click', function () {
      HA.actions.addDefaultAnimations();
      HA.toast('Animations par défaut ajoutées', 'ok');
    });
    document.getElementById('btn-mirror-right').addEventListener('click', function () {
      var n = HA.actions.mirrorRightFromLeft();
      HA.toast('Miroir droite←gauche activé' + (n ? ' (+' + n + ' anim. *_right)' : ''), 'ok');
    });
    document.getElementById('btn-merge-anims').addEventListener('click', function () {
      document.getElementById('file-merge').click();
    });
    document.getElementById('btn-clear-anims').addEventListener('click', function () {
      if (!HA.store.state.project.animations.length) return;
      var locked = HA.store.state.project.animations.filter(function (a) { return a.locked; }).length;
      var msg = locked
        ? 'Supprimer les animations non figées ? (' + locked + ' figée(s) conservée(s))'
        : 'Supprimer toutes les animations ?';
      if (window.confirm(msg)) HA.actions.clearAllAnimations();
    });
  }

  /* ----------------------------- file inputs + dnd ----------------------------- */
  function bindFileInputs() {
    document.getElementById('btn-import-image').addEventListener('click', function () {
      document.getElementById('file-image').click();
    });
    document.getElementById('file-image').addEventListener('change', function (e) {
      if (e.target.files[0]) importImageFile(e.target.files[0]);
      e.target.value = '';
    });
    document.getElementById('file-project').addEventListener('change', function (e) {
      if (e.target.files[0]) openProjectFile(e.target.files[0]);
      e.target.value = '';
    });

    var exBtn = document.getElementById('btn-load-example');
    if (exBtn) exBtn.addEventListener('click', loadExample);

    document.getElementById('file-merge').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) {
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var n = HA.actions.mergeAnimationsFromText(reader.result);
            HA.toast(n ? (n + ' animation(s) fusionnée(s)') : 'Aucune animation trouvée dans le fichier', n ? 'ok' : 'info');
          } catch (err) { HA.toast('Fichier illisible (JSON invalide)', 'error'); }
        };
        reader.readAsText(f);
      }
      e.target.value = '';
    });

    var dz = document.getElementById('drop-image');
    ['dragenter', 'dragover'].forEach(function (t) {
      dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove('dragover'); });
    });
    dz.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files[0];
      if (f) importImageFile(f);
    });
  }

  /* ----------------------------- keyboard ----------------------------- */
  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); HA.store.undo(); }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); HA.store.redo(); }
      else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); HA.project.saveToFile(); HA.toast('Projet sauvegardé', 'ok'); }
      else if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); openExport(); }
      else if (e.key === 'Escape') { closeExport(); }
      else if (e.key === ' ' && !typing && document.getElementById('export-modal').hidden) {
        e.preventDefault(); document.getElementById('btn-play').click();
      }
    });
  }

  /* ----------------------------- slicing presets ----------------------------- */
  function refreshPresetSelect(selectedId) {
    var sel = document.getElementById('preset-select');
    if (!sel) return;
    var opts = ['<option value="">— choisir une découpe —</option>'];
    HA.presets.all().forEach(function (p) {
      var label = p.name + ' (' + p.slicing.columns + '×' + p.slicing.rows + ')';
      opts.push('<option value="' + p.id + '">' + escapeHtml(label) + '</option>');
    });
    sel.innerHTML = opts.join('');
    if (selectedId) sel.value = selectedId;
  }

  function bindPresets() {
    var sel = document.getElementById('preset-select');
    sel.addEventListener('change', function () {
      if (!sel.value) return;
      if (HA.presets.apply(sel.value)) {
        var p = HA.presets.get(sel.value);
        HA.toast('Découpe « ' + (p ? p.name : '') + ' » appliquée', 'ok');
      }
    });
    document.getElementById('btn-preset-save').addEventListener('click', function () {
      var p = HA.presets.saveCurrent();
      refreshPresetSelect(p.id);
      HA.toast('Découpe enregistrée : « ' + p.name + ' » — renommez-la si besoin', 'ok');
    });
    document.getElementById('btn-preset-rename').addEventListener('click', function () {
      if (!sel.value) { HA.toast('Sélectionnez une découpe', 'info'); return; }
      var p = HA.presets.get(sel.value);
      var name = window.prompt('Nouveau nom de la découpe :', p ? p.name : '');
      if (name && name.trim()) { HA.presets.rename(sel.value, name.trim()); refreshPresetSelect(sel.value); }
    });
    document.getElementById('btn-preset-del').addEventListener('click', function () {
      if (!sel.value) { HA.toast('Sélectionnez une découpe', 'info'); return; }
      var p = HA.presets.get(sel.value);
      if (window.confirm('Supprimer la découpe « ' + (p ? p.name : '') + ' » ?')) {
        HA.presets.remove(sel.value);
        refreshPresetSelect();
        HA.toast('Découpe supprimée', 'info');
      }
    });
    document.getElementById('btn-preset-export').addEventListener('click', function () {
      HA.project.download('slicing-presets.json', HA.presets.exportJSON(), 'application/json');
      HA.toast('slicing-presets.json téléchargé — committez-le dans le repo', 'ok');
    });
    document.getElementById('btn-preset-import').addEventListener('click', function () {
      document.getElementById('file-presets').click();
    });
    document.getElementById('file-presets').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) {
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var n = HA.presets.importJSON(reader.result);
            refreshPresetSelect();
            HA.toast(n ? (n + ' découpe(s) importée(s)') : 'Aucune découpe dans le fichier', n ? 'ok' : 'info');
          } catch (err) { HA.toast('Fichier illisible (JSON invalide)', 'error'); }
        };
        reader.readAsText(f);
      }
      e.target.value = '';
    });
  }

  /* ----------------------------- boot ----------------------------- */
  function boot() {
    bindTopbar();
    bindSlicingForm();
    bindCenterToolbar();
    bindRightHeader();
    bindFileInputs();
    bindExportModal();
    bindPresets();
    bindKeyboard();

    // keep top-level chrome in sync with every state change
    HA.store.subscribe(function (state, reason) {
      updateHistoryButtons();
      refreshSlicingInputs();
      drawSourceOverlay();
      var info = document.getElementById('img-info');
      var rt = state.runtime;
      info.textContent = rt.imageLoaded
        ? (state.project.spriteSheetName + '  —  ' + rt.imageWidth + '×' + rt.imageHeight + ' px')
        : 'Aucune image chargée.';
      if (!document.getElementById('export-modal').hidden) refreshExportText();
    });

    // sub-modules
    HA.spriteGrid.init();
    HA.animations.init();
    HA.preview.init();

    refreshPresetSelect();
    HA.presets.loadSeed().then(function () { refreshPresetSelect(); });

    // initial project: autosave if present, else fresh with default animations
    var restored = HA.project.loadAutosave();
    if (restored && restored.then) {
      restored.then(function () { afterInitialLoad(true); });
    } else {
      HA.store.recomputeCells();
      HA.actions.addDefaultAnimations();
      afterInitialLoad(false);
    }
  }

  function afterInitialLoad(wasRestored) {
    refreshSlicingInputs();
    updateHistoryButtons();
    HA.store.emit('init');
    if (wasRestored) HA.toast('Projet précédent restauré', 'info');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window.HA = window.HA || {});
