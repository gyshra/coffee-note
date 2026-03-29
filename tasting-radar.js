/**
 * Coffee Note — Radar Chart v3
 * 3중 비교: 내 기록(warm 실선) / 커뮤니티 평균(회색 점선) / 전문가(black 점선)
 * 드래그 핸들 + 탭→슬라이더 패널
 */
(function(global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var AXES = ["아로마","산미","단맛","바디감","여운"];
  var N = 5;

  /* 커뮤니티 평균 (실제 서비스 시 Supabase GROUP BY로 교체) */
  var COMMUNITY = { 아로마:6.5, 산미:6.0, 단맛:5.8, 바디감:5.5, 여운:6.2 };

  /* 전문가(Q-Grader / CQI) 기준값 (실제 서비스 시 cqi_benchmarks 테이블로 교체) */
  var EXPERT = { 아로마:8.2, 산미:8.5, 단맛:7.0, 바디감:7.5, 여운:8.0 };

  var WARM       = "#8C7355";
  var WARM_LIGHT = "rgba(140,115,85,0.12)";
  var EXP_COLOR  = "#121212";          /* 전문가: 진한 검정 */
  var COM_COLOR  = "#BBBBBB";          /* 커뮤니티: 연회색 */

  function aFor(i,n) { return (Math.PI*2*i/(n||N)) - Math.PI/2; }
  function pol(cx,cy,r,a) { return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }
  function vToR(v,min,max) { return min+((max-min)*(Math.max(1,Math.min(10,v))-1)/9); }
  function pts(cx,cy,rfn,n) {
    var arr=[];
    for(var i=0;i<(n||N);i++){var p=pol(cx,cy,rfn(i),aFor(i,n||N));arr.push(p[0]+","+p[1]);}
    return arr.join(" ");
  }
  function mkEl(tag,attrs) {
    var el=document.createElementNS(NS,tag);
    for(var k in attrs) el.setAttribute(k,attrs[k]);
    return el;
  }
  function app(p,c){p.appendChild(c);}

  /* ══════════════════════════════════════════════════════════════
     Interactive (tasting.html)
     ══════════════════════════════════════════════════════════════ */
  function createInteractive(options) {
    var svgEl = document.getElementById(options.svgId);
    if (!svgEl) return null;

    var CX=180, CY=180, MAX_R=140, MIN_R=20;
    svgEl.setAttribute("viewBox","0 0 360 360");
    svgEl.style.touchAction = "none";
    svgEl.style.userSelect  = "none";

    var vals = [5,5,5,5,5];
    var showCompare = false;   /* 토글: 커뮤니티+전문가 오버레이 */
    var dragIdx     = -1;
    var onChange    = options.onChange || null;
    var panelEl     = null;
    var activeAxisIdx = -1;

    /* ── 슬라이더 패널 ── */
    function getOrCreatePanel() {
      if (panelEl) return panelEl;
      var wrap = svgEl.parentElement;
      panelEl = document.createElement("div");
      panelEl.style.cssText = [
        "margin-top:12px","padding:14px 16px",
        "background:#F8F6F3","display:none",
      ].join(";");
      panelEl.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<span id="radarPanelLabel" style="font-size:14px;font-weight:600;color:#121212"></span>' +
          '<span id="radarPanelVal"   style="font-size:22px;font-weight:700;color:'+WARM+'"></span>' +
        '</div>' +
        '<input type="range" id="radarSlider" min="1" max="10" step="1" style="width:100%;accent-color:'+WARM+'">' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:4px">' +
          '<span>1</span><span>5</span><span>10</span>' +
        '</div>';
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
      document.getElementById("radarPanelVal").textContent   = vals[idx];
      document.getElementById("radarSlider").value           = vals[idx];
    }

    /* ── 비교 패널 (compare ON 시 차이 표시) ── */
    var comparePanelEl = null;
    function getOrCreateComparePanel() {
      if (comparePanelEl) return comparePanelEl;
      var wrap = svgEl.parentElement;
      comparePanelEl = document.createElement("div");
      comparePanelEl.id = "radarComparePanel";
      comparePanelEl.style.cssText = "margin-top:16px;display:none;";
      wrap.appendChild(comparePanelEl);
      return comparePanelEl;
    }

    function updateComparePanel() {
      if (!showCompare) {
        if (comparePanelEl) comparePanelEl.style.display = "none";
        return;
      }
      var cp = getOrCreateComparePanel();
      cp.style.display = "block";

      /* 범례 */
      var legendHtml =
        '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px">' +
          '<span style="font-size:11px;font-weight:700;color:'+WARM+';display:flex;align-items:center;gap:5px">' +
            '<svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="'+WARM+'" stroke-width="2.5"/></svg> 내 기록</span>' +
          '<span style="font-size:11px;font-weight:700;color:'+COM_COLOR+';display:flex;align-items:center;gap:5px">' +
            '<svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="'+COM_COLOR+'" stroke-width="1.5" stroke-dasharray="4,2"/></svg> 커뮤니티 평균</span>' +
          '<span style="font-size:11px;font-weight:700;color:'+EXP_COLOR+';display:flex;align-items:center;gap:5px">' +
            '<svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="'+EXP_COLOR+'" stroke-width="1.5" stroke-dasharray="2,2"/></svg> 전문가(CQI)</span>' +
        '</div>';

      /* 축별 점수 비교 테이블 */
      var rowsHtml = AXES.map(function(ax, i) {
        var my  = vals[i];
        var com = COMMUNITY[ax] || 5;
        var exp = EXPERT[ax]    || 7;
        var dCom = (my - com).toFixed(1);
        var dExp = (my - exp).toFixed(1);
        var dComSign = dCom >= 0 ? "+" : "";
        var dExpSign = dExp >= 0 ? "+" : "";
        var dComColor = dCom > 0 ? "#2d6a2d" : dCom < 0 ? "#A0522D" : "#888";
        var dExpColor = dExp > 0 ? "#2d6a2d" : dExp < 0 ? "#A0522D" : "#888";
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F0EDE8">' +
          '<span style="font-size:12px;font-weight:600;width:44px;color:#121212">' + ax + '</span>' +
          '<span style="font-size:15px;font-weight:800;width:20px;text-align:center;color:'+WARM+'">' + my + '</span>' +
          '<div style="flex:1;height:3px;background:#E8E5E0;position:relative">' +
            '<div style="position:absolute;left:0;top:0;height:100%;background:'+WARM+';width:'+(my/10*100)+'%;transition:width .2s"></div>' +
          '</div>' +
          '<span style="font-size:10px;font-weight:700;width:36px;text-align:right;color:'+dComColor+'">' + dComSign + dCom + '</span>' +
          '<span style="font-size:10px;font-weight:700;width:36px;text-align:right;color:'+dExpColor+'">' + dExpSign + dExp + '</span>' +
        '</div>';
      }).join("");

      var headerHtml =
        '<div style="display:flex;align-items:center;gap:8px;padding-bottom:5px;border-bottom:2px solid #121212;margin-bottom:2px">' +
          '<span style="font-size:10px;font-weight:700;color:#888;width:44px"></span>' +
          '<span style="font-size:10px;font-weight:700;color:'+WARM+';width:20px;text-align:center">나</span>' +
          '<div style="flex:1"></div>' +
          '<span style="font-size:10px;font-weight:700;color:'+COM_COLOR+';width:36px;text-align:right">vs커뮤</span>' +
          '<span style="font-size:10px;font-weight:700;color:'+EXP_COLOR+';width:36px;text-align:right">vs전문가</span>' +
        '</div>';

      /* 전체 평균 차이 */
      var myAvg  = vals.reduce(function(a,b){return a+b;},0)/N;
      var comAvg = AXES.reduce(function(a,ax){return a+(COMMUNITY[ax]||5);},0)/N;
      var expAvg = AXES.reduce(function(a,ax){return a+(EXPERT[ax]||7);},0)/N;
      var dCom2  = (myAvg-comAvg).toFixed(1);
      var dExp2  = (myAvg-expAvg).toFixed(1);
      var summaryHtml =
        '<div style="display:flex;gap:12px;margin-top:12px">' +
          '<div style="flex:1;background:#F8F6F3;padding:10px 12px;text-align:center">' +
            '<div style="font-size:9px;font-weight:700;letter-spacing:1px;color:'+COM_COLOR+';margin-bottom:3px">vs 커뮤니티</div>' +
            '<div style="font-size:22px;font-weight:900;color:' + (dCom2>=0?'#2d6a2d':'#A0522D') + '">' + (dCom2>=0?'+':'') + dCom2 + '</div>' +
          '</div>' +
          '<div style="flex:1;background:#F8F6F3;padding:10px 12px;text-align:center">' +
            '<div style="font-size:9px;font-weight:700;letter-spacing:1px;color:'+EXP_COLOR+';margin-bottom:3px">vs 전문가</div>' +
            '<div style="font-size:22px;font-weight:900;color:' + (dExp2>=0?'#2d6a2d':'#A0522D') + '">' + (dExp2>=0?'+':'') + dExp2 + '</div>' +
          '</div>' +
        '</div>';

      cp.innerHTML = legendHtml + headerHtml + rowsHtml + summaryHtml;
    }

    /* ── 레이더 렌더 ── */
    function draw() {
      svgEl.innerHTML = "";

      /* 가이드 링 */
      for (var ring=1; ring<=5; ring++) {
        var r = MIN_R+((MAX_R-MIN_R)*ring/5);
        var pg = mkEl("polygon",{
          points: pts(CX,CY,function(){return r;},N),
          fill: ring===5 ? WARM_LIGHT : "none",
          stroke: "#E8E5E0", "stroke-width":"0.8",
        });
        app(svgEl, pg);
      }

      /* 수치 라벨 */
      [2,4,6,8,10].forEach(function(v) {
        var r2 = vToR(v,MIN_R,MAX_R);
        var lp = pol(CX,CY,r2,-Math.PI/2+0.18);
        var lt = mkEl("text",{
          x:lp[0]+3, y:lp[1], "font-size":"9", fill:"#BBB",
          "font-family":"'Pretendard Variable',sans-serif",
          "dominant-baseline":"central","pointer-events":"none",
        });
        lt.textContent = v;
        app(svgEl, lt);
      });

      /* 축 라인 */
      for (var i=0; i<N; i++) {
        var ep = pol(CX,CY,MAX_R+6,aFor(i));
        app(svgEl, mkEl("line",{
          x1:CX,y1:CY, x2:ep[0],y2:ep[1],
          stroke:"#E0DDD8","stroke-width":"0.8",
        }));
      }

      if (showCompare) {
        /* 커뮤니티 점선 (회색) */
        app(svgEl, mkEl("polygon",{
          points: pts(CX,CY,function(j){return vToR(COMMUNITY[AXES[j]]||5,MIN_R,MAX_R);},N),
          fill:"none", stroke:COM_COLOR, "stroke-width":"1.5",
          "stroke-dasharray":"6 4", "stroke-linejoin":"round",
        }));

        /* 전문가 점선 (검정) */
        app(svgEl, mkEl("polygon",{
          points: pts(CX,CY,function(j){return vToR(EXPERT[AXES[j]]||7,MIN_R,MAX_R);},N),
          fill:"none", stroke:EXP_COLOR, "stroke-width":"1.5",
          "stroke-dasharray":"3 3", "stroke-linejoin":"round",
        }));
      }

      /* 내 값 */
      app(svgEl, mkEl("polygon",{
        points: pts(CX,CY,function(j){return vToR(vals[j],MIN_R,MAX_R);},N),
        fill: WARM_LIGHT, stroke:WARM, "stroke-width":"2.5", "stroke-linejoin":"round",
      }));

      /* 핸들 + 라벨 */
      for (var i=0; i<N; i++) {
        (function(idx) {
          var angle = aFor(idx);
          var hr    = vToR(vals[idx],MIN_R,MAX_R);
          var hp    = pol(CX,CY,hr,angle);

          /* 히트 영역 */
          app(svgEl, mkEl("circle",{
            cx:hp[0],cy:hp[1],r:"22",fill:"transparent",
            cursor:"grab","data-idx":idx,
          }));

          /* 핸들 */
          app(svgEl, mkEl("circle",{
            cx:hp[0],cy:hp[1],r:"16",
            fill: activeAxisIdx===idx ? "#5C4A35" : WARM,
            stroke:"#fff","stroke-width":"2.5",
            cursor:"grab","pointer-events":"none",
          }));

          /* 값 텍스트 */
          var vt = mkEl("text",{
            x:hp[0],y:hp[1],"text-anchor":"middle","dominant-baseline":"central",
            "font-size":"11","font-weight":"700",fill:"#fff",
            "font-family":"'Pretendard Variable',sans-serif","pointer-events":"none",
          });
          vt.textContent = vals[idx];
          app(svgEl, vt);

          /* 축 라벨 */
          var nlp = pol(CX,CY,MAX_R+26,angle);
          var lt2 = mkEl("text",{
            x:nlp[0],y:nlp[1],"text-anchor":"middle","dominant-baseline":"central",
            "font-size":"13","font-weight":"600",
            fill: activeAxisIdx===idx ? WARM : "#333",
            "font-family":"'Pretendard Variable',sans-serif",
            cursor:"pointer",
          });
          lt2.textContent = AXES[idx];
          app(svgEl, lt2);
        })(i);
      }

      updateComparePanel();
    }

    /* ── 드래그 ── */
    function getXY(e) {
      var rect=svgEl.getBoundingClientRect();
      var sx=360/rect.width, sy=360/rect.height;
      var cx=e.touches?e.touches[0].clientX:e.clientX;
      var cy=e.touches?e.touches[0].clientY:e.clientY;
      return [(cx-rect.left)*sx,(cy-rect.top)*sy];
    }

    function xyToVal(x,y,idx) {
      var a=aFor(idx), dx=x-CX, dy=y-CY;
      var proj=dx*Math.cos(a)+dy*Math.sin(a);
      return Math.round(1+(Math.max(MIN_R,Math.min(MAX_R,proj))-MIN_R)/(MAX_R-MIN_R)*9);
    }

    function nearest(x,y) {
      var best=-1, bd=999;
      for(var i=0;i<N;i++){
        var hr=vToR(vals[i],MIN_R,MAX_R);
        var hp=pol(CX,CY,hr,aFor(i));
        var d=Math.hypot(x-hp[0],y-hp[1]);
        if(d<bd){bd=d;best=i;}
      }
      return bd<30?best:-1;
    }

    svgEl.addEventListener("pointerdown",function(e){
      var xy=getXY(e); var idx=nearest(xy[0],xy[1]);
      if(idx<0) return;
      dragIdx=idx; svgEl.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svgEl.addEventListener("pointermove",function(e){
      if(dragIdx<0) return;
      var xy=getXY(e), v=xyToVal(xy[0],xy[1],dragIdx);
      if(v!==vals[dragIdx]){
        vals[dragIdx]=v;
        if(panelEl&&activeAxisIdx===dragIdx){
          document.getElementById("radarPanelVal").textContent=v;
          document.getElementById("radarSlider").value=v;
        }
        draw();
        if(onChange) onChange(getValues());
      }
      e.preventDefault();
    });
    svgEl.addEventListener("pointerup",function(e){
      if(dragIdx>=0){ showPanel(dragIdx); dragIdx=-1; }
    });
    svgEl.addEventListener("pointercancel",function(){ dragIdx=-1; });
    svgEl.addEventListener("click",function(e){
      if(dragIdx>=0) return;
      var xy=getXY(e), idx=nearest(xy[0],xy[1]);
      if(idx>=0){ activeAxisIdx=idx; showPanel(idx); draw(); }
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
    function setShowCommunity(v) { showCompare=v; draw(); }

    draw();
    return { draw:draw, getValues:getValues, setValues:setValues, setShowCommunity:setShowCommunity };
  }

  /* ══════════════════════════════════════════════════════════════
     Readonly mini (note-detail)
     ══════════════════════════════════════════════════════════════ */
  function createReadonly(options) {
    var svgEl = document.getElementById(options.svgId);
    if (!svgEl) return null;
    var CX=120,CY=120,MAX_R=90,MIN_R=14;
    svgEl.setAttribute("viewBox","0 0 240 240");
    var vals=options.values||{};
    var showCommunity=options.showCommunity||false;
    var onAxisClick=options.onAxisClick||null;

    function draw() {
      svgEl.innerHTML="";
      for(var ring=1;ring<=5;ring++){
        var r=MIN_R+((MAX_R-MIN_R)*ring/5);
        app(svgEl,mkEl("polygon",{
          points:pts(CX,CY,function(){return r;},N),
          fill:ring===5?WARM_LIGHT:"none",stroke:"#E8E5E0","stroke-width":"0.5",
        }));
      }
      for(var i=0;i<N;i++){
        var ep=pol(CX,CY,MAX_R+2,aFor(i));
        app(svgEl,mkEl("line",{x1:CX,y1:CY,x2:ep[0],y2:ep[1],stroke:"#E8E5E0","stroke-width":"0.5"}));
      }
      if(showCommunity){
        app(svgEl,mkEl("polygon",{
          points:pts(CX,CY,function(j){return vToR(COMMUNITY[AXES[j]]||5,MIN_R,MAX_R);},N),
          fill:"none",stroke:COM_COLOR,"stroke-width":"1","stroke-dasharray":"4 3","stroke-linejoin":"round",
        }));
        app(svgEl,mkEl("polygon",{
          points:pts(CX,CY,function(j){return vToR(EXPERT[AXES[j]]||7,MIN_R,MAX_R);},N),
          fill:"none",stroke:EXP_COLOR,"stroke-width":"1","stroke-dasharray":"2 2","stroke-linejoin":"round",
        }));
      }
      app(svgEl,mkEl("polygon",{
        points:pts(CX,CY,function(j){return vToR(vals[AXES[j]]||5,MIN_R,MAX_R);},N),
        fill:WARM_LIGHT,stroke:WARM,"stroke-width":"1.5","stroke-linejoin":"round",
      }));
      for(var i=0;i<N;i++){
        (function(idx){
          var v=vals[AXES[idx]]||5;
          var hp=pol(CX,CY,vToR(v,MIN_R,MAX_R),aFor(idx));
          app(svgEl,mkEl("circle",{cx:hp[0],cy:hp[1],r:"5",fill:WARM,stroke:"#fff","stroke-width":"1.5"}));
          var nlp=pol(CX,CY,MAX_R+18,aFor(idx));
          var nt=mkEl("text",{
            x:nlp[0],y:nlp[1],"text-anchor":"middle","dominant-baseline":"central",
            "font-size":"10","font-weight":"500",fill:"#333",
            "font-family":"'Pretendard Variable',sans-serif",
          });
          if(onAxisClick){nt.setAttribute("cursor","pointer");nt.addEventListener("click",function(){onAxisClick(AXES[idx]);});}
          nt.textContent = AXES[idx]+" "+v;
          app(svgEl,nt);
        })(i);
      }
    }
    draw();
    return {draw:draw};
  }

  global.CoffeeRadar = {
    createInteractive: createInteractive,
    createReadonly:    createReadonly,
    AXES:              AXES,
    COMMUNITY:         COMMUNITY,
    EXPERT:            EXPERT,
  };

})(typeof window!=="undefined"?window:globalThis);
