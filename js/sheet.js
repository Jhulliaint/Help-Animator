/* =====================================================================
   sheet.js — spritesheet image handling + per-cell thumbnail cache
   ===================================================================== */
(function (HA) {
  'use strict';

  var sheet = {
    _cache: new Map(),   // geometry-key -> dataURL

    loadImageFromDataUrl: function (dataUrl) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function (e) { reject(e); };
        img.src = dataUrl;
      });
    },

    clearCache: function () { this._cache.clear(); },

    _key: function (cell) {
      return cell.x + '|' + cell.y + '|' + cell.width + '|' + cell.height;
    },

    // Returns a crisp dataURL for the given cell, or null when no image loaded.
    getThumb: function (cell) {
      var rt = HA.store.state.runtime;
      if (!rt.image) return null;
      if (cell.width <= 0 || cell.height <= 0) return null;
      var key = this._key(cell);
      if (this._cache.has(key)) return this._cache.get(key);

      var canvas = document.createElement('canvas');
      canvas.width = cell.width;
      canvas.height = cell.height;
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      try {
        ctx.drawImage(rt.image, cell.x, cell.y, cell.width, cell.height, 0, 0, cell.width, cell.height);
      } catch (e) {
        return null;
      }
      var url;
      try { url = canvas.toDataURL(); } catch (e) { return null; }
      this._cache.set(key, url);
      return url;
    },

    // Thumbnail for an animation frame, resolved through the current slicing.
    getThumbForFrame: function (frame) {
      var cell = HA.slicer.cellAt(frame.row, frame.col, HA.store.state.project.slicing);
      return this.getThumb(cell);
    },

    // Draw a frame onto a 2D context (used by the preview player).
    drawFrame: function (ctx, frame, dx, dy, dw, dh) {
      var rt = HA.store.state.runtime;
      if (!rt.image) return false;
      var cell = HA.slicer.cellAt(frame.row, frame.col, HA.store.state.project.slicing);
      ctx.imageSmoothingEnabled = false;
      try {
        ctx.drawImage(rt.image, cell.x, cell.y, cell.width, cell.height, dx, dy, dw, dh);
      } catch (e) { return false; }
      return true;
    }
  };

  HA.sheet = sheet;

})(window.HA = window.HA || {});
