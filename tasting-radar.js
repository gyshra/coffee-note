/**
 * Coffee Note — Radar Chart v2
 * UX 개선: 큰 터치 영역 + 탭→슬라이더 패널
 */
(function(global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var AXES = ["아로마","산미","단맛","바디감","여운"];
  var N = 5;
  var COMMUNITY = {아로마:6.5,산미:6.0,단맛:5.8,바디감:5.5,여운:6.2};
  var WARM = "#8C7355";
  var WARM_LIGHT = "rgba(140,115,85,0.12)";

  function aFor(i,n) { return (Math.PI*2*i/(n||N)) - Math.PI/2; }
  function pol(cx,cy,r,a) { return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }
  function vToR(v,min,max) { return min+((max-min)*(Math.max(1,Math.min(10,v))-1)/9); }
  function pts(cx,cy,rfn,n) {
    var arr=[];
    for(var i=0;i<n;i++){var p=pol(cx,cy,rfn(i),aFor(i,n));arr.push(p[0]+","+p[1]);}
    return arr.join(" ");
  }

  /* ══════════════════════════════════════════
     Interactive (tasting.html)
     ══════════════════════════════════════════ */
  function createInteractive(options) {
    var svgEl = document.getElementById(options.svgId);
    if (!svgEl) return null;

    // 더 큰 뷰박스 → 핸들 조작 편의
    var CX=180, CY=180, MAX_R=140, MIN_R=20;
    svgEl.setAttribute("viewBox","0 0 360 360");
    svgEl.style.touchAction = "none";
    svgEl.style.userSelect = "none";

    var vals = [5,5,5,5,5];
    var showCommunity = false;
    var dragIdx = -1;
    var onChange = options.onChange || null;
    var onAxisClick = options.onAxisClick || null;

    // ── 슬라이더 패널 ──────────────────────────────────────────
    var panelEl = null;
    var activeAxisIdx = -1;

    function getOrCreatePanel() {
      if (panelEl) return panelEl;
      var wrap = svgEl.parentElement;
      panelEl = document.createElement("div");
      panelEl.style.cssText = [
        "margin-top:12px","padding:14px 16px",
        "background:var(--color-background-secondary,#F8F6F3)",
        "border-radius:8px","display:none"
      ].join(";");
      panelEl.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<span id="radarPanelLabel" style="font-size:14px;font-weight:600;color:#121212"></span>' +
        '<span id="radarPanelVal" style="font-size:22px;font-weight:700;color:'+WARM+'"></span>' +
        '</div>' +
        '<input type="range" id="radarSlider" min="1" max="10" step="1" style="width:100%;accent-color:'+WARM+'">' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:4px"><span>1</span><span>5</span><span>10</span></div>';
      wrap.insertBefore(panelEl, svgEl.nextSibling);
      document.getElementById("radarSlider").addEventListener("input", function() {
        if (activeAxisIdx < 0) return;
        vals[activeAxisIdx] = +this.value;
        document.getElementById("radarPanelVal").textContent = this.value;
        draw();
        if (onChange) onChange(getValues());
      });
      return panelEl;
    }

    function showPanel(idx) {
      var panel = getOrCreatePanel();
      activeAxisIdx = idx;
      panel.style.display = "block";
      document.getElementById("radarPanelLabel").textContent = AXES[idx];
      document.getElementById("radarPanelVal").textContent = vals[idx];
      document.getElementById("radarSlider").value = vals[idx];
    }

    function draw() {
      svgEl.innerHTML = "";

      // 가이드 다각형
      for (var ring=1;ring<=5;ring++) {
        var r = MIN_R+((MAX_R-MIN_R)*ring/5);
        var pg = document.createElementNS(NS,"polygon");
        pg.setAttribute("points", pts(CX,CY,function(){return r;},N));
        pg.setAttribute("fill", ring===5?WARM_LIGHT:"none");
        pg.setAttribute("stroke","#E8E5E0");
        pg.setAttribute("stroke-width","0.8");
        svgEl.appendChild(pg);
      }

      // 링 수치 라벨 (2,4,6,8,10)
      [2,4,6,8,10].forEach(function(v,ri){
        var r2 = vToR(v,MIN_R,MAX_R);
        var lp = pol(CX,CY,r2,-Math.PI/2+0.18);
        var lt = document.createElementNS(NS,"text");
        lt.setAttribute("x",lp[0]+3);
        lt.setAttribute("y",lp[1]);
        lt.setAttribute("font-size","9");
        lt.setAttribute("fill","#AAA");
        lt.setAttribute("font-family","'Pretendard Variable',sans-serif");
        lt.setAttribute("dominant-baseline","central");
        lt.setAttribute("pointer-events","none");
        lt.textContent = v;
        svgEl.appendChild(lt);
      });

      // 축 라인
      for (var i=0;i<N;i++) {
        var ep = pol(CX,CY,MAX_R+6,aFor(i));
        var ln = document.createElementNS(NS,"line");
        ln.setAttribute("x1",CX); ln.setAttribute("y1",CY);
        ln.setAttribute("x2",ep[0]); ln.setAttribute("y2",ep[1]);
        ln.setAttribute("stroke","#E0DDD8"); ln.setAttribute("stroke-width","0.8");
        svgEl.appendChild(ln);
      }

      // 커뮤니티 비교
      if (showCommunity) {
        var cp = document.createElementNS(NS,"polygon");
        cp.setAttribute("points", pts(CX,CY,function(j){return vToR(COMMUNITY[AXES[j]]||5,MIN_R,MAX_R);},N));
        cp.setAttribute("fill","rgba(18,18,18,0.04)");
        cp.setAttribute("stroke","#C0BCBA");
        cp.setAttribute("stroke-width","1.5");
        cp.setAttribute("stroke-dasharray","6 4");
        cp.setAttribute("stroke-linejoin","round");
        svgEl.appendChild(cp);
      }

      // 내 값 다각형
      var fp = document.createElementNS(NS,"polygon");
      fp.setAttribute("points", pts(CX,CY,function(j){return vToR(vals[j],MIN_R,MAX_R);},N));
      fp.setAttribute("fill",WARM_LIGHT);
      fp.setAttribute("stroke",WARM);
      fp.setAttribute("stroke-width","2.5");
      fp.setAttribute("stroke-linejoin","round");
      svgEl.appendChild(fp);

      // 핸들 + 터치 영역 + 축 라벨
      for (var i=0;i<N;i++) {
        (function(idx){
          var angle = aFor(idx);
          var hr = vToR(vals[idx],MIN_R,MAX_R);
          var hp = pol(CX,CY,hr,angle);

          // ── 보이지 않는 큰 터치 히트 영역 (r=22) ──
          var hitCircle = document.createElementNS(NS,"circle");
          hitCircle.setAttribute("cx",hp[0]); hitCircle.setAttribute("cy",hp[1]);
          hitCircle.setAttribute("r","22");
          hitCircle.setAttribute("fill","transparent");
          hitCircle.setAttribute("cursor","grab");
          hitCircle.setAttribute("data-idx",idx);
          svgEl.appendChild(hitCircle);

          // 값 라벨 (핸들 내부)
          var vt = document.createElementNS(NS,"text");
          vt.setAttribute("x",hp[0]); vt.setAttribute("y",hp[1]);
          vt.setAttribute("text-anchor","middle"); vt.setAttribute("dominant-baseline","central");
          vt.setAttribute("font-size","11"); vt.setAttribute("font-weight","700");
          vt.setAttribute("fill","#fff"); vt.setAttribute("pointer-events","none");
          vt.setAttribute("font-family","'Pretendard Variable',sans-serif");
          vt.textContent = vals[idx];
          svgEl.appendChild(vt);

          // 핸들 (시각적, r=16)
          var hc = document.createElementNS(NS,"circle");
          hc.setAttribute("cx",hp[0]); hc.setAttribute("cy",hp[1]);
          hc.setAttribute("r","16");
          hc.setAttribute("fill", activeAxisIdx===idx ? "#5C4A35" : WARM);
          hc.setAttribute("stroke","#fff"); hc.setAttribute("stroke-width","2.5");
          hc.setAttribute("cursor","grab"); hc.setAttribute("pointer-events","none");
          svgEl.appendChild(hc);
          // 값 라벨을 핸들 위로
          svgEl.appendChild(vt);

          // 축 이름 라벨 (탭 가능)
          var nlp = pol(CX,CY,MAX_R+26,angle);
          var labelBg = document.createElementNS(NS,"rect");
          var labelText = document.createElementNS(NS,"text");
          labelText.setAttribute("x",nlp[0]); labelText.setAttribute("y",nlp[1]);
          labelText.setAttribute("text-anchor","middle"); labelText.setAttribute("dominant-baseline","central");
          labelText.setAttribute("font-size","13"); labelText.setAttribute("font-weight","600");
          labelText.setAttribute("fill", activeAxisIdx===idx ? WARM : "#333");
          labelText.setAttribute("font-family","'Pretendard Variable',sans-serif");
          labelText.setAttribute("cursor","pointer");
          labelText.textContent = AXES[idx];
          svgEl.appendChild(labelText);
        })(i);
      }
    }

    // ── 드래그 로직 ───────────────────────────────────────────
    function getEventXY(e) {
      var rect = svgEl.getBoundingClientRect();
      var scaleX = 360/rect.width;
      var scaleY = 360/rect.height;
      var clientX = e.touches?e.touches[0].clientX:e.clientX;
      var clientY = e.touches?e.touches[0].clientY:e.clientY;
      return [(clientX-rect.left)*scaleX, (clientY-rect.top)*scaleY];
    }

    function xyToVal(x,y,idx) {
      var angle = aFor(idx);
      var dx=x-CX, dy=y-CY;
      var proj = dx*Math.cos(angle)+dy*Math.sin(angle);
      var clamped = Math.max(MIN_R,Math.min(MAX_R,proj));
      return Math.round(1+(clamped-MIN_R)/(MAX_R-MIN_R)*9);
    }

    function findNearestHandle(x,y) {
      var best=-1, bestDist=999;
      for (var i=0;i<N;i++) {
        var hr=vToR(vals[i],MIN_R,MAX_R);
        var hp=pol(CX,CY,hr,aFor(i));
        var d=Math.hypot(x-hp[0],y-hp[1]);
        if (d<bestDist){bestDist=d;best=i;}
      }
      return bestDist<30?best:-1;
    }

    svgEl.addEventListener("pointerdown",function(e){
      var xy=getEventXY(e);
      var idx=findNearestHandle(xy[0],xy[1]);
      if (idx<0) return;
      dragIdx=idx;
      svgEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    svgEl.addEventListener("pointermove",function(e){
      if (dragIdx<0) return;
      var xy=getEventXY(e);
      var v=xyToVal(xy[0],xy[1],dragIdx);
      if (v!==vals[dragIdx]) {
        vals[dragIdx]=v;
        if (panelEl&&activeAxisIdx===dragIdx) {
          document.getElementById("radarPanelVal").textContent=v;
          document.getElementById("radarSlider").value=v;
        }
        draw();
        if (onChange) onChange(getValues());
      }
      e.preventDefault();
    });
    svgEl.addEventListener("pointerup",function(e){
      if (dragIdx>=0) { showPanel(dragIdx); dragIdx=-1; }
    });
    svgEl.addEventListener("pointercancel",function(){ dragIdx=-1; });

    // 탭(클릭)으로 축 라벨/핸들 탭 → 슬라이더 패널 열기
    svgEl.addEventListener("click",function(e){
      if (dragIdx>=0) return;
      var xy=getEventXY(e);
      var idx=findNearestHandle(xy[0],xy[1]);
      if (idx>=0) {
        activeAxisIdx=idx;
        showPanel(idx);
        draw();
      }
    });

    function getValues() {
      var obj={};
      AXES.forEach(function(a,i){obj[a]=vals[i];});
      return obj;
    }

    function setValues(obj) {
      AXES.forEach(function(a,i){if(obj[a]!==undefined) vals[i]=+obj[a];});
      draw();
    }

    function toggleCommunity(v) { showCommunity=v; draw(); }

    draw();
    return { draw,getValues,setValues,toggleCommunity };
  }

  /* ══════════════════════════════════════════
     Readonly mini (note-detail)
     ══════════════════════════════════════════ */
  function createReadonly(options) {
    var svgEl = document.getElementById(options.svgId);
    if (!svgEl) return null;
    var CX=120,CY=120,MAX_R=90,MIN_R=14;
    svgEl.setAttribute("viewBox","0 0 240 240");
    var vals = options.values || {};
    var showCommunity = options.showCommunity || false;
    var onAxisClick = options.onAxisClick || null;

    function draw() {
      svgEl.innerHTML="";
      for(var ring=1;ring<=5;ring++){
        var r=MIN_R+((MAX_R-MIN_R)*ring/5);
        var pg=document.createElementNS(NS,"polygon");
        pg.setAttribute("points",pts(CX,CY,function(){return r;},N));
        pg.setAttribute("fill",ring===5?WARM_LIGHT:"none");
        pg.setAttribute("stroke","#E8E5E0");
        pg.setAttribute("stroke-width","0.5");
        svgEl.appendChild(pg);
      }
      for(var i=0;i<N;i++){
        var ep=pol(CX,CY,MAX_R+2,aFor(i));
        var ln=document.createElementNS(NS,"line");
        ln.setAttribute("x1",CX);ln.setAttribute("y1",CY);
        ln.setAttribute("x2",ep[0]);ln.setAttribute("y2",ep[1]);
        ln.setAttribute("stroke","#E8E5E0");ln.setAttribute("stroke-width","0.5");
        svgEl.appendChild(ln);
      }
      if(showCommunity){
        var cp=document.createElementNS(NS,"polygon");
        cp.setAttribute("points",pts(CX,CY,function(j){return vToR(COMMUNITY[AXES[j]]||5,MIN_R,MAX_R);},N));
        cp.setAttribute("fill","rgba(18,18,18,0.04)");
        cp.setAttribute("stroke","#C0BCBA");
        cp.setAttribute("stroke-width","1");
        cp.setAttribute("stroke-dasharray","4 3");
        cp.setAttribute("stroke-linejoin","round");
        svgEl.appendChild(cp);
      }
      var fp=document.createElementNS(NS,"polygon");
      fp.setAttribute("points",pts(CX,CY,function(j){return vToR(vals[AXES[j]]||5,MIN_R,MAX_R);},N));
      fp.setAttribute("fill",WARM_LIGHT);
      fp.setAttribute("stroke",WARM);
      fp.setAttribute("stroke-width","1.5");
      fp.setAttribute("stroke-linejoin","round");
      svgEl.appendChild(fp);
      for(var i=0;i<N;i++){
        (function(idx){
          var angle=aFor(idx);
          var v=vals[AXES[idx]]||5;
          var hp=pol(CX,CY,vToR(v,MIN_R,MAX_R),angle);
          var dot=document.createElementNS(NS,"circle");
          dot.setAttribute("cx",hp[0]);dot.setAttribute("cy",hp[1]);
          dot.setAttribute("r","5");dot.setAttribute("fill",WARM);
          dot.setAttribute("stroke","#fff");dot.setAttribute("stroke-width","1.5");
          svgEl.appendChild(dot);
          var nlp=pol(CX,CY,MAX_R+18,angle);
          var nt=document.createElementNS(NS,"text");
          nt.setAttribute("x",nlp[0]);nt.setAttribute("y",nlp[1]);
          nt.setAttribute("text-anchor","middle");nt.setAttribute("dominant-baseline","central");
          nt.setAttribute("font-size","10");nt.setAttribute("font-weight","500");
          nt.setAttribute("fill","#333");
          nt.setAttribute("font-family","'Pretendard Variable',sans-serif");
          if(onAxisClick){nt.setAttribute("cursor","pointer");nt.addEventListener("click",function(){onAxisClick(AXES[idx]);});}
          nt.textContent = AXES[idx]+" "+v;
          svgEl.appendChild(nt);
        })(i);
      }
    }
    draw();
    return {draw};
  }

  global.CoffeeRadar = { createInteractive, createReadonly, AXES };
})(typeof window!=="undefined"?window:globalThis);
