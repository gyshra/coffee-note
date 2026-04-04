/**
 * src/ui/radar.js
 * Coffee Note — Radar Chart v3
 * (tasting-radar.js의 ES Module 버전)
 *
 * 버그 수정: createReadonly()에서 EXPERT_VALS 참조 오류 →
 *   EXPERT_VALS는 createInteractive() 클로저 내 지역 변수였음.
 *   createReadonly()는 모듈 레벨의 EXPERT 상수를 직접 사용하도록 수정.
 *
 * window.CoffeeRadar = { createInteractive, createReadonly, AXES, COMMUNITY, EXPERT } 로 노출됨
 */

var NS = "http://www.w3.org/2000/svg";
export var AXES = ["아로마","산미","단맛","바디감","여운"];
var N = 5;

export var COMMUNITY = { 아로마:6.5, 산미:6.0, 단맛:5.8, 바디감:5.5, 여운:6.2 };
export var EXPERT    = { 아로마:8.2, 산미:8.5, 단맛:7.0, 바디감:7.5, 여운:8.0 };

var WARM       = "#8C7355";
var WARM_LIGHT = "rgba(140,115,85,0.12)";
var EXP_COLOR  = "#121212";
var COM_COLOR  = "#BBBBBB";

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

export function createInteractive(options) {
  var svgEl = document.getElementById(options.svgId);
  if (!svgEl) return null;

  var CX=180, CY=180, MAX_R=140, MIN_R=20;
  svgEl.setAttribute("viewBox","0 0 360 360");
  svgEl.style.touchAction = "none";
  svgEl.style.userSelect  = "none";

  var vals = [5,5,5,5,5];
  var showCompare = false;
  var dragIdx     = -1;
  var onChange    = options.onChange || null;
  var panelEl     = null;
  var activeAxisIdx = -1;

  var aiScores = options.aiScores || null;
  if (!aiScores) {
    try {
      var aiStr = sessionStorage.getItem("ai_prediction");
      if (aiStr) {
        var aiData = JSON.parse(aiStr);
        if (aiData.scores) aiScores = aiData.scores;
      }
    } catch(e) {}
  }

  var EXPERT_VALS = aiScores
    ? { 아로마: aiScores["아로마"]||7, 산미: aiScores["산미"]||7, 단맛: aiScores["단맛"]||6, 바디감: aiScores["바디감"]||5, 여운: aiScores["여운"]||7 }
    : EXPERT;

  function getOrCreatePanel() {
    if (panelEl) return panelEl;
    panelEl = document.getElementById("radarPanel");
    if (!panelEl) {
      panelEl = document.createElement("div");
      panelEl.id = "radarPanel";
      panelEl.style.cssText = "margin-top:12px;padding:14px 16px;background:#F8F6F3;display:none;";
      panelEl.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<span id="radarPanelLabel" style="font-size:14px;font-weight:600;color:#121212"></span>' +
          '<span id="radarPanelVal" style="font-size:22px;font-weight:700;color:'+WARM+'"></span>' +
        '</div>' +
        '<input type="range" id="radarSlider" min="1" max="10" step="1" style="width:100%;accent-color:'+WARM+'">' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:4px">' +
          '<span>1</span><span>5</span><span>10</span>' +
        '</div>';
      svgEl.parentElement.insertBefore(panelEl, svgEl.nextSibling);
    }
    var slider = document.getElementById("radarSlider");
    if (slider) {
      slider.addEventListener("input", function() {
        if (activeAxisIdx < 0) return;
        vals[activeAxisIdx] = +this.value;
        var pv = document.getElementById("radarPanelVal");
        if (pv) pv.textContent = this.value;
        draw();
        if (onChange) onChange(getValues());
      });
    }
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

  var comparePanelEl = null;
  function getOrCreateComparePanel() {
    if (comparePanelEl) return comparePanelEl;
    comparePanelEl = document.getElementById("radarComparePanel");
    if (!comparePanelEl) {
      comparePanelEl = document.createElement("div");
      comparePanelEl.id = "radarComparePanel";
      comparePanelEl.style.cssText = "margin-top:16px;display:none;";
      svgEl.parentElement.appendChild(comparePanelEl);
    }
    return comparePanelEl;
  }

  function updateComparePanel() {
    if (!showCompare) {
      if (comparePanelEl) comparePanelEl.style.display = "none";
      return;
    }
    var cp = getOrCreateComparePanel();
    cp.style.display = "block";

    var expLabel = aiScores ? "AI 예측 (이 원두)" : "전문가 CQI";

    var legendHtml =
      '<div style="display:flex;gap:14px;flex-wrap:wrap;padding:0 0 10px;border-bottom:0.5px solid #E0E0E0;margin-bottom:10px">' +
        '<span style="font-size:10px;font-weight:700;color:#121212;display:flex;align-items:center;gap:4px">' +
          '<span style="display:inline-block;width:16px;height:2px;background:#121212"></span>내 기록</span>' +
        '<span style="font-size:10px;font-weight:700;color:#8C7355;display:flex;align-items:center;gap:4px">' +
          '<svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#8C7355" stroke-width="1.5" stroke-dasharray="4,2"/></svg>커뮤니티 평균</span>' +
        '<span style="font-size:10px;font-weight:700;color:#555;display:flex;align-items:center;gap:4px">' +
          '<svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#555" stroke-width="1.5" stroke-dasharray="2,2"/></svg>' + expLabel + '</span>' +
      '</div>';

    var barsHtml = AXES.map(function(ax, i) {
      var my  = vals[i];
      var com = COMMUNITY[ax] || 5;
      var exp = EXPERT_VALS[ax]    || 7;
      var dCom = my - com, dExp = my - exp;
      var dcSign = dCom >= 0 ? "+" : "", deSign = dExp >= 0 ? "+" : "";
      var dcCol  = dCom > 0.3 ? "#2d6a2d" : dCom < -0.3 ? "#A0522D" : "#888";
      var deCol  = dExp > 0.3 ? "#2d6a2d" : dExp < -0.3 ? "#A0522D" : "#888";
      return '<div class="cmp-bar-row">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline">' +
          '<span style="font-size:12px;font-weight:600;color:#121212">' + ax + '</span>' +
          '<span style="font-size:11px;color:#888">내: <strong style="color:#121212">' + my + '</strong>' +
          '&nbsp;·&nbsp;<span style="color:'+dcCol+'">커뮤니티 ' + dcSign + dCom.toFixed(1) + '</span>' +
          '&nbsp;·&nbsp;<span style="color:'+deCol+'">전문가 ' + deSign + dExp.toFixed(1) + '</span></span>' +
        '</div>' +
        '<div class="cmp-bar-track">' +
          '<div class="cmp-bar-avg" style="width:' + (com/10*100).toFixed(1) + '%"></div>' +
          '<div class="cmp-bar-me"  style="width:' + (my /10*100).toFixed(1) + '%"></div>' +
        '</div>' +
      '</div>';
    }).join("");

    var maxDiff=0, maxIdx=0;
    vals.forEach(function(v,i){ var d=Math.abs(v-(EXPERT_VALS[AXES[i]]||7)); if(d>maxDiff){maxDiff=d;maxIdx=i;} });
    var insightHtml = maxDiff > 0.5 ?
      '<div class="cmp-insight">' +
        AXES[maxIdx] + '를 전문가보다 <strong>' +
        (vals[maxIdx] > (EXPERT_VALS[AXES[maxIdx]]||7) ? '+' : '') +
        (vals[maxIdx]-(EXPERT_VALS[AXES[maxIdx]]||7)).toFixed(1) + '</strong>점 다르게 느끼셨네요.' +
        '<br><span style="color:#8C7355;font-size:12px">→ 다음 추출 시 물 온도를 1–2도 조정해 보세요.</span>' +
      '</div>' : '';

    cp.innerHTML = legendHtml + barsHtml + insightHtml;
  }

  function draw() {
    svgEl.innerHTML = "";

    for (var ring=1; ring<=5; ring++) {
      var r = MIN_R+((MAX_R-MIN_R)*ring/5);
      var pg = mkEl("polygon",{
        points: pts(CX,CY,function(){return r;},N),
        fill: ring===5 ? WARM_LIGHT : "none",
        stroke: "#E8E5E0", "stroke-width":"0.8",
      });
      app(svgEl, pg);
    }

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

    for (var i=0; i<N; i++) {
      var ep = pol(CX,CY,MAX_R+6,aFor(i));
      app(svgEl, mkEl("line",{
        x1:CX,y1:CY, x2:ep[0],y2:ep[1],
        stroke:"#E0DDD8","stroke-width":"0.8",
      }));
    }

    if (showCompare) {
      app(svgEl, mkEl("polygon",{
        points: pts(CX,CY,function(j){return vToR(COMMUNITY[AXES[j]]||5,MIN_R,MAX_R);},N),
        fill:"none", stroke:COM_COLOR, "stroke-width":"1.5",
        "stroke-dasharray":"6 4", "stroke-linejoin":"round",
      }));
      app(svgEl, mkEl("polygon",{
        points: pts(CX,CY,function(j){return vToR(EXPERT_VALS[AXES[j]]||7,MIN_R,MAX_R);},N),
        fill:"none", stroke:EXP_COLOR, "stroke-width":"1.5",
        "stroke-dasharray":"3 3", "stroke-linejoin":"round",
      }));
    }

    app(svgEl, mkEl("polygon",{
      points: pts(CX,CY,function(j){return vToR(vals[j],MIN_R,MAX_R);},N),
      fill: WARM_LIGHT, stroke:WARM, "stroke-width":"2.5", "stroke-linejoin":"round",
    }));

    for (var i=0; i<N; i++) {
      (function(idx) {
        var angle = aFor(idx);
        var hr    = vToR(vals[idx],MIN_R,MAX_R);
        var hp    = pol(CX,CY,hr,angle);

        app(svgEl, mkEl("circle",{
          cx:hp[0],cy:hp[1],r:"22",fill:"transparent",
          cursor:"grab","data-idx":idx,
        }));
        app(svgEl, mkEl("circle",{
          cx:hp[0],cy:hp[1],r:"16",
          fill: activeAxisIdx===idx ? "#5C4A35" : WARM,
          stroke:"#fff","stroke-width":"2.5",
          cursor:"grab","pointer-events":"none",
        }));

        var vt = mkEl("text",{
          x:hp[0],y:hp[1],"text-anchor":"middle","dominant-baseline":"central",
          "font-size":"11","font-weight":"700",fill:"#fff",
          "font-family":"'Pretendard Variable',sans-serif","pointer-events":"none",
        });
        vt.textContent = vals[idx];
        app(svgEl, vt);

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
  return { draw, getValues, setValues, setShowCommunity };
}

export function createReadonly(options) {
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
      // 수정: EXPERT_VALS → EXPERT (모듈 레벨 상수)
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
  return { draw };
}

// window.CoffeeRadar 등록 (기존 호출자 호환)
window.CoffeeRadar = { createInteractive, createReadonly, AXES, COMMUNITY, EXPERT };
