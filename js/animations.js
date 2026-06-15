/* =====================================================================
   animations.js — right panel: animation cards, frames, drag & drop,
   manual entry, per-animation controls, lock/freeze.
   ===================================================================== */
(function (HA) {
  'use strict';

  var host;
  var lastActiveId = null;

  var RERENDER = {
    'anim-add': 1, 'anim-remove': 1, 'anim-rename': 1, 'anim-move': 1,
    'anim-select': 1, 'anim-fps': 1, 'anim-loop': 1, 'anim-lock': 1,
    'frame-change': 1, 'slicing': 1, 'image': 1,
    'project-loaded': 1, 'history': 1, 'init': 1
  };

  function pad(n) {
    var p = HA.store.state.project.export.padIds || 2;
    return String(n).padStart(p, '0');
  }

  // Display id of a frame = row * columns + col, using ITS sheet's grid.
  function frameId(f) {
    var sh = (f.sheetId && HA.store.sheetById(f.sheetId)) || HA.store.activeSheet();
    var c = Math.max(1, (sh ? sh.slicing.columns : 8) | 0);
    return f.row * c + f.col;
  }

  function getAnimById(id) {
    return HA.store.state.project.animations.find(function (a) { return a.id === id; });
  }
  function isLocked(id) {
    var a = getAnimById(id);
    return !!(a && a.locked);
  }
  // True (and toasts) when the animation is locked, so callers can bail out.
  function guardLocked(id) {
    if (isLocked(id)) {
      HA.toast('Animation figée — déverrouillez (🔒) pour la modifier', 'info');
      return true;
    }
    return false;
  }

  function render() {
    if (!host) return;
    var p = HA.store.state.project;
    var activeId = HA.store.state.runtime.selectedAnimationId;

    if (!p.animations.length) {
      host.innerHTML = '<div class="empty-anims">Aucune animation.<br/>Créez-en une ci-dessus ou ajoutez la liste par défaut.</div>';
      lastActiveId = null;
      return;
    }

    var frag = document.createDocumentFragment();
    p.animations.forEach(function (anim) {
      frag.appendChild(buildCard(anim, anim.id === activeId));
    });
    host.innerHTML = '';
    host.appendChild(frag);

    // Bring the freshly-expanded animation into view when the selection changes.
    if (activeId && activeId !== lastActiveId) {
      var el = host.querySelector('.anim-card.active');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    lastActiveId = activeId;
  }

  // Accordion: only the active animation shows its full editor; the rest
  // collapse to a compact header + frame-preview strip.
  function buildCard(anim, active) {
    var card = document.createElement('div');
    card.className = 'anim-card' + (active ? ' active' : ' collapsed') + (anim.locked ? ' locked' : '');
    card.dataset.animId = anim.id;
    card.appendChild(buildHead(anim, active));
    card.appendChild(active ? buildBody(anim) : buildStrip(anim));
    return card;
  }

  function buildHead(anim, active) {
    var head = document.createElement('div');
    head.className = 'anim-head';
    // The name is editable only on the active, *unlocked* card.
    var nameField = (active && !anim.locked)
      ? '<input class="anim-name-input" data-act="rename" value="' + escapeAttr(anim.name) + '" spellcheck="false" />'
      : '<span class="anim-name" title="' + escapeAttr(anim.name) + '">' + escapeHtml(anim.name) + '</span>';
    head.innerHTML =
      '<button class="mini" data-act="up" title="Monter">▲</button>' +
      '<button class="mini" data-act="down" title="Descendre">▼</button>' +
      nameField +
      '<span class="anim-count">' + anim.frames.length + 'f</span>' +
      '<button class="mini lock' + (anim.locked ? ' on' : '') + '" data-act="lock" title="' +
        (anim.locked ? 'Déverrouiller (rendre modifiable)' : 'Figer / verrouiller cette animation') + '">' +
        (anim.locked ? '🔒' : '🔓') + '</button>' +
      '<button class="mini del" data-act="del" title="Supprimer l\'animation">🗑</button>';
    return head;
  }

  // Compact preview shown for non-active animations.
  function buildStrip(anim) {
    var strip = document.createElement('div');
    strip.className = 'anim-strip';
    if (!anim.frames.length) {
      strip.classList.add('empty');
      strip.textContent = anim.locked ? 'vide (figée)' : 'vide — cliquez pour éditer, ou glissez des sprites ici';
      return strip;
    }
    anim.frames.slice(0, 16).forEach(function (f) {
      var t = document.createElement('span');
      t.className = 'strip-thumb';
      var url = HA.sheet.getThumbForFrame(f);
      if (url) t.style.backgroundImage = 'url("' + url + '")';
      else { t.classList.add('no-image'); t.textContent = pad(frameId(f)); }
      strip.appendChild(t);
    });
    if (anim.frames.length > 16) {
      var more = document.createElement('span');
      more.className = 'strip-more';
      more.textContent = '+' + (anim.frames.length - 16);
      strip.appendChild(more);
    }
    return strip;
  }

  // Full editor shown for the active animation.
  function buildBody(anim) {
    var body = document.createElement('div');
    body.className = 'anim-body';

    if (anim.locked) {
      var note = document.createElement('div');
      note.className = 'locked-note';
      note.textContent = '🔒 Animation figée — déverrouillez pour la modifier. Elle est conservée si vous changez de planche.';
      body.appendChild(note);
    }

    var zone = document.createElement('div');
    zone.className = 'frames-zone' + (anim.frames.length ? '' : ' empty') + (anim.locked ? ' locked' : '');
    zone.dataset.animId = anim.id;
    if (!anim.frames.length) {
      zone.textContent = anim.locked ? 'Aucune frame' : 'Glissez des sprites ici';
    } else {
      anim.frames.forEach(function (f, idx) {
        zone.appendChild(buildChip(anim.id, f, idx, anim.locked));
      });
    }
    body.appendChild(zone);

    /* ----- per-animation controls (fps/loop always; clear only if unlocked) ----- */
    var controls = document.createElement('div');
    controls.className = 'anim-controls';
    controls.innerHTML =
      '<label class="field row"><span>FPS</span>' +
        '<input type="number" min="1" max="60" value="' + anim.fps + '" data-act="fps" class="num-sm" /></label>' +
      '<label class="field row"><input type="checkbox" data-act="loop" ' + (anim.loop ? 'checked' : '') + ' /><span>Boucle</span></label>' +
      (anim.locked ? '' : '<button class="btn tiny" data-act="clear">Vider</button>');
    body.appendChild(controls);

    /* ----- manual entry (hidden when locked) ----- */
    if (!anim.locked) {
      var manual = document.createElement('div');
      manual.className = 'manual-row';
      manual.innerHTML =
        '<input type="text" data-act="manual" placeholder="0, 1, 2  ou  [0,0], [1,3]" />' +
        '<button class="btn tiny accent" data-act="manual-add" title="Ajouter à la suite">Ajouter</button>' +
        '<button class="btn tiny" data-act="manual-replace" title="Remplacer les frames">Remplacer</button>';
      body.appendChild(manual);
    }

    return body;
  }

  function buildChip(animId, frame, idx, locked) {
    var chip = document.createElement('div');
    chip.className = 'frame-chip' + (locked ? ' locked' : '');
    chip.draggable = !locked;
    chip.dataset.animId = animId;
    chip.dataset.index = idx;

    var thumb = document.createElement('div');
    thumb.className = 'fthumb';
    var url = HA.sheet.getThumbForFrame(frame);
    if (url) thumb.style.backgroundImage = 'url("' + url + '")';
    else { thumb.classList.add('no-image'); thumb.textContent = pad(frameId(frame)); }

    chip.innerHTML =
      '<span class="findex">' + (idx + 1) + '</span>' +
      (locked ? '' : '<button class="fdel" data-act="frame-del" title="Retirer">✕</button>');
    chip.insertBefore(thumb, chip.firstChild.nextSibling);

    var coord = document.createElement('span');
    coord.className = 'fcoord';
    coord.textContent = '[' + frame.row + ',' + frame.col + ']';
    chip.appendChild(coord);

    // Badge for frames coming from a NON-active sheet (multi-sheet projects),
    // so mixed-source animations are readable at a glance.
    var p = HA.store.state.project;
    if (p.sheets.length > 1 && frame.sheetId !== p.activeSheetId) {
      var sh = HA.store.sheetById(frame.sheetId);
      var idxNum = p.sheets.findIndex(function (s) { return s.id === frame.sheetId; });
      var badge = document.createElement('span');
      badge.className = 'fsheet';
      badge.textContent = idxNum >= 0 ? String(idxNum + 1) : '?';
      badge.style.background = 'hsl(' + HA.sheetHue(frame.sheetId) + ',65%,42%)';
      badge.title = 'Planche : ' + (sh ? (sh.name || 'sans nom') : 'inconnue');
      chip.appendChild(badge);
      chip.classList.add('foreign');
    }
    return chip;
  }

  /* ============================ events ============================ */

  function onClick(ev) {
    var card = ev.target.closest('.anim-card');
    if (!card) return;
    var animId = card.dataset.animId;
    var actEl = ev.target.closest('[data-act]');
    var act = actEl ? actEl.dataset.act : null;

    if (act === 'lock') { HA.actions.setAnimLocked(animId, !isLocked(animId)); return; }

    if (act === 'frame-del') {
      if (guardLocked(animId)) return;
      var chip = ev.target.closest('.frame-chip');
      HA.actions.removeFrame(animId, +chip.dataset.index);
      return;
    }
    switch (act) {
      case 'up':   HA.actions.moveAnimation(animId, -1); return;
      case 'down': HA.actions.moveAnimation(animId, 1); return;
      case 'del':
        if (guardLocked(animId)) return;
        if (confirmDelete(animId)) HA.actions.removeAnimation(animId);
        return;
      case 'clear': if (guardLocked(animId)) return; HA.actions.clearFrames(animId); return;
      case 'manual-add': if (guardLocked(animId)) return; commitManual(card, animId, false); return;
      case 'manual-replace': if (guardLocked(animId)) return; commitManual(card, animId, true); return;
    }
    // Click anywhere else on the card selects it (without stealing input focus).
    if (!ev.target.closest('input, button, textarea')) {
      HA.actions.selectAnimation(animId);
    }
  }

  function confirmDelete(animId) {
    var a = getAnimById(animId);
    return window.confirm('Supprimer l\'animation « ' + (a ? a.name : '') + ' » ? (les sprites source restent intacts)');
  }

  function onChange(ev) {
    var card = ev.target.closest('.anim-card');
    if (!card) return;
    var animId = card.dataset.animId;
    var act = ev.target.dataset.act;
    if (act === 'rename') HA.actions.renameAnimation(animId, ev.target.value);
    else if (act === 'fps') HA.actions.setAnimFps(animId, ev.target.value);
    else if (act === 'loop') HA.actions.setAnimLoop(animId, ev.target.checked);
  }

  function onKeydown(ev) {
    if (ev.key !== 'Enter') return;
    var act = ev.target.dataset.act;
    if (act === 'manual') {
      var card = ev.target.closest('.anim-card');
      if (guardLocked(card.dataset.animId)) return;
      commitManual(card, card.dataset.animId, ev.shiftKey);
      ev.preventDefault();
    } else if (act === 'rename') {
      ev.target.blur();
    }
  }

  function commitManual(card, animId, replace) {
    var input = card.querySelector('[data-act="manual"]');
    if (!input) return;
    var res = HA.parse.parseFrames(input.value);
    if (res.errors.length) HA.toast(res.errors.join(' · '), 'error');
    if (!res.frames.length) return;
    HA.actions.addFrames(animId, res.frames, replace);
    input.value = '';
    HA.actions.selectAnimation(animId);
  }

  /* ---------------------------- drag & drop ---------------------------- */

  function chipInsertIndex(zone, ev) {
    var chips = Array.prototype.slice.call(zone.querySelectorAll('.frame-chip'));
    for (var i = 0; i < chips.length; i++) {
      var r = chips[i].getBoundingClientRect();
      if (ev.clientX < r.left + r.width / 2) return i;
    }
    return chips.length;
  }

  function clearDropHints() {
    host.querySelectorAll('.dragover').forEach(function (e) { e.classList.remove('dragover'); });
    host.querySelectorAll('.drop-before').forEach(function (e) { e.classList.remove('drop-before'); });
  }

  function onDragStart(ev) {
    var chip = ev.target.closest('.frame-chip');
    if (!chip || chip.classList.contains('locked')) return;
    HA.dnd.set({ kind: 'frame', animId: chip.dataset.animId, index: +chip.dataset.index }, ev);
  }

  function onDragOver(ev) {
    var zone = ev.target.closest('.frames-zone');
    var card = ev.target.closest('.anim-card');
    if (!card) return;
    if (isLocked(card.dataset.animId)) return;   // no drops onto a frozen animation
    var payload = HA.dnd.get();
    if (!payload) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = (payload.kind === 'frame') ? 'move' : 'copy';

    clearDropHints();
    card.classList.add('dragover');
    if (zone) {
      var idx = chipInsertIndex(zone, ev);
      var chips = zone.querySelectorAll('.frame-chip');
      if (chips[idx]) chips[idx].classList.add('drop-before');
    }
  }

  function onDragLeave(ev) {
    var card = ev.target.closest('.anim-card');
    if (card && !card.contains(ev.relatedTarget)) {
      card.classList.remove('dragover');
      card.querySelectorAll('.drop-before').forEach(function (e) { e.classList.remove('drop-before'); });
    }
  }

  function onDrop(ev) {
    var card = ev.target.closest('.anim-card');
    if (!card) return;
    var animId = card.dataset.animId;
    if (isLocked(animId)) { ev.preventDefault(); HA.dnd.clear(); clearDropHints(); return; }
    var payload = HA.dnd.get();
    if (!payload) return;
    ev.preventDefault();
    var zone = card.querySelector('.frames-zone');
    var index = zone ? chipInsertIndex(zone, ev) : undefined;

    if (payload.kind === 'sprite') {
      var cols = Math.max(1, (HA.store.activeSlicing() || HA.defaultSlicing()).columns | 0);
      var sid = HA.store.state.project.activeSheetId;
      var frames = payload.spriteIds.map(function (id) {
        return { sheetId: sid, row: Math.floor(id / cols), col: id % cols };
      });
      HA.actions.insertFrames(animId, frames, index);
      HA.actions.selectAnimation(animId);
    } else if (payload.kind === 'frame') {
      if (payload.animId === animId) {
        HA.actions.moveFrame(animId, payload.index, index);
      } else {
        // move a frame from another animation: copy here (keeping its sheet), remove there
        var src = HA.store.state.project.animations.find(function (a) { return a.id === payload.animId; });
        var f = src && src.frames[payload.index];
        if (f && !src.locked) {
          HA.actions.insertFrames(animId, [{ sheetId: f.sheetId, row: f.row, col: f.col }], index);
          HA.actions.removeFrame(payload.animId, payload.index);
        }
      }
    }
    HA.dnd.clear();
    clearDropHints();
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function init() {
    host = document.getElementById('animations-list');
    host.addEventListener('click', onClick);
    host.addEventListener('change', onChange);
    host.addEventListener('keydown', onKeydown);
    host.addEventListener('dragstart', onDragStart);
    host.addEventListener('dragover', onDragOver);
    host.addEventListener('dragleave', onDragLeave);
    host.addEventListener('drop', onDrop);
    host.addEventListener('dragend', function () { HA.dnd.clear(); clearDropHints(); });

    HA.store.subscribe(function (state, reason) {
      if (RERENDER[reason]) render();
    });
    render();
  }

  HA.animations = { init: init, render: render };

})(window.HA = window.HA || {});
