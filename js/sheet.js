/* =====================================================================
   sheet.js — spritesheet image handling + per-cell thumbnail cache.
   Images are kept per sheet (runtime.sheetImages[sheetId]) so a frame can be
   resolved against whichever sheet it came from, not only the active one.
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

    _key: function (sheetId, cell) {
      return sheetId + '|' + cell.x + '|' + cell.y + '|' + cell.width + '|' + cell.height;
    },

    imageFor: function (sheetId) {
      return HA.store.state.runtime.sheetImages[sheetId] || null;
    },

    // Crisp dataURL for a cell of a given sheet, or null when no image.
    getThumbFromImage: function (img, sheetId, cell) {
      if (!img) return null;
      if (cell.width <= 0 || cell.height <= 0) return null;
      var key = this._key(sheetId, cell);
      if (this._cache.has(key)) return this._cache.get(key);

      var canvas = document.createElement('canvas');
      canvas.width = cell.width;
      canvas.height = cell.height;
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      try {
        ctx.drawImage(img, cell.x, cell.y, cell.width, cell.height, 0, 0, cell.width, cell.height);
      } catch (e) { return null; }
      var url;
      try { url = canvas.toDataURL(); } catch (e) { return null; }
      this._cache.set(key, url);
      return url;
    },

    // Thumbnail for a cell of the ACTIVE sheet (used by the central grid).
    getThumb: function (cell) {
      var a = HA.store.activeSheet();
      if (!a) return null;
      return this.getThumbFromImage(this.imageFor(a.id), a.id, cell);
    },

    // Thumbnail for an animation frame, resolved through ITS sheet's slicing.
    getThumbForFrame: function (frame) {
      var sh = (frame.sheetId && HA.store.sheetById(frame.sheetId)) || HA.store.activeSheet();
      if (!sh) return null;
      var cell = HA.slicer.cellAt(frame.row, frame.col, sh.slicing);
      return this.getThumbFromImage(this.imageFor(sh.id), sh.id, cell);
    },

    // Draw a frame onto a 2D context (preview / atlas), resolving its sheet.
    drawFrame: function (ctx, frame, dx, dy, dw, dh) {
      var sh = (frame.sheetId && HA.store.sheetById(frame.sheetId)) || HA.store.activeSheet();
      if (!sh) return false;
      var img = this.imageFor(sh.id);
      if (!img) return false;
      var cell = HA.slicer.cellAt(frame.row, frame.col, sh.slicing);
      ctx.imageSmoothingEnabled = false;
      try {
        ctx.drawImage(img, cell.x, cell.y, cell.width, cell.height, dx, dy, dw, dh);
      } catch (e) { return false; }
      return true;
    },

    // Sprite size (px) of a frame on its own sheet — used by the preview to size it.
    frameSize: function (frame) {
      var sh = (frame.sheetId && HA.store.sheetById(frame.sheetId)) || HA.store.activeSheet();
      return sh ? { w: sh.slicing.spriteWidth, h: sh.slicing.spriteHeight } : { w: 1, h: 1 };
    }
  };

  HA.sheet = sheet;

})(window.HA = window.HA || {});
