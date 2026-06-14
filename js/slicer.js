/* =====================================================================
   slicer.js — pure grid-slicing geometry (no DOM)
   id convention:  id = row * columns + col   ->   coords [row, col]
   ===================================================================== */
(function (HA) {
  'use strict';

  var slicer = {
    // Build every SpriteCell from the slicing parameters.
    computeCells: function (s) {
      var cells = [];
      var cols = Math.max(0, s.columns | 0);
      var rows = Math.max(0, s.rows | 0);
      var inset = Math.max(0, s.inset | 0);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          cells.push({
            id: r * cols + c,
            row: r,
            col: c,
            x: s.marginX + c * (s.spriteWidth + s.spacingX) + inset,
            y: s.marginY + r * (s.spriteHeight + s.spacingY) + inset,
            width: Math.max(1, s.spriteWidth - 2 * inset),
            height: Math.max(1, s.spriteHeight - 2 * inset)
          });
        }
      }
      return cells;
    },

    // Geometry of a single cell at (row, col) for the current slicing.
    cellAt: function (row, col, s) {
      var inset = Math.max(0, s.inset | 0);
      return {
        id: row * s.columns + col,
        row: row, col: col,
        x: s.marginX + col * (s.spriteWidth + s.spacingX) + inset,
        y: s.marginY + row * (s.spriteHeight + s.spacingY) + inset,
        width: Math.max(1, s.spriteWidth - 2 * inset),
        height: Math.max(1, s.spriteHeight - 2 * inset)
      };
    },

    // How many columns / rows fit in the image for a given sprite size?
    deriveColumnsRows: function (imgW, imgH, s) {
      var cols = Math.floor((imgW - 2 * s.marginX + s.spacingX) / (s.spriteWidth + s.spacingX));
      var rows = Math.floor((imgH - 2 * s.marginY + s.spacingY) / (s.spriteHeight + s.spacingY));
      return { columns: Math.max(1, cols), rows: Math.max(1, rows) };
    },

    // What sprite size divides the image into the requested columns / rows?
    deriveSpriteSize: function (imgW, imgH, s) {
      var w = Math.floor((imgW - 2 * s.marginX - Math.max(0, s.columns - 1) * s.spacingX) / Math.max(1, s.columns));
      var h = Math.floor((imgH - 2 * s.marginY - Math.max(0, s.rows - 1) * s.spacingY) / Math.max(1, s.rows));
      return { spriteWidth: Math.max(1, w), spriteHeight: Math.max(1, h) };
    }
  };

  HA.slicer = slicer;

})(window.HA = window.HA || {});
