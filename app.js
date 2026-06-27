/* Thumbly — thumbnail editor v2 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  window.THUMBLY_PRO_URL = 'https://buy.stripe.com/8x2bJ012JaXAgzx6mZb3q01';
  var PRO_KEY    = 'thumbly.pro.v1';
  var EXPORT_KEY = 'thumbly.exports.v1';
  var FREE_DAILY = 1;

  /* ── Fonts ────────────────────────────────────────────────────────── */
  var FONTS = [
    // Free (6)
    { id:'impact',      name:'Impact',         css:"Impact,'Arial Black',sans-serif",       pro:false },
    { id:'arial-black', name:'Arial Black',    css:"'Arial Black','Arial Bold',sans-serif", pro:false },
    { id:'georgia',     name:'Georgia',        css:"Georgia,'Times New Roman',serif",       pro:false },
    { id:'anton',       name:'Anton',          css:"'Anton',sans-serif",                    pro:false },
    { id:'bebas',       name:'Bebas Neue',     css:"'Bebas Neue',Impact,sans-serif",        pro:false },
    { id:'righteous',   name:'Righteous',      css:"'Righteous',Impact,sans-serif",         pro:false },
    // Pro (15)
    { id:'oswald',      name:'Oswald',         css:"'Oswald',Impact,sans-serif",            pro:true },
    { id:'montserrat',  name:'Montserrat',     css:"'Montserrat',sans-serif",               pro:true },
    { id:'barlow',      name:'Barlow Cond.',   css:"'Barlow Condensed',Impact,sans-serif",  pro:true },
    { id:'teko',        name:'Teko',           css:"'Teko',Impact,sans-serif",              pro:true },
    { id:'russo',       name:'Russo One',      css:"'Russo One',Impact,sans-serif",         pro:true },
    { id:'bangers',     name:'Bangers',        css:"'Bangers',Impact,sans-serif",           pro:true },
    { id:'space',       name:'Space Grotesk',  css:"'Space Grotesk',sans-serif",            pro:true },
    { id:'nunito',      name:'Nunito',         css:"'Nunito',sans-serif",                   pro:true },
    { id:'cinzel',      name:'Cinzel',         css:"'Cinzel',Georgia,serif",                pro:true },
    { id:'graduate',    name:'Graduate',       css:"'Graduate',Georgia,serif",              pro:true },
    { id:'pacifico',    name:'Pacifico',       css:"'Pacifico',cursive",                    pro:true },
    { id:'marker',      name:'Perm. Marker',   css:"'Permanent Marker',cursive",            pro:true },
    { id:'fredoka',     name:'Fredoka One',    css:"'Fredoka One',sans-serif",              pro:true },
    { id:'cabin',       name:'Cabin Cond.',    css:"'Cabin Condensed',sans-serif",          pro:true },
    { id:'press',       name:'Press Start 2P', css:"'Press Start 2P',monospace",           pro:true },
  ];

  function getFontById(id) {
    return FONTS.find(function(f) { return f.id === id; }) || FONTS[0];
  }

  /* ── State ────────────────────────────────────────────────────────── */
  var state = {
    templateId: 'dark-bold',
    bgMode: 'template',
    bgSolid: '#0f172a',
    bgFrom: '#0f172a', bgTo: '#1e293b', bgAngle: 135,
    bgImage: null, photoOverlayOpacity: 0.50,
    showOverlay: true,
    elements: [
      { id:'line1',    label:'Line 1',   text:'YOUR BIG',   x:640, y:400, size:175, fontId:'impact', color:'#ffffff', stroke:'#000000', strokeOn:true,  sw:0.08, align:'center', visible:true, bold:true  },
      { id:'line2',    label:'Line 2',   text:'TITLE HERE', x:640, y:555, size:140, fontId:'impact', color:'#ffffff', stroke:'#000000', strokeOn:true,  sw:0.08, align:'center', visible:true, bold:true  },
      { id:'subtitle', label:'Subtitle', text:'',           x:640, y:638, size:46,  fontId:'anton',  color:'#cccccc', stroke:'#000000', strokeOn:false, sw:0.05, align:'center', visible:true, bold:false },
      { id:'channel',  label:'Channel',  text:'',           x:44,  y:694, size:28,  fontId:'impact', color:'#ffffffb3', stroke:'#000000', strokeOn:false, sw:0.05, align:'left', visible:true, bold:true  },
    ],
    selectedId: 'line1',
    badgeText: '', badgeColor: '#f59e0b',
    channelName: '',
  };

  var mainCanvas, mainCtx;
  var elementBoxes = [];
  var drag = { active:false, id:null, ox:0, oy:0, elx:0, ely:0 };
  var rafPending = false;

  /* ── Pro / export gating ──────────────────────────────────────────── */
  function isPro()      { return localStorage.getItem(PRO_KEY) === '1'; }
  function activatePro(){ localStorage.setItem(PRO_KEY, '1'); }

  function exportRecord() {
    try { return JSON.parse(localStorage.getItem(EXPORT_KEY) || '{}'); } catch(e) { return {}; }
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

  /* ── Helpers ──────────────────────────────────────────────────────── */
  function parseHex(hex) {
    var v = (hex || '#000000').replace('#','');
    if (v.length === 3) v = v[0]+v[0]+v[1]+v[1]+v[2]+v[2];
    return [parseInt(v.slice(0,2),16)||0, parseInt(v.slice(2,4),16)||0, parseInt(v.slice(4,6),16)||0];
  }

  function canvasToBuffer(evt) {
    var rect = mainCanvas.getBoundingClientRect();
    var src  = (evt.touches && evt.touches[0]) ? evt.touches[0] : evt;
    return {
      x: (src.clientX - rect.left) * (W / rect.width),
      y: (src.clientY - rect.top)  * (H / rect.height)
    };
  }

  function hitTest(bx, by) {
    for (var i = elementBoxes.length - 1; i >= 0; i--) {
      var b = elementBoxes[i];
      if (bx >= b.x1 - 16 && bx <= b.x2 + 16 && by >= b.y1 - 16 && by <= b.y2 + 16) return b.id;
    }
    return null;
  }

  function getEl(id)       { return state.elements.find(function(e){ return e.id === id; }); }
  function getSelectedEl() { return getEl(state.selectedId); }

  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function(){ rafPending = false; render(false); });
  }

  /* ── Background ───────────────────────────────────────────────────── */
  function drawBackground(c, tpl, st) {
    var cW = c.canvas.width, cH = c.canvas.height;
    var mode = st.bgMode || 'template';

    if (mode === 'photo' && st.bgImage) {
      var img = st.bgImage;
      var scale = Math.max(cW / img.width, cH / img.height);
      var dw = img.width * scale, dh = img.height * scale;
      c.drawImage(img, (cW - dw) / 2, (cH - dh) / 2, dw, dh);
      c.fillStyle = 'rgba(0,0,0,' + (st.photoOverlayOpacity || 0.5) + ')';
      c.fillRect(0, 0, cW, cH);
      var scrim = c.createLinearGradient(0, cH * 0.38, 0, cH);
      scrim.addColorStop(0, 'rgba(0,0,0,0)');
      scrim.addColorStop(1, 'rgba(0,0,0,0.75)');
      c.fillStyle = scrim; c.fillRect(0, 0, cW, cH);
    } else if (mode === 'solid') {
      c.fillStyle = st.bgSolid || '#0f172a';
      c.fillRect(0, 0, cW, cH);
    } else if (mode === 'gradient') {
      var a = ((st.bgAngle || 135) * Math.PI / 180);
      var g = c.createLinearGradient(
        cW/2 - Math.cos(a)*cW/2, cH/2 - Math.sin(a)*cH/2,
        cW/2 + Math.cos(a)*cW/2, cH/2 + Math.sin(a)*cH/2
      );
      g.addColorStop(0, st.bgFrom || '#0f172a');
      g.addColorStop(1, st.bgTo   || '#1e293b');
      c.fillStyle = g; c.fillRect(0, 0, cW, cH);
    } else {
      if (tpl.bg.type === 'solid') {
        c.fillStyle = tpl.bg.color; c.fillRect(0, 0, cW, cH);
      } else {
        var angle = (tpl.bg.angle || 135) * Math.PI / 180;
        var grad  = c.createLinearGradient(
          cW/2 - Math.cos(angle)*cW/2, cH/2 - Math.sin(angle)*cH/2,
          cW/2 + Math.cos(angle)*cW/2, cH/2 + Math.sin(angle)*cH/2
        );
        grad.addColorStop(0, tpl.bg.from); grad.addColorStop(1, tpl.bg.to);
        c.fillStyle = grad; c.fillRect(0, 0, cW, cH);
      }
    }
  }

  /* ── Pattern overlays ─────────────────────────────────────────────── */
  function drawPatternOverlay(c, tpl, st) {
    if (!(st.showOverlay !== false) || !tpl.overlay) return;
    c.save();
    var col = tpl.titleColor || '#ffffff';
    switch(tpl.overlay) {
      case 'speed-lines':  overlaySpeedLines(c, col);  break;
      case 'hex-grid':     overlayHexGrid(c, col);     break;
      case 'circuit':      overlayCircuit(c, col);     break;
      case 'diagonal':     overlayDiagonal(c, col);    break;
      case 'film-grain':   overlayFilmGrain(c, col);   break;
      case 'gold-pattern': overlayGoldPattern(c, col); break;
      case 'wave-flow':    overlayWaveFlow(c, col);    break;
      case 'radiant':      overlayRadiant(c, col);     break;
      case 'geo-mesh':     overlayGeoMesh(c, col);     break;
      case 'sparks':       overlaySparks(c, col);      break;
      case 'dot-grid':     overlayDotGrid(c, col);     break;
    }
    c.restore();
  }

  function overlaySpeedLines(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.strokeStyle=col; c.lineWidth=cW*0.0012;
    var ox=-cW*0.08, oy=cH*1.08, num=40;
    c.globalAlpha=0.16;
    for(var i=0;i<num;i++){
      var angle=-Math.PI*0.62+(i/num)*Math.PI*0.60, len=Math.max(cW,cH)*1.9;
      c.beginPath();c.moveTo(ox,oy);c.lineTo(ox+Math.cos(angle)*len,oy+Math.sin(angle)*len);c.stroke();
    }
    c.globalAlpha=0.30;c.lineWidth=cW*0.004;
    for(var j=0;j<5;j++){
      var a2=-Math.PI*0.56+(j/4)*Math.PI*0.48;
      c.beginPath();c.moveTo(ox,oy);c.lineTo(ox+Math.cos(a2)*cW*1.8,oy+Math.sin(a2)*cH*1.8);c.stroke();
    }
    var m=cW*0.024;
    c.globalAlpha=0.48;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.20;c.lineWidth=cW*0.0015;c.strokeRect(m+cW*0.015,m+cW*0.015,cW-m*2-cW*0.030,cH-m*2-cW*0.030);
  }

  function overlayHexGrid(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.strokeStyle=col;c.lineWidth=cW*0.001;c.globalAlpha=0.20;
    var r=cW*0.054, h=r*Math.sqrt(3)/2;
    var nC=Math.ceil(cW/(r*1.5))+2, nR=Math.ceil(cH/(h*2))+2;
    for(var row=-1;row<nR;row++){
      for(var col2=-1;col2<nC;col2++){
        var cx=col2*r*1.5+(row%2?r*0.75:0), cy=row*h*2;
        c.beginPath();
        for(var s=0;s<6;s++){
          var a=s*Math.PI/3-Math.PI/6;
          s===0?c.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):c.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
        }
        c.closePath();c.stroke();
      }
    }
    c.fillStyle=col;c.globalAlpha=0.10;
    for(var r2=-1;r2<nR;r2++){
      for(var c3=-1;c3<nC;c3++){
        if((r2*3+c3)%7===0){
          var cx2=c3*r*1.5+(r2%2?r*0.75:0),cy2=r2*h*2;
          c.beginPath();
          for(var s2=0;s2<6;s2++){
            var a2=s2*Math.PI/3-Math.PI/6;
            s2===0?c.moveTo(cx2+r*Math.cos(a2),cy2+r*Math.sin(a2)):c.lineTo(cx2+r*Math.cos(a2),cy2+r*Math.sin(a2));
          }
          c.closePath();c.fill();
        }
      }
    }
    var m=cW*0.024;
    c.globalAlpha=0.46;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.22;c.lineWidth=cW*0.0015;c.strokeRect(m+cW*0.015,m+cW*0.015,cW-m*2-cW*0.030,cH-m*2-cW*0.030);
  }

  function overlayCircuit(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.strokeStyle=col;c.globalAlpha=0.22;c.lineWidth=cW*0.0012;
    var sp=cH*0.075, nr=cW*0.005;
    for(var y=sp;y<cH-sp;y+=sp){
      c.beginPath();c.moveTo(cW*0.024,y);c.lineTo(cW*0.976,y);c.stroke();
      for(var x=cW*0.08;x<cW-cW*0.08;x+=sp*2.8){
        if(((x+y)%(sp*2))<sp){
          c.globalAlpha=0.32;
          c.beginPath();c.arc(x+(y%(sp*0.7))-sp*0.35,y,nr,0,Math.PI*2);c.stroke();
          c.globalAlpha=0.18;
          c.beginPath();c.moveTo(x+(y%(sp*0.7))-sp*0.35,y);c.lineTo(x+(y%(sp*0.7))-sp*0.35,y+sp);c.stroke();
          c.globalAlpha=0.22;
        }
      }
    }
    for(var x2=sp*3;x2<cW-sp;x2+=sp*4.2){
      c.beginPath();c.moveTo(x2,cH*0.024);c.lineTo(x2,cH*0.976);c.stroke();
    }
    var m=cW*0.024, cs=cW*0.018;
    c.globalAlpha=0.46;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.22;c.lineWidth=cW*0.0015;c.strokeRect(m+cs,m+cs,cW-m*2-cs*2,cH-m*2-cs*2);
    c.globalAlpha=0.62;c.fillStyle=col;
    var csz=cs*1.2;
    [[m,m],[cW-m-csz,m],[m,cH-m-csz],[cW-m-csz,cH-m-csz]].forEach(function(p){c.fillRect(p[0],p[1],csz,csz);});
  }

  function overlayDiagonal(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.strokeStyle=col;c.lineWidth=cW*0.022;c.globalAlpha=0.12;
    var spacing=cW*0.094, ext=Math.max(cW,cH)*1.5;
    c.save();c.translate(cW/2,cH/2);c.rotate(Math.PI/4);
    var n=Math.ceil(ext/spacing)+1;
    for(var i=-n;i<=n;i++){c.beginPath();c.moveTo(i*spacing,-ext);c.lineTo(i*spacing,ext);c.stroke();}
    c.restore();
    var m=cW*0.024;
    c.globalAlpha=0.46;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.20;c.lineWidth=cW*0.0015;c.strokeRect(m+cW*0.015,m+cW*0.015,cW-m*2-cW*0.030,cH-m*2-cW*0.030);
  }

  function overlayFilmGrain(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.fillStyle=col;c.globalAlpha=0.09;
    var seed=42;
    function rand(){seed=(seed*9301+49297)%233280;return seed/233280;}
    for(var i=0;i<2400;i++){
      c.beginPath();c.arc(rand()*cW,rand()*cH,rand()*cW*0.0018+0.4,0,Math.PI*2);c.fill();
    }
    c.globalAlpha=0.04;
    for(var sy=0;sy<cH;sy+=cH*0.006){c.fillRect(0,sy,cW,1);}
    c.strokeStyle=col;
    var m=cW*0.024;
    c.globalAlpha=0.38;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.20;c.lineWidth=cW*0.0015;
    c.strokeRect(m+cW*0.010,m+cW*0.010,cW-m*2-cW*0.020,cH-m*2-cW*0.020);
    c.strokeRect(m+cW*0.020,m+cW*0.020,cW-m*2-cW*0.040,cH-m*2-cW*0.040);
  }

  function overlayGoldPattern(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.strokeStyle=col;c.lineWidth=cW*0.0012;c.globalAlpha=0.22;
    var gw=cW*0.078, gh=cH*0.083;
    var nC=Math.ceil(cW/gw)+2, nR=Math.ceil(cH/gh)+2;
    for(var row=-1;row<nR;row++){
      for(var col2=-1;col2<nC;col2++){
        var cx=col2*gw+(row%2?gw/2:0), cy=row*gh;
        c.beginPath();
        c.moveTo(cx,cy-gh/2);c.lineTo(cx+gw/2,cy);c.lineTo(cx,cy+gh/2);c.lineTo(cx-gw/2,cy);
        c.closePath();c.stroke();
      }
    }
    c.fillStyle=col;c.globalAlpha=0.10;
    for(var r2=-1;r2<nR;r2++){
      for(var c3=-1;c3<nC;c3++){
        if((r2*3+c3)%5===0){
          var cx2=c3*gw+(r2%2?gw/2:0), cy2=r2*gh;
          c.beginPath();
          c.moveTo(cx2,cy2-gh/2);c.lineTo(cx2+gw/2,cy2);c.lineTo(cx2,cy2+gh/2);c.lineTo(cx2-gw/2,cy2);
          c.closePath();c.fill();
        }
      }
    }
    var m=cW*0.024;
    c.globalAlpha=0.58;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.28;c.lineWidth=cW*0.0015;c.strokeRect(m+cW*0.013,m+cW*0.013,cW-m*2-cW*0.026,cH-m*2-cW*0.026);
    c.globalAlpha=0.16;c.lineWidth=cW*0.001;c.strokeRect(m+cW*0.024,m+cW*0.024,cW-m*2-cW*0.048,cH-m*2-cW*0.048);
    c.globalAlpha=0.68;c.fillStyle=col;
    var d=cW*0.016;
    [[m,m],[cW-m,m],[cW-m,cH-m],[m,cH-m]].forEach(function(p){
      c.beginPath();c.moveTo(p[0],p[1]-d);c.lineTo(p[0]+d,p[1]);c.lineTo(p[0],p[1]+d);c.lineTo(p[0]-d,p[1]);c.closePath();c.fill();
    });
  }

  function overlayWaveFlow(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.strokeStyle=col;c.lineWidth=cW*0.0016;c.globalAlpha=0.18;
    var spacing=cH*0.052, amp=cH*0.028;
    for(var y=spacing;y<cH;y+=spacing){
      c.beginPath();
      for(var x=0;x<=cW;x+=4){
        var wy=y+Math.sin((x/cW)*Math.PI*8+y*0.10)*amp;
        x===0?c.moveTo(x,wy):c.lineTo(x,wy);
      }
      c.stroke();
    }
    var m=cW*0.024;
    c.globalAlpha=0.46;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.22;c.lineWidth=cW*0.0015;c.strokeRect(m+cW*0.015,m+cW*0.015,cW-m*2-cW*0.030,cH-m*2-cW*0.030);
  }

  function overlayRadiant(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.fillStyle=col;c.strokeStyle=col;
    var cx=cW/2, cy=cH/2, maxR=Math.sqrt(cW*cW+cH*cH), num=32;
    c.globalAlpha=0.10;
    for(var i=0;i<num;i++){
      if(i%2===0){
        var a1=(i/num)*Math.PI*2, a2=((i+0.82)/num)*Math.PI*2;
        c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,maxR,a1,a2);c.closePath();c.fill();
      }
    }
    c.globalAlpha=0.18;c.lineWidth=cW*0.0012;
    for(var j=0;j<num;j++){
      var angle=(j/num)*Math.PI*2;
      c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(angle)*cW,cy+Math.sin(angle)*cH);c.stroke();
    }
    c.globalAlpha=0.22;c.beginPath();c.arc(cx,cy,cW*0.062,0,Math.PI*2);c.fill();
    var m=cW*0.024;
    c.globalAlpha=0.46;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.20;c.lineWidth=cW*0.0015;c.strokeRect(m+cW*0.015,m+cW*0.015,cW-m*2-cW*0.030,cH-m*2-cW*0.030);
  }

  function overlayGeoMesh(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.strokeStyle=col;c.lineWidth=cW*0.0012;c.globalAlpha=0.14;
    var gW=cW*0.094, gH=cH*0.144;
    var nC=Math.ceil(cW/gW)+2, nR=Math.ceil(cH/gH)+2;
    for(var row=-1;row<nR;row++){
      for(var col2=-1;col2<nC;col2++){
        var ox=(row%2)?gW/2:0, tx=col2*gW+ox, ty=row*gH;
        c.beginPath();c.moveTo(tx,ty+gH);c.lineTo(tx+gW/2,ty);c.lineTo(tx+gW,ty+gH);c.closePath();c.stroke();
      }
    }
    c.fillStyle=col;c.globalAlpha=0.07;
    for(var r2=-1;r2<nR;r2++){
      for(var c3=-1;c3<nC;c3++){
        if((r2+c3)%4===0){
          var ox2=(r2%2)?gW/2:0, tx2=c3*gW+ox2, ty2=r2*gH;
          c.beginPath();c.moveTo(tx2,ty2+gH);c.lineTo(tx2+gW/2,ty2);c.lineTo(tx2+gW,ty2+gH);c.closePath();c.fill();
        }
      }
    }
    c.globalAlpha=0.90;c.fillStyle='#2563eb';c.fillRect(0,0,cW*0.011,cH);
    var m=cW*0.024;
    c.strokeStyle=col;
    c.globalAlpha=0.45;c.lineWidth=cW*0.004;c.strokeRect(m+cW*0.011,m,cW-m-cW*0.011-m,cH-m*2);
  }

  function overlaySparks(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.fillStyle=col;
    var seed=17;
    function rand(){seed=(seed*9301+49297)%233280;return seed/233280;}
    c.globalAlpha=0.38;
    for(var i=0;i<20;i++){
      var x=rand()*cW, y=rand()*cH, d=rand()*cW*0.020+cW*0.006;
      c.beginPath();
      c.moveTo(x,y-d);c.lineTo(x+d*0.35,y-d*0.35);c.lineTo(x+d,y);
      c.lineTo(x+d*0.35,y+d*0.35);c.lineTo(x,y+d);
      c.lineTo(x-d*0.35,y+d*0.35);c.lineTo(x-d,y);c.lineTo(x-d*0.35,y-d*0.35);
      c.closePath();c.fill();
    }
    c.globalAlpha=0.24;
    for(var j=0;j<70;j++){
      c.beginPath();c.arc(rand()*cW,rand()*cH,rand()*cW*0.004+0.5,0,Math.PI*2);c.fill();
    }
    c.strokeStyle=col;c.lineWidth=cW*0.0016;c.globalAlpha=0.18;
    for(var k=0;k<8;k++){
      var angle2=Math.PI*0.60+k*Math.PI*0.08;
      c.beginPath();c.moveTo(cW*0.90,cH*0.10);
      c.lineTo(cW*0.90+Math.cos(angle2)*cW*1.5,cH*0.10+Math.sin(angle2)*cH*1.5);c.stroke();
    }
    var m=cW*0.024;
    c.globalAlpha=0.46;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.22;c.lineWidth=cW*0.0015;c.strokeRect(m+cW*0.015,m+cW*0.015,cW-m*2-cW*0.030,cH-m*2-cW*0.030);
  }

  function overlayDotGrid(c, col) {
    var cW=c.canvas.width, cH=c.canvas.height;
    c.fillStyle=col;
    var sp=cW*0.038, dr=cW*0.006;
    for(var row=0;row<Math.ceil(cH/sp)+1;row++){
      for(var col2=0;col2<Math.ceil(cW/sp)+1;col2++){
        var ox=(row%2)?sp/2:0;
        c.globalAlpha=0.22;
        c.beginPath();c.arc(col2*sp+ox,row*sp,dr,0,Math.PI*2);c.fill();
      }
    }
    c.strokeStyle=col;
    var m=cW*0.024;
    c.globalAlpha=0.46;c.lineWidth=cW*0.005;c.strokeRect(m,m,cW-m*2,cH-m*2);
    c.globalAlpha=0.22;c.lineWidth=cW*0.0015;c.strokeRect(m+cW*0.015,m+cW*0.015,cW-m*2-cW*0.030,cH-m*2-cW*0.030);
    c.globalAlpha=0.58;
    var r=cW*0.010;
    [[m,m],[cW-m,m],[cW-m,cH-m],[m,cH-m]].forEach(function(p){
      c.beginPath();c.arc(p[0],p[1],r,0,Math.PI*2);c.fill();
    });
  }

  /* ── Element drawing ──────────────────────────────────────────────── */
  function measureEl(c, el) {
    if (!el.text) return { id:el.id, x1:el.x, y1:el.y - 10, x2:el.x + 10, y2:el.y + 10 };
    var f = getFontById(el.fontId);
    c.font = (el.bold ? 'bold ' : '') + el.size + 'px ' + f.css;
    var tw = c.measureText(el.text).width;
    var h  = el.size;
    var x1, x2;
    if      (el.align === 'left')  { x1 = el.x;       x2 = el.x + tw; }
    else if (el.align === 'right') { x1 = el.x - tw;  x2 = el.x;      }
    else                            { x1 = el.x - tw/2; x2 = el.x + tw/2; }
    return { id:el.id, x1:x1, y1:el.y - h, x2:x2, y2:el.y + h*0.25 };
  }

  function drawEl(c, el) {
    if (!el.visible || !el.text) return;
    var f  = getFontById(el.fontId);
    c.save();
    c.font          = (el.bold ? 'bold ' : '') + el.size + 'px ' + f.css;
    c.textAlign     = el.align || 'center';
    c.textBaseline  = 'alphabetic';
    if (el.strokeOn && el.stroke) {
      var sw = Math.max(el.size * (el.sw || 0.08), 2);
      c.lineWidth = sw; c.strokeStyle = el.stroke; c.lineJoin = 'round';
      c.strokeText(el.text, el.x, el.y);
    }
    c.fillStyle = el.color;
    c.fillText(el.text, el.x, el.y);
    c.restore();
  }

  function drawSelection(c, box) {
    c.save();
    c.strokeStyle = '#60a5fa'; c.lineWidth = 3;
    c.setLineDash([8, 4]); c.globalAlpha = 0.85;
    c.strokeRect(box.x1 - 10, box.y1 - 6, box.x2 - box.x1 + 20, box.y2 - box.y1 + 10);
    c.setLineDash([]);
    c.restore();
  }

  /* ── Badge ────────────────────────────────────────────────────────── */
  function drawBadge(c, st) {
    var bt = (st.badgeText || '').toUpperCase(); if (!bt) return;
    var cW = c.canvas.width, cH = c.canvas.height;
    var sz = cH * 0.072;
    c.font = 'bold ' + sz + 'px Impact,"Arial Black",sans-serif';
    var tw = c.measureText(bt).width;
    var padX=cW*0.018, padY=cH*0.018, bh=sz+padY*2;
    var bw=tw+padX*2, bx=cW-bw-cW*0.024, by=cH*0.036;
    c.fillStyle = st.badgeColor || '#f59e0b';
    if (c.roundRect) { c.beginPath(); c.roundRect(bx, by, bw, bh, cH*0.012); c.fill(); }
    else             { c.fillRect(bx, by, bw, bh); }
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    var rgb = parseHex(st.badgeColor || '#f59e0b');
    c.fillStyle = (0.299*rgb[0]+0.587*rgb[1]+0.114*rgb[2]) > 140 ? '#000000' : '#ffffff';
    c.font = 'bold ' + sz + 'px Impact,"Arial Black",sans-serif';
    c.fillText(bt, bx + padX, by + padY + sz * 0.88);
  }

  /* ── Watermark ────────────────────────────────────────────────────── */
  function drawWatermark(c) {
    var cW = c.canvas.width, cH = c.canvas.height;
    var sz = cH * 0.032;
    c.font = 'bold ' + sz + 'px Arial,sans-serif';
    c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = cW*0.006;
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillText('thumbly.app', cW - cW*0.020, cH - cH*0.028);
    c.shadowBlur = 0; c.textAlign = 'left';
  }

  /* ── Core paint (used by both main and previews) ──────────────────── */
  function paintOn(c, st, tpl, showWatermark, showSelect) {
    var cW = c.canvas.width, cH = c.canvas.height;
    c.save();
    c.clearRect(0, 0, cW, cH);
    c.globalAlpha = 1;
    drawBackground(c, tpl, st);
    drawPatternOverlay(c, tpl, st);
    drawBadge(c, st);
    var boxes = [];
    if (st.elements) {
      st.elements.forEach(function(el) {
        drawEl(c, el);
        if (el.visible && el.text) boxes.push(measureEl(c, el));
      });
    }
    if (showWatermark) drawWatermark(c);
    if (showSelect && st.selectedId) {
      var box = boxes.find(function(b){ return b.id === st.selectedId; });
      if (box) drawSelection(c, box);
    }
    c.restore();
    return boxes;
  }

  /* ── Main render ──────────────────────────────────────────────────── */
  function render(forExport) {
    var tpl = window.getTemplate(state.templateId);
    elementBoxes = paintOn(mainCtx, state, tpl, !isPro(), !forExport);
  }

  /* ── Template picker ──────────────────────────────────────────────── */
  function buildTemplatePicker() {
    var container = document.getElementById('template-picker');
    if (!container) return;
    container.innerHTML = '';
    var prevSt = {
      templateId:'', bgMode:'template', showOverlay:true,
      bgSolid:'#000', bgFrom:'#000', bgTo:'#333', bgAngle:135,
      bgImage:null, photoOverlayOpacity:0.5,
      elements:[
        { id:'l1', label:'L1', text:'EPIC',  x:148, y:90,  size:38, fontId:'impact', color:'#ffffff', stroke:'#000000', strokeOn:true,  sw:0.08, align:'center', visible:true, bold:true },
        { id:'l2', label:'L2', text:'TITLE', x:148, y:130, size:30, fontId:'impact', color:'#ffffff', stroke:'#000000', strokeOn:true,  sw:0.08, align:'center', visible:true, bold:true },
      ],
      selectedId:null, badgeText:'', badgeColor:'#f59e0b',
    };

    window.TEMPLATES.forEach(function(tpl) {
      var locked = tpl.pro && !isPro();
      var div = document.createElement('div');
      div.className = 'tpl-card' + (tpl.id === state.templateId ? ' active' : '') + (locked ? ' locked' : '');

      var mc = document.createElement('canvas');
      mc.width = 296; mc.height = 167;
      div.appendChild(mc);

      var lbl = document.createElement('span');
      lbl.className = 'tpl-label';
      lbl.textContent = tpl.name + (locked ? ' 🔒' : '');
      div.appendChild(lbl);

      try {
        var mctx = mc.getContext('2d');
        mctx.save();
        mctx.scale(296 / W, 167 / H);
        prevSt.templateId = tpl.id;
        paintOn(mctx, prevSt, tpl, false, false);
        mctx.restore();
      } catch(e) {}

      div.addEventListener('click', function() {
        if (locked) { showUpgrade(); return; }
        state.templateId = tpl.id;
        document.querySelectorAll('.tpl-card').forEach(function(c){ c.classList.remove('active'); });
        div.classList.add('active');
        scheduleRender();
      });
      container.appendChild(div);
    });
  }

  /* ── Font picker ──────────────────────────────────────────────────── */
  function buildFontPicker() {
    var grid = document.getElementById('font-grid');
    if (!grid) return;
    grid.innerHTML = '';
    var el = getSelectedEl();
    var activeFontId = el ? el.fontId : 'impact';

    FONTS.forEach(function(f) {
      var locked = f.pro && !isPro();
      var btn = document.createElement('button');
      btn.className = 'font-btn' + (f.id === activeFontId ? ' active' : '') + (locked ? ' font-locked' : '');
      btn.style.fontFamily = f.css;
      btn.dataset.fontId = f.id;
      btn.title = f.name + (locked ? ' — Pro only' : '');
      if (locked) {
        var badge = document.createElement('span');
        badge.className = 'font-lock-badge';
        badge.textContent = '🔒';
        btn.appendChild(document.createTextNode(f.name));
        btn.appendChild(badge);
      } else {
        btn.textContent = f.name;
      }
      btn.addEventListener('click', function() {
        if (locked) { showUpgrade(); return; }
        var sel = getSelectedEl();
        if (!sel) return;
        sel.fontId = f.id;
        grid.querySelectorAll('.font-btn').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        scheduleRender();
      });
      grid.appendChild(btn);
    });
  }

  /* ── Element tabs ─────────────────────────────────────────────────── */
  function buildElementTabs() {
    var container = document.getElementById('element-tabs');
    if (!container) return;
    container.innerHTML = '';
    state.elements.forEach(function(el) {
      var btn = document.createElement('button');
      btn.className = 'el-tab' + (el.id === state.selectedId ? ' active' : '');
      btn.textContent = el.label;
      btn.addEventListener('click', function() {
        state.selectedId = el.id;
        syncElementEditor();
        scheduleRender();
      });
      container.appendChild(btn);
    });
  }

  /* ── Sync element editor panel to selected element ────────────────── */
  function syncElementEditor() {
    buildElementTabs();
    var el = getSelectedEl();

    var elText    = document.getElementById('el-text');
    var elSize    = document.getElementById('el-size');
    var elSizeVal = document.getElementById('el-size-val');
    var elColor   = document.getElementById('el-color');
    var elColorHex= document.getElementById('el-color-hex');
    var elStroke  = document.getElementById('el-stroke');
    var elStrokeOn= document.getElementById('el-stroke-on');
    var elVisible = document.getElementById('el-visible');
    var elBold    = document.getElementById('el-bold');

    if (!el) { if (elText) elText.value = ''; return; }

    if (elText)    elText.value   = el.text || '';
    if (elSize)    elSize.value   = el.size;
    if (elSizeVal) elSizeVal.textContent = el.size;
    if (elBold)    elBold.checked = el.bold !== false;
    if (elVisible) elVisible.checked = el.visible !== false;
    if (elStrokeOn) elStrokeOn.checked = el.strokeOn !== false;

    var hexColor = el.color || '#ffffff';
    if (hexColor.length > 7) hexColor = hexColor.slice(0, 7);
    if (elColor) elColor.value = hexColor;
    if (elColorHex) elColorHex.textContent = hexColor;

    var hexStroke = el.stroke || '#000000';
    if (hexStroke.length > 7) hexStroke = hexStroke.slice(0, 7);
    if (elStroke) elStroke.value = hexStroke;

    document.querySelectorAll('.align-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.align === (el.align || 'center'));
    });

    buildFontPicker();
  }

  /* ── Canvas drag events ───────────────────────────────────────────── */
  function initCanvasEvents() {
    var canvas = mainCanvas;

    canvas.addEventListener('mousedown',  onPointerDown);
    canvas.addEventListener('mousemove',  onPointerMove);
    canvas.addEventListener('mouseup',    onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove',  onPointerMove, { passive: false });
    canvas.addEventListener('touchend',   onPointerUp);

    function onPointerDown(evt) {
      evt.preventDefault();
      var pt    = canvasToBuffer(evt);
      var hitId = hitTest(pt.x, pt.y);
      if (hitId) {
        if (hitId !== state.selectedId) {
          state.selectedId = hitId;
          syncElementEditor();
        }
        var el = getEl(hitId);
        if (el) {
          drag.active = true; drag.id = hitId;
          drag.ox = pt.x;    drag.oy = pt.y;
          drag.elx = el.x;   drag.ely = el.y;
          canvas.style.cursor = 'grabbing';
        }
        scheduleRender();
      } else {
        state.selectedId = null;
        syncElementEditor();
        scheduleRender();
        canvas.style.cursor = 'default';
      }
    }

    function onPointerMove(evt) {
      evt.preventDefault();
      var pt = canvasToBuffer(evt);
      if (!drag.active) {
        canvas.style.cursor = hitTest(pt.x, pt.y) ? 'grab' : 'default';
        return;
      }
      var el = getEl(drag.id);
      if (!el) return;
      el.x = Math.round(drag.elx + (pt.x - drag.ox));
      el.y = Math.round(drag.ely + (pt.y - drag.oy));
      scheduleRender();
    }

    function onPointerUp() {
      drag.active = false;
      mainCanvas.style.cursor = 'default';
    }
  }

  /* ── Tab system ───────────────────────────────────────────────────── */
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var target = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
        document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.add('hidden'); });
        btn.classList.add('active');
        var pane = document.getElementById('tab-' + target);
        if (pane) pane.classList.remove('hidden');
        if (target === 'text') syncElementEditor();
      });
    });
  }

  /* ── BG mode ──────────────────────────────────────────────────────── */
  function initBgMode() {
    var bgModeBtns = document.querySelectorAll('.bg-mode-btn');

    function showBgOpts(mode) {
      ['solid','gradient','photo'].forEach(function(m) {
        var el = document.getElementById('bg-' + m + '-opts');
        if (el) el.classList.toggle('hidden', m !== mode);
      });
    }

    bgModeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = btn.dataset.bgmode;
        var needsPro = (mode === 'solid' || mode === 'gradient') && !isPro();
        if (needsPro) { showUpgrade(); return; }
        state.bgMode = mode;
        bgModeBtns.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        showBgOpts(mode === 'photo' ? 'photo' : mode === 'solid' ? 'solid' : mode === 'gradient' ? 'gradient' : '');
        scheduleRender();
      });
    });

    var solidColor = document.getElementById('bg-solid-color');
    if (solidColor) solidColor.addEventListener('input', function(){ state.bgSolid = solidColor.value; scheduleRender(); });

    var fromColor = document.getElementById('bg-from-color');
    if (fromColor) fromColor.addEventListener('input', function(){ state.bgFrom = fromColor.value; scheduleRender(); });

    var toColor = document.getElementById('bg-to-color');
    if (toColor) toColor.addEventListener('input', function(){ state.bgTo = toColor.value; scheduleRender(); });

    var bgAngle = document.getElementById('bg-angle');
    var bgAngleVal = document.getElementById('bg-angle-val');
    if (bgAngle) bgAngle.addEventListener('input', function(){
      state.bgAngle = +bgAngle.value;
      if (bgAngleVal) bgAngleVal.textContent = bgAngle.value;
      scheduleRender();
    });

    var uploadEl = document.getElementById('bg-upload');
    if (uploadEl) uploadEl.addEventListener('change', function(){
      var file = uploadEl.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function(){ state.bgImage = img; scheduleRender(); };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      var rmBtn = document.getElementById('remove-bg');
      if (rmBtn) rmBtn.style.display = '';
    });

    var removeBg = document.getElementById('remove-bg');
    if (removeBg) removeBg.addEventListener('click', function(){
      state.bgImage = null;
      if (uploadEl) uploadEl.value = '';
      removeBg.style.display = 'none';
      scheduleRender();
    });

    var overlayOp = document.getElementById('overlay-opacity');
    var overlayOpVal = document.getElementById('overlay-opacity-val');
    if (overlayOp) overlayOp.addEventListener('input', function(){
      state.photoOverlayOpacity = overlayOp.value / 100;
      if (overlayOpVal) overlayOpVal.textContent = overlayOp.value;
      scheduleRender();
    });

    var showOverlay = document.getElementById('show-overlay');
    if (showOverlay) showOverlay.addEventListener('change', function(){
      state.showOverlay = showOverlay.checked;
      scheduleRender();
    });

    // Show/hide pro lock icons on bg mode buttons
    function updateBgLocks() {
      var pro = isPro();
      var solidLock = document.getElementById('solid-lock');
      var gradLock  = document.getElementById('grad-lock');
      if (solidLock) solidLock.style.display = pro ? 'none' : '';
      if (gradLock)  gradLock.style.display  = pro ? 'none' : '';
    }
    updateBgLocks();
  }

  /* ── Text element controls ────────────────────────────────────────── */
  function initTextControls() {
    var elText = document.getElementById('el-text');
    if (elText) elText.addEventListener('input', function(){
      var el = getSelectedEl(); if (!el) return;
      el.text = elText.value;
      scheduleRender();
    });

    var elSize = document.getElementById('el-size');
    var elSizeVal = document.getElementById('el-size-val');
    if (elSize) elSize.addEventListener('input', function(){
      var el = getSelectedEl(); if (!el) return;
      el.size = +elSize.value;
      if (elSizeVal) elSizeVal.textContent = elSize.value;
      scheduleRender();
    });

    var elBold = document.getElementById('el-bold');
    if (elBold) elBold.addEventListener('change', function(){
      var el = getSelectedEl(); if (!el) return;
      el.bold = elBold.checked;
      scheduleRender();
    });

    document.querySelectorAll('.align-btn').forEach(function(btn) {
      btn.addEventListener('click', function(){
        var el = getSelectedEl(); if (!el) return;
        el.align = btn.dataset.align;
        document.querySelectorAll('.align-btn').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        scheduleRender();
      });
    });

    var elColor = document.getElementById('el-color');
    var elColorHex = document.getElementById('el-color-hex');
    if (elColor) elColor.addEventListener('input', function(){
      var el = getSelectedEl(); if (!el) return;
      el.color = elColor.value;
      if (elColorHex) elColorHex.textContent = elColor.value;
      scheduleRender();
    });

    var elStroke = document.getElementById('el-stroke');
    if (elStroke) elStroke.addEventListener('input', function(){
      var el = getSelectedEl(); if (!el) return;
      el.stroke = elStroke.value;
      scheduleRender();
    });

    var elStrokeOn = document.getElementById('el-stroke-on');
    if (elStrokeOn) elStrokeOn.addEventListener('change', function(){
      var el = getSelectedEl(); if (!el) return;
      el.strokeOn = elStrokeOn.checked;
      scheduleRender();
    });

    var elVisible = document.getElementById('el-visible');
    if (elVisible) elVisible.addEventListener('change', function(){
      var el = getSelectedEl(); if (!el) return;
      el.visible = elVisible.checked;
      scheduleRender();
    });

    var badgeText = document.getElementById('badge-text');
    if (badgeText) badgeText.addEventListener('input', function(){
      state.badgeText = badgeText.value;
      scheduleRender();
    });

    var badgeColor = document.getElementById('badge-color');
    if (badgeColor) badgeColor.addEventListener('input', function(){
      state.badgeColor = badgeColor.value;
      scheduleRender();
    });

    var channelName = document.getElementById('channel-name');
    if (channelName) channelName.addEventListener('input', function(){
      var el = getEl('channel');
      if (el) { el.text = channelName.value; scheduleRender(); }
    });
  }

  /* ── Upgrade modal ────────────────────────────────────────────────── */
  function showUpgrade() {
    var m = document.getElementById('upgrade-modal');
    if (m) m.style.display = 'flex';
  }
  function hideUpgrade() {
    var m = document.getElementById('upgrade-modal');
    if (m) m.style.display = 'none';
  }

  /* ── Pro UI refresh ───────────────────────────────────────────────── */
  function refreshProUI() {
    var pro = isPro();
    document.querySelectorAll('.pro-only').forEach(function(el){ el.style.display = pro ? '' : 'none'; });
    document.querySelectorAll('.free-only').forEach(function(el){ el.style.display = pro ? 'none' : ''; });

    var upgradeBar = document.getElementById('upgrade-bar');
    if (upgradeBar) upgradeBar.style.display = pro ? 'none' : '';

    var proBadge = document.getElementById('pro-badge');
    if (proBadge) proBadge.style.display = pro ? 'inline-block' : 'none';

    var navBtn = document.getElementById('nav-upgrade-btn');
    if (navBtn) navBtn.style.display = pro ? 'none' : '';

    var exportInfo = document.getElementById('export-info');
    if (exportInfo) {
      exportInfo.textContent = pro
        ? 'Unlimited exports'
        : exportsLeft() + ' free export' + (exportsLeft() === 1 ? '' : 's') + ' left today';
    }

    // Update bg lock icons
    var solidLock = document.getElementById('solid-lock');
    var gradLock  = document.getElementById('grad-lock');
    if (solidLock) solidLock.style.display = pro ? 'none' : '';
    if (gradLock)  gradLock.style.display  = pro ? 'none' : '';
  }

  /* ── Export ───────────────────────────────────────────────────────── */
  function handleExport() {
    if (!canExport()) { showUpgrade(); return; }
    render(true);
    requestAnimationFrame(function(){
      var link      = document.createElement('a');
      link.download = 'thumbly-' + state.templateId + '.png';
      link.href     = mainCanvas.toDataURL('image/png');
      link.click();
      recordExport();
      render(false);
      refreshProUI();
    });
  }

  /* ── Price display ────────────────────────────────────────────────── */
  function initPricing() {
    document.querySelectorAll('[data-price]').forEach(function(el){
      el.textContent = (window.THUMBLY_PRICE_DISPLAY || '$6');
    });
    var checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', function(){
      if (window.THUMBLY_CHECKOUT) window.THUMBLY_CHECKOUT();
    });
  }

  /* ── Init ─────────────────────────────────────────────────────────── */
  function init() {
    mainCanvas = document.getElementById('thumb');
    mainCtx    = mainCanvas.getContext('2d');

    // Pro activation from Stripe redirect
    var params = new URLSearchParams(location.search);
    if (params.get('pro') === 'success') {
      activatePro();
      history.replaceState({}, '', location.pathname);
      setTimeout(function(){
        var t = document.getElementById('pro-toast');
        if (t) { t.style.display = 'flex'; setTimeout(function(){ t.style.display = 'none'; }, 5000); }
      }, 400);
    }

    initTabs();
    initBgMode();
    initTextControls();
    initCanvasEvents();
    initPricing();

    // Upgrade buttons
    document.querySelectorAll('.upgrade-btn').forEach(function(btn){
      btn.addEventListener('click', showUpgrade);
    });
    var modalClose = document.getElementById('modal-close');
    if (modalClose) modalClose.addEventListener('click', hideUpgrade);
    var modalEl = document.getElementById('upgrade-modal');
    if (modalEl) modalEl.addEventListener('click', function(e){ if (e.target === modalEl) hideUpgrade(); });

    var exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', handleExport);

    buildTemplatePicker();
    buildElementTabs();
    buildFontPicker();
    refreshProUI();

    // Wait for fonts then render
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function(){ scheduleRender(); });
    } else {
      scheduleRender();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
