/* =====================================================================
   spriteGrid.js — central panel: numbered sprite vignettes
   ===================================================================== */
(function (HA) {
  'use strict';

  var host, selCountEl;

  var RERENDER = {
    'image': 1, 'slicing': 1, 'project-loaded': 1, 'history': 1,
    'select-sprite': 1, 'zoom': 1, 'init': 1
  };

  function pad(n) {
    var p = HA.store.state.project.export.padIds || 2;
    return String(n).padStart(p, '0');
  }

  function render() {
    if (!host) return;
    var rt = HA.store.state.runtime;
    var cells = rt.cells;

    host.style.setProperty('--cell-size', (rt.spriteZoom || 72) + 'px');
    host.innerHTML = '';

    if (!cells.length) {
      host.innerHTML = '<div class="empty-grid">Configurez le découpage (colonnes / lignes) pour générer la grille de sprites…</div>';
      updateSelCount();
      return;
    }

    var frag = document.createDocumentFragment();
    cells.forEach(function (cell) {
      var el = document.createElement('div');
      el.className = 'sprite-cell';
      el.dataset.spriteId = cell.id;
      el.draggable = true;
      if (rt.selectedSpriteIds.has(cell.id)) el.classList.add('selected');

      var thumb = document.createElement('div');
      thumb.className = 'sprite-thumb';
      var url = HA.sheet.getThumb(cell);
      if (url) {
        thumb.style.backgroundImage = 'url("' + url + '")';
      } else {
        thumb.classList.add('no-image');
        thumb.textContent = pad(cell.id);
      }

      var meta = document.createElement('div');
      meta.className = 'sprite-meta';
      meta.innerHTML = '<span class="sid">' + pad(cell.id) + '</span>' +
                       '<span class="scoord">[' + cell.row + ', ' + cell.col + ']</span>';

      el.appendChild(thumb);
      el.appendChild(meta);
      frag.appendChild(el);
    });
    host.appendChild(frag);
    updateSelCount();
  }

  function updateSelCount() {
    if (!selCountEl) return;
    var n = HA.store.state.runtime.selectedSpriteIds.size;
    selCountEl.textContent = n + ' sélectionné' + (n > 1 ? 's' : '');
  }

  /* ----------------------------- selection ----------------------------- */
  function onClick(ev) {
    var cellEl = ev.target.closest('.sprite-cell');
    if (!cellEl) return;
    var id = +cellEl.dataset.spriteId;
    var rt = HA.store.state.runtime;
    var sel = rt.selectedSpriteIds;

    if (ev.shiftKey && rt.lastClickedSpriteId != null) {
      var a = Math.min(rt.lastClickedSpriteId, id);
      var b = Math.max(rt.lastClickedSpriteId, id);
      if (!(ev.ctrlKey || ev.metaKey)) sel.clear();
      for (var i = a; i <= b; i++) sel.add(i);
    } else if (ev.ctrlKey || ev.metaKey) {
      if (sel.has(id)) sel.delete(id); else sel.add(id);
      rt.lastClickedSpriteId = id;
    } else {
      sel.clear();
      sel.add(id);
      rt.lastClickedSpriteId = id;
    }
    HA.store.emit('select-sprite');
  }

  // Double-click adds straight to the active animation.
  function onDblClick(ev) {
    var cellEl = ev.target.closest('.sprite-cell');
    if (!cellEl) return;
    var animId = HA.store.state.runtime.selectedAnimationId;
    if (!animId) { HA.toast('Sélectionnez d\'abord une animation', 'info'); return; }
    HA.actions.addSpritesToAnimation(animId, [+cellEl.dataset.spriteId]);
  }

  function onDragStart(ev) {
    var cellEl = ev.target.closest('.sprite-cell');
    if (!cellEl) return;
    var id = +cellEl.dataset.spriteId;
    var sel = HA.store.state.runtime.selectedSpriteIds;
    // If dragging a selected sprite, drag the whole selection.
    var ids = (sel.has(id) && sel.size > 1) ? Array.from(sel).sort(function (a, b) { return a - b; }) : [id];
    HA.dnd.set({ kind: 'sprite', spriteIds: ids }, ev);
  }

  function init() {
    host = document.getElementById('sprite-grid');
    selCountEl = document.getElementById('sel-count');
    host.addEventListener('click', onClick);
    host.addEventListener('dblclick', onDblClick);
    host.addEventListener('dragstart', onDragStart);
    host.addEventListener('dragend', function () { HA.dnd.clear(); });

    HA.store.subscribe(function (state, reason) {
      if (RERENDER[reason]) render();
    });
    render();
  }

  HA.spriteGrid = { init: init, render: render };

})(window.HA = window.HA || {});
