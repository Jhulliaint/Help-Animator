/* =====================================================================
   animations.js — right panel: animation cards, frames, drag & drop,
   manual entry, per-animation controls.
   ===================================================================== */
(function (HA) {
  'use strict';

  var host;

  var RERENDER = {
    'anim-add': 1, 'anim-remove': 1, 'anim-rename': 1, 'anim-move': 1,
    'anim-select': 1, 'anim-fps': 1, 'anim-loop': 1,
    'frame-change': 1, 'slicing': 1, 'image': 1,
    'project-loaded': 1, 'history': 1, 'init': 1
  };

  function pad(n) {
    var p = HA.store.state.project.export.padIds || 2;
    return String(n).padStart(p, '0');
  }

  function render() {
    if (!host) return;
    var p = HA.store.state.project;
    var activeId = HA.store.state.runtime.selectedAnimationId;

    if (!p.animations.length) {
      host.innerHTML = '<div class="empty-anims">Aucune animation.<br/>Créez-en une ci-dessus ou ajoutez la liste par défaut.</div>';
      return;
    }

    var frag = document.createDocumentFragment();
    p.animations.forEach(function (anim) {
      frag.appendChild(buildCard(anim, anim.id === activeId));
    });
    host.innerHTML = '';
    host.appendChild(frag);
  }

  function buildCard(anim, active) {
    var card = document.createElement('div');
    card.className = 'anim-card' + (active ? ' active' : '');
    card.dataset.animId = anim.id;

    /* ----- header ----- */
    var head = document.createElement('div');
    head.className = 'anim-head';
    head.innerHTML =
      '<button class="mini" data-act="up" title="Monter">▲</button>' +
      '<button class="mini" data-act="down" title="Descendre">▼</button>' +
      '<input class="anim-name-input" data-act="rename" value="' + escapeAttr(anim.name) + '" spellcheck="false" />' +
      '<span class="anim-count">' + anim.frames.length + 'f</span>' +
      '<button class="mini del" data-act="del" title="Supprimer l\'animation">🗑</button>';
    card.appendChild(head);

    /* ----- body ----- */
    var body = document.createElement('div');
    body.className = 'anim-body';

    var zone = document.createElement('div');
    zone.className = 'frames-zone' + (anim.frames.length ? '' : ' empty');
    zone.dataset.animId = anim.id;
    if (!anim.frames.length) {
      zone.textContent = 'Glissez des sprites ici';
    } else {
      anim.frames.forEach(function (f, idx) {
        zone.appendChild(buildChip(anim.id, f, idx));
      });
    }
    body.appendChild(zone);

    /* ----- per-animation controls ----- */
    var controls = document.createElement('div');
    controls.className = 'anim-controls';
    controls.innerHTML =
      '<label class="field row"><span>FPS</span>' +
        '<input type="number" min="1" max="60" value="' + anim.fps + '" data-act="fps" class="num-sm" /></label>' +
      '<label class="field row"><input type="checkbox" data-act="loop" ' + (anim.loop ? 'checked' : '') + ' /><span>Boucle</span></label>' +
      '<button class="btn tiny" data-act="clear">Vider</button>';
    body.appendChild(controls);

    /* ----- manual entry ----- */
    var manual = document.createElement('div');
    manual.className = 'manual-row';
    manual.innerHTML =
      '<input type="text" data-act="manual" placeholder="0, 1, 2  ou  [0,0], [1,3]" />' +
      '<button class="btn tiny accent" data-act="manual-add" title="Ajouter à la suite">Ajouter</button>' +
      '<button class="btn tiny" data-act="manual-replace" title="Remplacer les frames">Remplacer</button>';
    body.appendChild(manual);

    card.appendChild(body);
    return card;
  }

  function buildChip(animId, frame, idx) {
    var chip = document.createElement('div');
    chip.className = 'frame-chip';
    chip.draggable = true;
    chip.dataset.animId = animId;
    chip.dataset.index = idx;

    var thumb = document.createElement('div');
    thumb.className = 'fthumb';
    var url = HA.sheet.getThumbForFrame(frame);
    if (url) thumb.style.backgroundImage = 'url("' + url + '")';
    else { thumb.classList.add('no-image'); thumb.textContent = pad(frame.spriteId); }

    chip.innerHTML =
      '<span class="findex">' + (idx + 1) + '</span>' +
      '<button class="fdel" data-act="frame-del" title="Retirer">✕</button>';
    chip.insertBefore(thumb, chip.firstChild.nextSibling);

    var coord = document.createElement('span');
    coord.className = 'fcoord';
    coord.textContent = '[' + frame.row + ',' + frame.col + ']';
    chip.appendChild(coord);
    return chip;
  }

  /* ============================ events ============================ */

  function onClick(ev) {
    var card = ev.target.closest('.anim-card');
    if (!card) return;
    var animId = card.dataset.animId;
    var actEl = ev.target.closest('[data-act]');
    var act = actEl ? actEl.dataset.act : null;

    if (act === 'frame-del') {
      var chip = ev.target.closest('.frame-chip');
      HA.actions.removeFrame(animId, +chip.dataset.index);
      return;
    }
    switch (act) {
      case 'up':   HA.actions.moveAnimation(animId, -1); return;
      case 'down': HA.actions.moveAnimation(animId, 1); return;
      case 'del':
        if (confirmDelete(card)) HA.actions.removeAnimation(animId);
        return;
      case 'clear': HA.actions.clearFrames(animId); return;
      case 'manual-add': commitManual(card, animId, false); return;
      case 'manual-replace': commitManual(card, animId, true); return;
    }
    // Click anywhere else on the card selects it (without stealing input focus).
    if (!ev.target.closest('input, button, textarea')) {
      HA.actions.selectAnimation(animId);
    }
  }

  function confirmDelete(card) {
    var name = card.querySelector('.anim-name-input').value;
    return window.confirm('Supprimer l\'animation « ' + name + ' » ? (les sprites source restent intacts)');
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
      commitManual(card, card.dataset.animId, ev.shiftKey);
      ev.preventDefault();
    } else if (act === 'rename') {
      ev.target.blur();
    }
  }

  function commitManual(card, animId, replace) {
    var input = card.querySelector('[data-act="manual"]');
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
    if (!chip) return;
    HA.dnd.set({ kind: 'frame', animId: chip.dataset.animId, index: +chip.dataset.index }, ev);
  }

  function onDragOver(ev) {
    var zone = ev.target.closest('.frames-zone');
    var card = ev.target.closest('.anim-card');
    if (!card) return;
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
    var payload = HA.dnd.get();
    if (!payload) return;
    ev.preventDefault();
    var animId = card.dataset.animId;
    var zone = card.querySelector('.frames-zone');
    var index = zone ? chipInsertIndex(zone, ev) : undefined;

    if (payload.kind === 'sprite') {
      var cols = Math.max(1, HA.store.state.project.slicing.columns | 0);
      var frames = payload.spriteIds.map(function (id) {
        return { spriteId: id, row: Math.floor(id / cols), col: id % cols };
      });
      HA.actions.insertFrames(animId, frames, index);
      HA.actions.selectAnimation(animId);
    } else if (payload.kind === 'frame') {
      if (payload.animId === animId) {
        HA.actions.moveFrame(animId, payload.index, index);
      } else {
        // move a frame from another animation: copy here, remove there
        var src = HA.store.state.project.animations.find(function (a) { return a.id === payload.animId; });
        var f = src && src.frames[payload.index];
        if (f) {
          HA.actions.insertFrames(animId, [{ spriteId: f.spriteId, row: f.row, col: f.col }], index);
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
