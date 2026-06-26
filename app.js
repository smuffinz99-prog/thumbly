/* Thumbly — thumbnail editor */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────────
  var W = 1280, H = 720;
  window.THUMBLY_PRO_URL = 'https://buy.stripe.com/test_8x2bJ012JaXAgzx6mZb3q01';
  var PRO_KEY    = 'thumbly.pro.v1';
  var EXPORT_KEY = 'thumbly.exports.v1';
  var FREE_DAILY = 3;

  // ── State ─────────────────────────────────────────────────────────────────────
  var state = {
    templateId:          'dark-bold',
    titleLine1:          'YOUR BIG',
    titleLine2:          'TITLE HERE',
    subtitle:            '',
    channelName:         '',
    badgeText:           '',
    textPosition:        'bottom',
    titleColorOverride:  '',
    accentColorOverride: '',
    bgImage:             null,
  };

  var mainCanvas, mainCtx;

  // ── Pro / export gating ───────────────────────────────────────────────────────
  function isPro() { return localStorage.getItem(PRO_KEY) === '1'; }
  function activatePro() { localStorage.setItem(PRO_KEY, '1'); }

  function exportRecord() {
    try { return JSON.parse(localStorage.getItem(EXPORT_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function canExport() {
    if (isPro()) return true;
    var rec = exportRecord(), today = new Date().toDateString();
    return (rec[today] || 0) < FREE_DAILY;
  }
  function recordExport() {
    if (isPro()) return;
    var rec = exportRecord(), today = new Date().toDateString();
    rec[today] = (rec[today] || 0) + 1;
    localStorage.setItem(EXPORT_KEY, JSON.stringify(rec));
  }
  function exportsLeft() {
    var rec = exportRecord(), today = new Date().toDateString();
    return Math.max(0, FREE_DAILY - (rec[today] || 0));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function parseHex(hex) {
    var v = hex.replace('#', '');
    return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
  }

  // ── Background ────────────────────────────────────────────────────────────────
  function drawBackground(c, tpl) {
    var cW = c.canvas.width, cH = c.canvas.height;
    if (state.bgImage) {
      var img = state.bgImage;
      var scale = Math.max(cW / img.width, cH / img.height);
      var dw = img.width * scale, dh = img.height * scale;
      c.drawImage(img, (cW - dw) / 2, (cH - dh) / 2, dw, dh);
      var rgb = parseHex(tpl.bg.type === 'gradient' ? tpl.bg.from : tpl.bg.color);
      c.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.52)';
      c.fillRect(0, 0, cW, cH);
    } else if (tpl.bg.type === 'solid') {
      c.fillStyle = tpl.bg.color;
      c.fillRect(0, 0, cW, cH);
    } else {
      var a = (tpl.bg.angle || 135) * Math.PI / 180;
      var x0 = cW/2 - Math.cos(a)*cW/2, y0 = cH/2 - Math.sin(a)*cH/2;
      var x1 = cW/2 + Math.cos(a)*cW/2, y1 = cH/2 + Math.sin(a)*cH/2;
      var g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, tpl.bg.from); g.addColorStop(1, tpl.bg.to);
      c.fillStyle = g; c.fillRect(0, 0, cW, cH);
    }
    // Scrim for photo backgrounds — bottom dark gradient
    if (state.bgImage) {
      var scrim = c.createLinearGradient(0, cH * 0.35, 0, cH);
      scrim.addColorStop(0, 'rgba(0,0,0,0)'); scrim.addColorStop(1, 'rgba(0,0,0,0.78)');
      c.fillStyle = scrim; c.fillRect(0, cH * 0.35, cW, cH * 0.65);
    }
  }

  // ── Pattern overlays ──────────────────────────────────────────────────────────
  function drawPatternOverlay(c, tpl) {
    c.save();
    var col = tpl.titleColor || '#ffffff';
    if (tpl.overlay === 'speed-lines')  overlaySpeedLines(c, col);
    if (tpl.overlay === 'hex-grid')     overlayHexGrid(c, col);
    if (tpl.overlay === 'circuit')      overlayCircuit(c, col);
    if (tpl.overlay === 'diagonal')     overlayDiagonal(c, col);
    if (tpl.overlay === 'film-grain')   overlayFilmGrain(c, col);
    if (tpl.overlay === 'gold-pattern') overlayGoldPattern(c, col);
    if (tpl.overlay === 'wave-flow')    overlayWaveFlow(c, col);
    if (tpl.overlay === 'radiant')      overlayRadiant(c, col);
    if (tpl.overlay === 'geo-mesh')     overlayGeoMesh(c, col);
    if (tpl.overlay === 'sparks')       overlaySparks(c, col);
    if (tpl.overlay === 'dot-grid')     overlayDotGrid(c, col);
    c.restore();
  }

  function overlaySpeedLines(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.strokeStyle = col; c.lineWidth = cW * 0.0012;
    var ox = -cW * 0.08, oy = cH * 1.08, num = 40;
    c.globalAlpha = 0.16;
    for (var i = 0; i < num; i++) {
      var angle = -Math.PI * 0.62 + (i / num) * Math.PI * 0.60;
      var len = Math.max(cW, cH) * 1.9;
      c.beginPath(); c.moveTo(ox, oy);
      c.lineTo(ox + Math.cos(angle) * len, oy + Math.sin(angle) * len); c.stroke();
    }
    c.globalAlpha = 0.30; c.lineWidth = cW * 0.004;
    for (var j = 0; j < 5; j++) {
      var a2 = -Math.PI * 0.56 + (j / 4) * Math.PI * 0.48;
      c.beginPath(); c.moveTo(ox, oy);
      c.lineTo(ox + Math.cos(a2) * cW * 1.8, oy + Math.sin(a2) * cH * 1.8); c.stroke();
    }
    var m = cW * 0.024;
    c.globalAlpha = 0.48; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW - m*2, cH - m*2);
    c.globalAlpha = 0.20; c.lineWidth = cW * 0.0015; c.strokeRect(m+cW*0.015, m+cW*0.015, cW-m*2-cW*0.030, cH-m*2-cW*0.030);
  }

  function overlayHexGrid(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.strokeStyle = col; c.lineWidth = cW * 0.001; c.globalAlpha = 0.20;
    var r = cW * 0.054, h = r * Math.sqrt(3) / 2;
    var nC = Math.ceil(cW / (r * 1.5)) + 2, nR = Math.ceil(cH / (h * 2)) + 2;
    for (var row = -1; row < nR; row++) {
      for (var col2 = -1; col2 < nC; col2++) {
        var cx = col2 * r * 1.5 + (row % 2 ? r * 0.75 : 0), cy = row * h * 2;
        c.beginPath();
        for (var s = 0; s < 6; s++) {
          var a = s * Math.PI / 3 - Math.PI / 6;
          var px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
          s === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.closePath(); c.stroke();
      }
    }
    c.fillStyle = col; c.globalAlpha = 0.10;
    for (var r2 = -1; r2 < nR; r2++) {
      for (var c3 = -1; c3 < nC; c3++) {
        if ((r2 * 3 + c3) % 7 === 0) {
          var cx2 = c3 * r * 1.5 + (r2 % 2 ? r * 0.75 : 0), cy2 = r2 * h * 2;
          c.beginPath();
          for (var s2 = 0; s2 < 6; s2++) {
            var a2 = s2 * Math.PI / 3 - Math.PI / 6;
            s2 === 0 ? c.moveTo(cx2 + r*Math.cos(a2), cy2 + r*Math.sin(a2))
                     : c.lineTo(cx2 + r*Math.cos(a2), cy2 + r*Math.sin(a2));
          }
          c.closePath(); c.fill();
        }
      }
    }
    var m = cW * 0.024;
    c.globalAlpha = 0.46; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.22; c.lineWidth = cW * 0.0015; c.strokeRect(m+cW*0.015, m+cW*0.015, cW-m*2-cW*0.030, cH-m*2-cW*0.030);
  }

  function overlayCircuit(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.strokeStyle = col; c.globalAlpha = 0.22; c.lineWidth = cW * 0.0012;
    var sp = cH * 0.075, nr = cW * 0.005;
    for (var y = sp; y < cH - sp; y += sp) {
      c.beginPath(); c.moveTo(cW * 0.024, y); c.lineTo(cW * 0.976, y); c.stroke();
      for (var x = cW * 0.08; x < cW - cW * 0.08; x += sp * 2.8) {
        if (((x + y) % (sp * 2)) < sp) {
          c.globalAlpha = 0.32;
          c.beginPath(); c.arc(x + (y % (sp*0.7)) - sp*0.35, y, nr, 0, Math.PI * 2); c.stroke();
          c.globalAlpha = 0.18;
          c.beginPath(); c.moveTo(x + (y % (sp*0.7)) - sp*0.35, y); c.lineTo(x + (y % (sp*0.7)) - sp*0.35, y + sp); c.stroke();
          c.globalAlpha = 0.22;
        }
      }
    }
    for (var x2 = sp * 3; x2 < cW - sp; x2 += sp * 4.2) {
      c.beginPath(); c.moveTo(x2, cH*0.024); c.lineTo(x2, cH*0.976); c.stroke();
    }
    var m = cW * 0.024, cs = cW * 0.018;
    c.globalAlpha = 0.46; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.22; c.lineWidth = cW * 0.0015; c.strokeRect(m+cs, m+cs, cW-m*2-cs*2, cH-m*2-cs*2);
    c.globalAlpha = 0.62; c.fillStyle = col;
    var csz = cs * 1.2;
    [[m, m], [cW-m-csz, m], [m, cH-m-csz], [cW-m-csz, cH-m-csz]].forEach(function (p) {
      c.fillRect(p[0], p[1], csz, csz);
    });
  }

  function overlayDiagonal(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.strokeStyle = col; c.lineWidth = cW * 0.022; c.globalAlpha = 0.12;
    var spacing = cW * 0.094, ext = Math.max(cW, cH) * 1.5;
    c.save(); c.translate(cW/2, cH/2); c.rotate(Math.PI/4);
    var n = Math.ceil(ext / spacing) + 1;
    for (var i = -n; i <= n; i++) {
      c.beginPath(); c.moveTo(i*spacing, -ext); c.lineTo(i*spacing, ext); c.stroke();
    }
    c.restore();
    var m = cW * 0.024;
    c.globalAlpha = 0.46; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.20; c.lineWidth = cW * 0.0015; c.strokeRect(m+cW*0.015, m+cW*0.015, cW-m*2-cW*0.030, cH-m*2-cW*0.030);
  }

  function overlayFilmGrain(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.fillStyle = col; c.globalAlpha = 0.09;
    var seed = 42;
    function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 2400; i++) {
      c.beginPath(); c.arc(rand()*cW, rand()*cH, rand()*cW*0.0018+0.4, 0, Math.PI*2); c.fill();
    }
    c.globalAlpha = 0.04;
    for (var sy = 0; sy < cH; sy += cH * 0.006) { c.fillRect(0, sy, cW, 1); }
    c.strokeStyle = col;
    var m = cW * 0.024;
    c.globalAlpha = 0.38; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.20; c.lineWidth = cW * 0.0015;
    c.strokeRect(m+cW*0.010, m+cW*0.010, cW-m*2-cW*0.020, cH-m*2-cW*0.020);
    c.strokeRect(m+cW*0.020, m+cW*0.020, cW-m*2-cW*0.040, cH-m*2-cW*0.040);
  }

  function overlayGoldPattern(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.strokeStyle = col; c.lineWidth = cW * 0.0012; c.globalAlpha = 0.22;
    var gw = cW * 0.078, gh = cH * 0.083;
    var nC = Math.ceil(cW/gw)+2, nR = Math.ceil(cH/gh)+2;
    for (var row = -1; row < nR; row++) {
      for (var col2 = -1; col2 < nC; col2++) {
        var cx = col2*gw + (row%2 ? gw/2 : 0), cy = row*gh;
        c.beginPath();
        c.moveTo(cx, cy - gh/2); c.lineTo(cx + gw/2, cy);
        c.lineTo(cx, cy + gh/2); c.lineTo(cx - gw/2, cy);
        c.closePath(); c.stroke();
      }
    }
    c.fillStyle = col; c.globalAlpha = 0.10;
    for (var r2 = -1; r2 < nR; r2++) {
      for (var c3 = -1; c3 < nC; c3++) {
        if ((r2*3 + c3) % 5 === 0) {
          var cx2 = c3*gw + (r2%2 ? gw/2 : 0), cy2 = r2*gh;
          c.beginPath();
          c.moveTo(cx2, cy2-gh/2); c.lineTo(cx2+gw/2, cy2);
          c.lineTo(cx2, cy2+gh/2); c.lineTo(cx2-gw/2, cy2);
          c.closePath(); c.fill();
        }
      }
    }
    var m = cW * 0.024;
    c.globalAlpha = 0.58; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.28; c.lineWidth = cW * 0.0015; c.strokeRect(m+cW*0.013, m+cW*0.013, cW-m*2-cW*0.026, cH-m*2-cW*0.026);
    c.globalAlpha = 0.16; c.lineWidth = cW * 0.001;  c.strokeRect(m+cW*0.024, m+cW*0.024, cW-m*2-cW*0.048, cH-m*2-cW*0.048);
    c.globalAlpha = 0.68; c.fillStyle = col;
    var d = cW * 0.016;
    [[m, m], [cW-m, m], [cW-m, cH-m], [m, cH-m]].forEach(function (p) {
      c.beginPath(); c.moveTo(p[0], p[1]-d); c.lineTo(p[0]+d, p[1]);
      c.lineTo(p[0], p[1]+d); c.lineTo(p[0]-d, p[1]); c.closePath(); c.fill();
    });
  }

  function overlayWaveFlow(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.strokeStyle = col; c.lineWidth = cW * 0.0016; c.globalAlpha = 0.18;
    var spacing = cH * 0.052, amp = cH * 0.028;
    for (var y = spacing; y < cH; y += spacing) {
      c.beginPath();
      for (var x = 0; x <= cW; x += 4) {
        var wy = y + Math.sin((x/cW) * Math.PI * 8 + y * 0.10) * amp;
        x === 0 ? c.moveTo(x, wy) : c.lineTo(x, wy);
      }
      c.stroke();
    }
    var m = cW * 0.024;
    c.globalAlpha = 0.46; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.22; c.lineWidth = cW * 0.0015; c.strokeRect(m+cW*0.015, m+cW*0.015, cW-m*2-cW*0.030, cH-m*2-cW*0.030);
  }

  function overlayRadiant(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.fillStyle = col; c.strokeStyle = col;
    var cx = cW/2, cy = cH/2, maxR = Math.sqrt(cW*cW + cH*cH), num = 32;
    c.globalAlpha = 0.10;
    for (var i = 0; i < num; i++) {
      if (i % 2 === 0) {
        var a1 = (i/num)*Math.PI*2, a2 = ((i+0.82)/num)*Math.PI*2;
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, maxR, a1, a2); c.closePath(); c.fill();
      }
    }
    c.globalAlpha = 0.18; c.lineWidth = cW * 0.0012;
    for (var j = 0; j < num; j++) {
      var angle = (j/num)*Math.PI*2;
      c.beginPath(); c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(angle)*cW, cy + Math.sin(angle)*cH); c.stroke();
    }
    c.globalAlpha = 0.22; c.beginPath(); c.arc(cx, cy, cW*0.062, 0, Math.PI*2); c.fill();
    var m = cW * 0.024;
    c.globalAlpha = 0.46; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.20; c.lineWidth = cW * 0.0015; c.strokeRect(m+cW*0.015, m+cW*0.015, cW-m*2-cW*0.030, cH-m*2-cW*0.030);
  }

  function overlayGeoMesh(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.strokeStyle = col; c.lineWidth = cW * 0.0012; c.globalAlpha = 0.14;
    var gW = cW * 0.094, gH = cH * 0.144;
    var nC = Math.ceil(cW/gW)+2, nR = Math.ceil(cH/gH)+2;
    for (var row = -1; row < nR; row++) {
      for (var col2 = -1; col2 < nC; col2++) {
        var ox = (row%2) ? gW/2 : 0, tx = col2*gW+ox, ty = row*gH;
        c.beginPath(); c.moveTo(tx, ty+gH); c.lineTo(tx+gW/2, ty); c.lineTo(tx+gW, ty+gH); c.closePath(); c.stroke();
      }
    }
    c.fillStyle = col; c.globalAlpha = 0.07;
    for (var r2 = -1; r2 < nR; r2++) {
      for (var c3 = -1; c3 < nC; c3++) {
        if ((r2+c3) % 4 === 0) {
          var ox2 = (r2%2) ? gW/2 : 0, tx2 = c3*gW+ox2, ty2 = r2*gH;
          c.beginPath(); c.moveTo(tx2, ty2+gH); c.lineTo(tx2+gW/2, ty2); c.lineTo(tx2+gW, ty2+gH); c.closePath(); c.fill();
        }
      }
    }
    // Blue accent bar on left edge
    c.globalAlpha = 0.90; c.fillStyle = '#2563eb';
    c.fillRect(0, 0, cW * 0.011, cH);
    var m = cW * 0.024;
    c.strokeStyle = col;
    c.globalAlpha = 0.45; c.lineWidth = cW * 0.004; c.strokeRect(m + cW*0.011, m, cW-m-cW*0.011-m, cH-m*2);
  }

  function overlaySparks(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.fillStyle = col;
    var seed = 17;
    function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    c.globalAlpha = 0.38;
    for (var i = 0; i < 20; i++) {
      var x = rand()*cW, y = rand()*cH, d = rand()*cW*0.020 + cW*0.006;
      c.beginPath();
      c.moveTo(x, y-d); c.lineTo(x+d*0.35, y-d*0.35); c.lineTo(x+d, y);
      c.lineTo(x+d*0.35, y+d*0.35); c.lineTo(x, y+d);
      c.lineTo(x-d*0.35, y+d*0.35); c.lineTo(x-d, y); c.lineTo(x-d*0.35, y-d*0.35);
      c.closePath(); c.fill();
    }
    c.globalAlpha = 0.24;
    for (var j = 0; j < 70; j++) {
      c.beginPath(); c.arc(rand()*cW, rand()*cH, rand()*cW*0.004+0.5, 0, Math.PI*2); c.fill();
    }
    c.strokeStyle = col; c.lineWidth = cW * 0.0016; c.globalAlpha = 0.18;
    for (var k = 0; k < 8; k++) {
      var angle = Math.PI*0.60 + k*Math.PI*0.08;
      c.beginPath(); c.moveTo(cW*0.90, cH*0.10);
      c.lineTo(cW*0.90 + Math.cos(angle)*cW*1.5, cH*0.10 + Math.sin(angle)*cH*1.5); c.stroke();
    }
    var m = cW * 0.024;
    c.globalAlpha = 0.46; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.22; c.lineWidth = cW * 0.0015; c.strokeRect(m+cW*0.015, m+cW*0.015, cW-m*2-cW*0.030, cH-m*2-cW*0.030);
  }

  function overlayDotGrid(c, col) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.fillStyle = col;
    var sp = cW * 0.038, dr = cW * 0.006;
    for (var row = 0; row < Math.ceil(cH/sp)+1; row++) {
      for (var col2 = 0; col2 < Math.ceil(cW/sp)+1; col2++) {
        var ox = (row%2) ? sp/2 : 0;
        c.globalAlpha = 0.22;
        c.beginPath(); c.arc(col2*sp+ox, row*sp, dr, 0, Math.PI*2); c.fill();
      }
    }
    c.strokeStyle = col;
    var m = cW * 0.024;
    c.globalAlpha = 0.46; c.lineWidth = cW * 0.005; c.strokeRect(m, m, cW-m*2, cH-m*2);
    c.globalAlpha = 0.22; c.lineWidth = cW * 0.0015; c.strokeRect(m+cW*0.015, m+cW*0.015, cW-m*2-cW*0.030, cH-m*2-cW*0.030);
    c.globalAlpha = 0.58;
    var r = cW * 0.010;
    [[m, m], [cW-m, m], [cW-m, cH-m], [m, cH-m]].forEach(function (p) {
      c.beginPath(); c.arc(p[0], p[1], r, 0, Math.PI*2); c.fill();
    });
  }

  // ── Text rendering ────────────────────────────────────────────────────────────
  function fitFont(c, text, fontStack, maxW, startPx, minPx) {
    var sz = startPx;
    while (sz > minPx) {
      c.font = 'bold ' + sz + 'px ' + fontStack;
      if (c.measureText(text).width <= maxW) break;
      sz -= 3;
    }
    return sz;
  }

  function strokedText(c, text, x, y, fill, stroke, sw) {
    c.lineWidth = sw; c.strokeStyle = stroke; c.lineJoin = 'round';
    c.strokeText(text, x, y);
    c.fillStyle = fill; c.fillText(text, x, y);
  }

  function drawTitle(c, tpl) {
    var cW = c.canvas.width, cH = c.canvas.height;
    var line1 = (state.titleLine1 || '').toUpperCase();
    var line2 = (state.titleLine2 || '').toUpperCase();
    if (!line1 && !line2) return;
    var fill   = (isPro() && state.titleColorOverride) ? state.titleColorOverride : tpl.titleColor;
    var stroke = tpl.strokeColor || '#000000';
    var maxW   = cW * 0.88, cx = cW / 2;
    var pos    = state.textPosition || 'bottom';
    var y1, y2;
    if      (pos === 'bottom') { y1 = cH * 0.555; y2 = cH * 0.745; }
    else if (pos === 'top')    { y1 = cH * 0.195; y2 = cH * 0.365; }
    else                       { y1 = cH * 0.410; y2 = cH * 0.590; }

    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    if (line1) {
      var sz1 = fitFont(c, line1, tpl.font, maxW, cH * 0.250, cH * 0.055);
      c.font = 'bold ' + sz1 + 'px ' + tpl.font;
      strokedText(c, line1, cx, y1, fill, stroke, Math.max(cW*0.010, sz1*0.080));
    }
    if (line2) {
      var sz2 = fitFont(c, line2, tpl.font, maxW, cH * 0.200, cH * 0.050);
      c.font = 'bold ' + sz2 + 'px ' + tpl.font;
      strokedText(c, line2, cx, y2, fill, stroke, Math.max(cW*0.008, sz2*0.080));
    }
  }

  function drawSubtitle(c, tpl) {
    var cW = c.canvas.width, cH = c.canvas.height;
    var sub = state.subtitle || ''; if (!sub) return;
    var pos = state.textPosition || 'bottom';
    var y = pos === 'bottom' ? cH*0.875 : pos === 'top' ? cH*0.480 : cH*0.710;
    var sz = cH * 0.054;
    c.font = sz + 'px ' + tpl.font.replace(/Impact,?\s*/i, '').trim();
    c.textAlign = 'center'; c.globalAlpha = 0.88;
    c.fillStyle = tpl.subtitleColor || '#cccccc';
    c.fillText(sub, cW/2, y);
    c.globalAlpha = 1;
  }

  function drawChannel(c, tpl) {
    var cW = c.canvas.width, cH = c.canvas.height;
    var ch = state.channelName || ''; if (!ch) return;
    var sz = cH * 0.042;
    c.font = 'bold ' + sz + 'px Arial, sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(255,255,255,0.70)';
    c.fillText(ch, cW*0.032, cH - cH*0.036);
  }

  function drawBadge(c, tpl) {
    var cW = c.canvas.width, cH = c.canvas.height;
    var bt = (state.badgeText || '').toUpperCase(); if (!bt) return;
    var accent = (isPro() && state.accentColorOverride) ? state.accentColorOverride : tpl.accentColor;
    var sz = cH * 0.074;
    c.font = 'bold ' + sz + 'px Impact, Arial Black, sans-serif';
    var tw = c.measureText(bt).width;
    var padX = cW*0.020, padY = cH*0.020, bh = sz + padY*2;
    var bw = tw + padX*2, bx = cW - bw - cW*0.026, by = cH*0.038;
    c.fillStyle = accent;
    if (c.roundRect) { c.beginPath(); c.roundRect(bx, by, bw, bh, cH*0.012); c.fill(); }
    else { c.fillRect(bx, by, bw, bh); }
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    // Choose legible text color based on accent brightness
    var rgb = parseHex(accent);
    var lum = 0.299*rgb[0] + 0.587*rgb[1] + 0.114*rgb[2];
    c.fillStyle = lum > 140 ? '#000000' : '#ffffff';
    c.fillText(bt, bx + padX, by + padY + sz * 0.88);
  }

  function drawWatermark(c) {
    var cW = c.canvas.width, cH = c.canvas.height;
    var sz = cH * 0.034;
    c.font = 'bold ' + sz + 'px Arial, sans-serif';
    c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = cW * 0.006;
    c.fillStyle = 'rgba(255,255,255,0.60)';
    c.fillText('thumbly.app', cW - cW*0.020, cH - cH*0.030);
    c.shadowBlur = 0; c.textAlign = 'left';
  }

  // ── Main paint ────────────────────────────────────────────────────────────────
  function paintOn(c, stateObj, tpl, showWatermark) {
    var savedState = state;
    state = stateObj;
    c.save();
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.globalAlpha = 1; c.textBaseline = 'alphabetic';
    drawBackground(c, tpl);
    if (tpl.overlay) drawPatternOverlay(c, tpl);
    drawBadge(c, tpl);
    drawTitle(c, tpl);
    drawSubtitle(c, tpl);
    drawChannel(c, tpl);
    if (showWatermark) drawWatermark(c);
    c.restore();
    state = savedState;
  }

  function render() {
    var tpl = window.getTemplate(state.templateId);
    paintOn(mainCtx, state, tpl, !isPro());
  }

  // ── Template picker ───────────────────────────────────────────────────────────
  function buildTemplatePicker() {
    var container = document.getElementById('template-picker');
    if (!container) return;
    container.innerHTML = '';
    var previewState = {
      templateId: '', titleLine1: 'EPIC', titleLine2: 'TITLE',
      subtitle: '', channelName: '', badgeText: '',
      textPosition: 'bottom', titleColorOverride: '', accentColorOverride: '', bgImage: null,
    };
    window.TEMPLATES.forEach(function (tpl) {
      var locked = tpl.pro && !isPro();
      var div = document.createElement('div');
      div.className = 'tpl-card' + (tpl.id === state.templateId ? ' active' : '') + (locked ? ' locked' : '');

      var mc = document.createElement('canvas');
      mc.width = 320; mc.height = 180;
      div.appendChild(mc);

      var label = document.createElement('span');
      label.textContent = tpl.name + (locked ? ' 🔒' : '');
      div.appendChild(label);

      // Draw mini preview
      try {
        var mctx = mc.getContext('2d');
        mctx.save();
        mctx.scale(320 / W, 180 / H);
        previewState.templateId = tpl.id;
        paintOn(mctx, previewState, tpl, false);
        mctx.restore();
      } catch (e) {}

      div.addEventListener('click', function () {
        if (locked) { showUpgrade(); return; }
        state.templateId = tpl.id;
        document.querySelectorAll('.tpl-card').forEach(function (c) { c.classList.remove('active'); });
        div.classList.add('active');
        render();
      });
      container.appendChild(div);
    });
  }

  // ── Upgrade modal ─────────────────────────────────────────────────────────────
  function showUpgrade() {
    var m = document.getElementById('upgrade-modal');
    if (m) m.style.display = 'flex';
  }
  function hideUpgrade() {
    var m = document.getElementById('upgrade-modal');
    if (m) m.style.display = 'none';
  }

  // ── UI controls ───────────────────────────────────────────────────────────────
  function bind(id, prop) {
    var el = document.getElementById(id); if (!el) return;
    el.value = state[prop] || '';
    el.addEventListener('input', function () { state[prop] = el.value; render(); });
  }

  function initControls() {
    bind('title-line1', 'titleLine1');
    bind('title-line2', 'titleLine2');
    bind('subtitle',    'subtitle');
    bind('channel-name','channelName');
    bind('badge-text',  'badgeText');

    var posEl = document.getElementById('text-position');
    if (posEl) {
      posEl.value = state.textPosition;
      posEl.addEventListener('change', function () { state.textPosition = posEl.value; render(); });
    }

    var tcEl = document.getElementById('title-color');
    if (tcEl) tcEl.addEventListener('input', function () { state.titleColorOverride = tcEl.value; render(); });

    var acEl = document.getElementById('accent-color');
    if (acEl) acEl.addEventListener('input', function () { state.accentColorOverride = acEl.value; render(); });

    var uploadEl = document.getElementById('bg-upload');
    if (uploadEl) {
      uploadEl.addEventListener('change', function () {
        var file = uploadEl.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var img = new Image();
          img.onload = function () { state.bgImage = img; render(); };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    var rmBg = document.getElementById('remove-bg');
    if (rmBg) rmBg.addEventListener('click', function () {
      state.bgImage = null;
      if (uploadEl) uploadEl.value = '';
      render();
    });

    document.getElementById('export-btn').addEventListener('click', handleExport);

    document.querySelectorAll('.upgrade-btn').forEach(function (b) {
      b.addEventListener('click', showUpgrade);
    });

    var modalClose = document.getElementById('modal-close');
    if (modalClose) modalClose.addEventListener('click', hideUpgrade);

    var modalEl = document.getElementById('upgrade-modal');
    if (modalEl) modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) hideUpgrade();
    });

    var checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', function () {
      window.THUMBLY_CHECKOUT && window.THUMBLY_CHECKOUT();
    });

    refreshProUI();
  }

  function refreshProUI() {
    var pro = isPro();
    document.querySelectorAll('.pro-only').forEach(function (el) { el.style.display = pro ? '' : 'none'; });
    document.querySelectorAll('.free-only').forEach(function (el) { el.style.display = pro ? 'none' : ''; });
    var upgradeBar = document.getElementById('upgrade-bar');
    if (upgradeBar) upgradeBar.style.display = pro ? 'none' : '';
    var proBadge = document.getElementById('pro-badge');
    if (proBadge) proBadge.style.display = pro ? '' : 'none';
    var exportInfo = document.getElementById('export-info');
    if (exportInfo) exportInfo.textContent = pro ? 'Unlimited exports' : exportsLeft() + ' free exports left today';
  }

  function handleExport() {
    if (!canExport()) { showUpgrade(); return; }
    // Re-render at full resolution with correct watermark
    paintOn(mainCtx, state, window.getTemplate(state.templateId), !isPro());
    requestAnimationFrame(function () {
      var link = document.createElement('a');
      link.download = 'thumb-' + state.templateId + '.png';
      link.href = mainCanvas.toDataURL('image/png');
      link.click();
      recordExport();
      refreshProUI();
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  function init() {
    mainCanvas = document.getElementById('thumb');
    mainCtx    = mainCanvas.getContext('2d');

    // Pro activation from Stripe redirect
    var params = new URLSearchParams(location.search);
    if (params.get('pro') === 'success') {
      activatePro();
      history.replaceState({}, '', location.pathname);
      setTimeout(function () {
        document.getElementById('pro-toast') && (document.getElementById('pro-toast').style.display = 'flex');
        setTimeout(function () {
          var t = document.getElementById('pro-toast');
          if (t) t.style.display = 'none';
        }, 5000);
      }, 400);
    }

    buildTemplatePicker();
    initControls();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
