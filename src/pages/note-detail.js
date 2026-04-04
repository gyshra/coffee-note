/**
 * src/pages/note-detail.js
 * note-detail.html 인라인 스크립트 → ES Module
 */

import { esc } from '../modules/utils.js';

(function(){
  var CN=window.CoffeeNote;
  CN.renderBottomNav("notes");

  var params=new URLSearchParams(location.search);
  var ridx=Number(params.get("idx"));
  var records=CN.getTastingRecords();
  var record=records[ridx];

  document.getElementById("btnBack").addEventListener("click",function(){
    if(history.length>1)history.back();else location.href="notes.html";
  });

  if(!record){
    document.getElementById("detailBody").innerHTML='<div class="empty">기록을 찾을 수 없습니다.</div>';
    return;
  }

  var coffee=CN.getCoffeeByIndex(record.coffeeIndex);
  document.getElementById("detailTitle").textContent=record.coffeeName||"기록 상세";

  var STAR_PTS="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26";
  function miniStar(type){
    if(type==="full") return '<svg width="12" height="12" viewBox="0 0 24 24"><polygon points="'+STAR_PTS+'" fill="#8C7355" stroke="#8C7355"/></svg>';
    if(type==="half") return '<svg width="12" height="12" viewBox="0 0 24 24"><defs><clipPath id="hcd"><rect x="0" y="0" width="12" height="24"/></clipPath></defs><polygon points="'+STAR_PTS+'" fill="none" stroke="#E0E0E0" stroke-width="1.5"/><polygon points="'+STAR_PTS+'" fill="#8C7355" stroke="#8C7355" clip-path="url(#hcd)"/></svg>';
    return '<svg width="12" height="12" viewBox="0 0 24 24"><polygon points="'+STAR_PTS+'" fill="none" stroke="#E0E0E0" stroke-width="1.5"/></svg>';
  }

  function starsHtml(r){
    if(!r)return"";
    var rating=parseFloat(r);
    var h='<div class="sc-stars" style="margin-top:8px">';
    for(var i=1;i<=5;i++){
      if(rating>=i) h+=miniStar("full");
      else if(rating>=i-0.5) h+=miniStar("half");
      else h+=miniStar("empty");
    }
    h+='<span class="sc-stars-num">'+rating+'</span></div>';
    return h;
  }

  // 사진
  var photosHtml="";
  if(record.photos&&record.photos.length){
    photosHtml='<div class="detail-photos">'+record.photos.map(function(src){
      return'<img class="detail-photo" src="'+src+'" alt="사진"/>';
    }).join("")+'</div>';
  }

  // 원두 정보
  var originHtml="";
  if(coffee){
    function cell(label,val){return'<div class="do-cell"><span class="do-label">'+label+'</span><span class="do-value">'+esc(val||"-")+'</span></div>';}
    originHtml='<div class="detail-origin">'+
      '<div class="detail-origin-title">'+esc(record.coffeeName)+'</div>'+
      '<div class="detail-origin-roaster">'+esc(coffee.roaster||"")+'</div>'+
      starsHtml(record.starRating)+
      '<div class="detail-origin-grid">'+
      cell("산지",coffee.region||coffee.country)+
      cell("농장",coffee.farm)+
      cell("고도",coffee.altitude)+
      cell("가공방식",CN.formatProcessDisplay(coffee))+
      cell("품종",coffee.variety)+
      cell("가격대",coffee.price)+
      '</div></div>';
  }

  // 향미 칩
  var flavors=record.flavorSelections||[];
  var flavorChips=flavors.map(function(f){
    return'<span class="detail-flavor-chip"><span class="detail-flavor-dot" style="background:'+(f.color||"#8C7355")+'"></span>'+esc(f.ko||f)+'</span>';
  }).join("");

  // 링크 영역
  var memoPreview=record.memo?esc(record.memo).substring(0,30)+"...":"메모 없음";
  var recipePreview="";
  if(record.recipe){
    recipePreview=[record.brewMethod,record.recipe.temp,record.recipe.dose].filter(Boolean).join(" · ")||"레시피 있음";
  }else{
    recipePreview=record.brewMethod||"없음";
  }
  var locationPreview=record.location||"없음";

  var arrowSvg='<svg class="dl-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>';

  var body=document.getElementById("detailBody");
  body.innerHTML=
    photosHtml+
    originHtml+
    '<hr class="thin-rule"/>'+
    '<div class="detail-chart-area">'+
    '<div class="detail-flavors">'+flavorChips+'</div>'+
    '<div class="detail-pentagon" id="detailPentagon"><svg id="detailPentaSvg" xmlns="http://www.w3.org/2000/svg"></svg></div>'+
    '<div id="pentaMemoDisplay" style="display:none"></div>'+
    '</div>'+
    '<div class="detail-links">'+
    '<button type="button" class="detail-link-item" id="linkOverall"><span class="dl-label">오버롤</span><span class="dl-preview">'+esc(memoPreview)+'</span>'+arrowSvg+'</button>'+
    '<button type="button" class="detail-link-item" id="linkRecipe"><span class="dl-label">레시피</span><span class="dl-preview">'+esc(recipePreview)+'</span>'+arrowSvg+'</button>'+
    '<div id="recipeInlineDetail" style="display:none"></div>'+
    '<button type="button" class="detail-link-item" id="linkLocation"><span class="dl-label">장소</span><span class="dl-preview">'+esc(locationPreview)+'</span>'+arrowSvg+'</button>'+
    '</div>'+
    '<div style="display:flex;gap:10px;margin-top:24px">'+
    '<button type="button" class="btn-primary" id="btnViewCard" style="flex:1">센서리 카드</button>'+
    '<button type="button" class="btn-secondary" id="btnEditNote" style="flex:1">수정</button>'+
    '<button type="button" id="btnDeleteNote" style="flex:0 0 auto;padding:16px 20px;background:none;border:1.5px solid #C04828;color:#C04828;font-family:Pretendard Variable,sans-serif;font-size:15px;font-weight:500;cursor:pointer">삭제</button>'+
    '</div>';

  // 읽기전용 레이더 + 축 클릭 메모
  var activeAxis=null;
  CoffeeRadar.createReadonly({
    svgId:"detailPentaSvg",
    size:200,
    values:record.baseScores||record.scores||{},
    onAxisClick:function(axis){
      var display=document.getElementById("pentaMemoDisplay");
      if(activeAxis===axis){display.style.display="none";activeAxis=null;return;}
      activeAxis=axis;
      var baseMemos=record.baseMemos||{};
      var baseScores=record.baseScores||record.scores||{};
      var memo=baseMemos[axis]||"";
      var score=baseScores[axis]||5;
      display.style.display="block";
      display.innerHTML=
        '<div class="penta-memo-display">'+
        '<div class="pm-header"><span class="pm-label">'+esc(axis)+'</span><span class="pm-score">'+score+'</span></div>'+
        '<p class="pm-content">'+(memo?esc(memo):'<span style="color:var(--text-sub)">메모가 없습니다</span>')+'</p>'+
        '</div>';
    }
  });

  // 오버롤 수정
  document.getElementById("linkOverall").addEventListener("click",function(){
    document.getElementById("overallEdit").value=record.memo||"";
    var sheet=document.getElementById("overallSheet");
    sheet.classList.add("open");sheet.setAttribute("aria-hidden","false");
  });
  document.getElementById("overallCloseBtn").addEventListener("click",closeSheet);
  document.getElementById("overallSheet").addEventListener("click",function(e){if(e.target===this)closeSheet();});
  document.getElementById("overallSaveBtn").addEventListener("click",function(){
    record.memo=document.getElementById("overallEdit").value.trim();
    records[ridx]=record;
    CN.saveToStorage(CN.STORAGE_KEYS.TASTING_RECORDS,records);
    CN.showToast("저장되었습니다");
    closeSheet();
    // 프리뷰 업데이트
    document.querySelector("#linkOverall .dl-preview").textContent=record.memo?record.memo.substring(0,30)+"...":"메모 없음";
  });
  function closeSheet(){var s=document.getElementById("overallSheet");s.classList.remove("open");s.setAttribute("aria-hidden","true");}

  // 레시피 → 인라인 상세 토글
  document.getElementById("linkRecipe").addEventListener("click",function(){
    var area=document.getElementById("recipeInlineDetail");
    if(area.style.display!=="none"){area.style.display="none";return;}
    var rec=record.recipe;
    var bm=record.brewMethod||"";
    if(!rec&&!bm){CN.showToast("레시피 정보가 없습니다");return;}
    function cell(l,v){return'<div class="rd-cell"><span class="rd-label">'+l+'</span><span class="rd-value">'+esc(v||"-")+'</span></div>';}
    var html='<div style="padding:16px 0;border-bottom:1px solid var(--border)">';
    if(bm)html+='<p style="font-size:14px;font-weight:600;color:var(--text);margin:0 0 8px">'+esc(bm)+'</p>';
    if(rec){
      html+='<div class="recipe-detail-grid">'+cell("물 온도",rec.temp)+cell("물 양",rec.water)+cell("원두 양",rec.dose)+cell("그라인딩",rec.grind)+'</div>';
      if(rec.time)html+='<p style="font-size:13px;color:var(--text-sub);margin:8px 0">추출 시간: '+esc(rec.time)+'</p>';
      if(rec.steps&&rec.steps.length){
        html+=rec.steps.map(function(s,i){return'<div class="pour-step"><div class="pour-num">'+(i+1)+'</div><div class="pour-info"><div class="pour-time">'+esc(s.time||"")+(s.amount?" · "+esc(s.amount):"")+'</div>'+(s.tip?'<div class="pour-tip">'+esc(s.tip)+'</div>':'')+'</div></div>';}).join("");
      }
      if(rec.note)html+='<p style="font-size:13px;color:var(--text-sub);margin:8px 0;line-height:1.6">'+esc(rec.note)+'</p>';
    } else {
      html+='<p style="font-size:13px;color:var(--text-sub)">상세 레시피가 기록되지 않았습니다</p>';
    }
    html+='</div>';
    area.innerHTML=html;
    area.style.display="block";
  });

  // 장소
  document.getElementById("linkLocation").addEventListener("click",function(){
    if(record.location) CN.showToast("지도 연동 준비 중");
    else CN.showToast("장소 정보가 없습니다");
  });

  // 센서리 카드 보기
  document.getElementById("btnViewCard").addEventListener("click",function(){
    var cardUrl=CardGenerator.generate(record);
    var overlay=document.getElementById("cardOverlay");
    document.getElementById("cardPreview").src=cardUrl;
    overlay.style.display="flex";
    document.getElementById("btnShareCard").onclick=function(){CardGenerator.share(cardUrl);};
    document.getElementById("btnCloseCard").onclick=function(){overlay.style.display="none";};
  });

  // 수정 → tasting.html?editIdx=N
  document.getElementById("btnEditNote").addEventListener("click",function(){
    location.href="tasting.html?editIdx="+ridx;
  });

  // 삭제
  document.getElementById("btnDeleteNote").addEventListener("click",function(){
    if(!confirm("이 센서리 노트를 삭제하시겠습니까?")) return;
    var list=CN.getTastingRecords();
    list.splice(ridx,1);
    CN.saveToStorage(CN.STORAGE_KEYS.TASTING_RECORDS,list);
    CN.showToast("삭제되었습니다");
    setTimeout(function(){location.href="notes.html";},500);
  });
})();
