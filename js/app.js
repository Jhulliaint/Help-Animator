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

  /* ----------------------------- image import ----------------------------- */
  function importImageFile(file) {
    if (!file || !/^image\//.test(file.type)) { HA.toast('Fichier image invalide', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      HA.actions.setImage(file.name, reader.result).then(function () {
        HA.toast('Image chargée : ' + file.name, 'ok');
      }).catch(function () { HA.toast('Impossible de charger l\'image', 'error'); });
    };
    reader.readAsDataURL(file);
  }

  /* ----------------------------- slicing form ----------------------------- */
  var SLICE_KEYS = ['spriteWidth', 'spriteHeight', 'columns', 'rows', 'marginX', 'marginY', 'spacingX', 'spacingY'];

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
        patch[el.dataset.key] = Math.max(el.dataset.key === 'marginX' || el.dataset.key === 'marginY' || el.dataset.key === 'spacingX' || el.dataset.key === 'spacingY' ? 0 : 1, parseInt(el.value, 10) || 0);
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
    var e = HA.store.state.project.export;
    document.querySelectorAll('input[name="exp-format"]').forEach(function (r) { r.checked = (r.value === e.format); });
    document.getElementById('exp-varname').value = e.varName;
    document.getElementById('exp-pretty').checked = e.pretty;
    document.getElementById('exp-empty').checked = e.includeEmpty;
  }
  function refreshExportText() {
    document.getElementById('export-text').value = HA.exporter.exportString(HA.store.state.project);
  }

  function bindExportModal() {
    document.getElementById('btn-export').addEventListener('click', openExport);
    document.getElementById('btn-close-export').addEventListener('click', closeExport);
    document.getElementById('export-modal').addEventListener('click', function (ev) {
      if (ev.target.id === 'export-modal') closeExport();
    });
    document.querySelectorAll('input[name="exp-format"]').forEach(function (r) {
      r.addEventListener('change', function () { HA.actions.updateExport({ format: r.value }); refreshExportText(); });
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
    document.getElementById('btn-copy-export').addEventListener('click', function () {
      copyText(document.getElementById('export-text').value).then(function (ok) {
        HA.toast(ok === false ? 'Copie impossible' : 'Copié dans le presse-papiers', ok === false ? 'error' : 'ok');
      });
    });
    document.getElementById('btn-download-export').addEventListener('click', function () {
      var e = HA.store.state.project.export;
      var ext = HA.exporter.fileExtension(e.format);
      var name = (e.varName || 'HERO_SPRITE_MAP').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
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
    document.getElementById('btn-clear-anims').addEventListener('click', function () {
      if (!HA.store.state.project.animations.length) return;
      if (window.confirm('Supprimer toutes les animations ?')) HA.actions.clearAllAnimations();
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

  /* ----------------------------- boot ----------------------------- */
  function boot() {
    bindTopbar();
    bindSlicingForm();
    bindCenterToolbar();
    bindRightHeader();
    bindFileInputs();
    bindExportModal();
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
