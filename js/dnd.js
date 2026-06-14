/* =====================================================================
   dnd.js — shared drag payload.
   The HTML5 dataTransfer is unreliable across browsers on file://, so we
   keep the authoritative payload in a module variable and use dataTransfer
   only to enable the drag visuals.
   ===================================================================== */
(function (HA) {
  'use strict';

  var payload = null;

  HA.dnd = {
    // kinds: { kind:'sprite', spriteId } | { kind:'frame', animId, index }
    set: function (p, ev) {
      payload = p;
      if (ev && ev.dataTransfer) {
        try {
          ev.dataTransfer.effectAllowed = 'copyMove';
          ev.dataTransfer.setData('text/plain', JSON.stringify(p));
        } catch (e) { /* ignore */ }
      }
    },
    get: function () { return payload; },
    clear: function () { payload = null; }
  };

})(window.HA = window.HA || {});
