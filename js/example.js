/* =====================================================================
   example.js — generates a self-contained demo spritesheet at runtime.
   No binary asset is shipped: the sheet is drawn on a canvas and returned
   as a (taint-free, file://-safe) PNG data URL. Laid out on the same 8×5
   grid as Jeux-Math-o so the default animation keys map onto real cells
   and the preview animates immediately.
   ===================================================================== */
(function (HA) {
  'use strict';

  var COLS = 8, ROWS = 5, CELL = 64;

  function generateDataUrl() {
    var cv = document.createElement('canvas');
    cv.width = COLS * CELL;
    cv.height = ROWS * CELL;
    var ctx = cv.getContext('2d');

    ctx.fillStyle = '#0e1220';
    ctx.fillRect(0, 0, cv.width, cv.height);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var id = r * COLS + c;
        var x = c * CELL, y = r * CELL;
        var hue = (id * 23) % 360;

        // cell background (subtle per-cell tint so the grid reads clearly)
        ctx.fillStyle = 'hsl(' + hue + ',45%,' + (((r + c) % 2) ? 16 : 12) + '%)';
        ctx.fillRect(x, y, CELL, CELL);

        drawMascot(ctx, x, y, CELL, id, hue);

        // id (top-left) + [row,col] (bottom-right)
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.font = '700 12px monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('#' + id, x + 4, y + 3);
        ctx.fillStyle = 'rgba(120,230,230,.95)';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('[' + r + ',' + c + ']', x + CELL - 4, y + CELL - 3);

        ctx.strokeStyle = 'rgba(255,255,255,.10)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }
    return cv.toDataURL('image/png');
  }

  // A tiny knight-ish mascot whose pose shifts per cell, so cycling frames
  // in the preview is visibly animated.
  function drawMascot(ctx, x, y, cell, id, hue) {
    var cx = x + cell / 2;
    var cy = y + cell / 2 + 3;
    var phase = (id % 4) / 4 * Math.PI * 2;
    var bob = Math.sin(phase) * 3;

    // body
    ctx.fillStyle = 'hsl(' + hue + ',70%,58%)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // helmet
    ctx.fillStyle = 'hsl(' + hue + ',30%,86%)';
    ctx.beginPath();
    ctx.arc(cx, cy - 10 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    // facing notch (rotates with the phase so consecutive frames differ)
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + bob);
    ctx.lineTo(cx + Math.cos(phase) * 11, cy + bob + Math.sin(phase) * 11);
    ctx.stroke();
  }

  HA.example = {
    generateDataUrl: generateDataUrl,
    COLS: COLS, ROWS: ROWS, CELL: CELL
  };

})(window.HA = window.HA || {});
