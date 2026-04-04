/**
 * src/pages/recipe-detail.js
 * recipe-detail.html 인라인 스크립트 → ES Module
 */

import { esc } from '../modules/utils.js';

(function(){
  var CN=window.CoffeeNote;
  CN.renderBottomNav("notes");
  document.getElementById("btnBack").addEventListener("click",function(){if(history.length>1)history.back();else location.href="notes.html?tab=recipes";});
  function cell(l,v){return'<div class="rd-cell"><span class="rd-label">'+l+'</span><span class="rd-value">'+esc(v||"-")+'</span></div>';}

  var params=new URLSearchParams(location.search);
  var body=document.getElementById("recipeBody");

  // 두 가지 소스: 독립 레시피(id) 또는 노트 레시피(noteIdx)
  var recipe=null, noteRecord=null, noteIdx=-1;

  if(params.get("id")){
    recipe=CN.getRecipeById(params.get("id"));
  } else if(params.get("noteIdx")!=null){
    noteIdx=Number(params.get("noteIdx"));
    noteRecord=CN.getTastingRecords()[noteIdx];
    if(noteRecord&&noteRecord.recipe){
      recipe={
        title:(noteRecord.brewMethod||"레시피")+" — "+(noteRecord.coffeeName||""),
        tool:noteRecord.brewMethod,
        temp:noteRecord.recipe.temp,
        water:noteRecord.recipe.water,
        dose:noteRecord.recipe.dose,
        grind:noteRecord.recipe.grind,
        steps:noteRecord.recipe.steps||[],
        note:noteRecord.recipe.note,
        coffeeName:noteRecord.coffeeName,
        createdAt:noteRecord.createdAt,
        source:"from_note"
      };
    }
  }

  if(!recipe){body.innerHTML='<div class="empty">레시피를 찾을 수 없습니다.</div>';return;}
  document.getElementById("pageTitle").textContent=recipe.title||"레시피 상세";

  var date=recipe.createdAt?new Date(recipe.createdAt).toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"}):"";

  // 레시피 상세 렌더
  var html='<div class="detail-origin">';
  html+='<div class="detail-origin-title">'+esc(recipe.title||"")+'</div>';
  html+='<div class="caption" style="margin-top:6px">'+esc(recipe.tool||"")+'</div>';
  if(date) html+='<div class="caption">'+esc(date)+'</div>';
  html+='</div>';

  // 변수 그리드
  html+='<div class="recipe-detail-grid">'+cell("물 온도",recipe.temp)+cell("물 양",recipe.water)+cell("원두 양",recipe.dose)+cell("그라인딩",recipe.grind)+'</div>';

  // 추출 단계
  if(recipe.steps&&recipe.steps.length){
    html+='<h2 class="section-heading">추출 단계</h2>';
    html+=recipe.steps.map(function(s,i){
      return'<div class="pour-step"><div class="pour-num">'+(i+1)+'</div><div class="pour-info"><div class="pour-time">'+esc(s.time||"")+(s.amount?" · "+esc(s.amount):"")+'</div>'+(s.tip?'<div class="pour-tip">'+esc(s.tip)+'</div>':'')+'</div></div>';
    }).join("");
  }

  // 메모
  if(recipe.note){
    html+='<h2 class="section-heading">추출 메모</h2>';
    html+='<div class="card" style="padding:16px;font-size:14px;line-height:1.7;color:var(--text)">'+esc(recipe.note)+'</div>';
  }

  // 노트에서 온 레시피인 경우 → 센서리 노트 링크
  if(noteRecord){
    html+='<hr class="thin-rule"/>';
    html+='<h2 class="section-heading">이 레시피로 기록한 커피</h2>';
    html+='<div class="listCard card" style="cursor:pointer" id="linkToNote">';
    html+='<p class="card-title" style="font-size:15px">'+esc(noteRecord.coffeeName)+'</p>';
    var flavors=(noteRecord.tasteTags||[]).slice(0,3).join(" · ");
    if(flavors) html+='<p class="caption" style="margin-top:4px;color:var(--accent-warm)">'+esc(flavors)+'</p>';
    if(noteRecord.starRating) html+='<p class="caption" style="margin-top:2px">별점: '+noteRecord.starRating+'</p>';
    html+='</div>';
  }

  // 원두 정보 (있으면)
  if(recipe.coffeeName&&!noteRecord){
    html+='<hr class="thin-rule"/>';
    html+='<div class="caption" style="margin-top:8px">연결된 원두: '+esc(recipe.coffeeName)+'</div>';
  }

  // 수정/삭제 버튼
  html+='<div style="display:flex;gap:10px;margin-top:24px">';
  html+='<button type="button" class="btn-secondary" id="btnEditRecipe" style="flex:1">수정</button>';
  html+='<button type="button" id="btnDeleteRecipe" style="flex:0 0 auto;padding:16px 20px;background:none;border:1.5px solid #C04828;color:#C04828;font-family:Pretendard Variable,sans-serif;font-size:15px;font-weight:500;cursor:pointer">삭제</button>';
  html+='</div>';

  body.innerHTML=html;

  if(noteRecord){
    document.getElementById("linkToNote").addEventListener("click",function(){
      location.href="note-detail.html?idx="+noteIdx;
    });
  }

  // 수정
  document.getElementById("btnEditRecipe").addEventListener("click",function(){
    if(noteRecord){
      // 노트 레시피 → 센서리 노트 수정
      location.href="tasting.html?editIdx="+noteIdx;
    } else {
      // 독립 레시피 → 레시피 등록 화면에서 수정
      location.href="recipe-register.html?edit="+encodeURIComponent(params.get("id"));
    }
  });

  // 삭제
  document.getElementById("btnDeleteRecipe").addEventListener("click",function(){
    if(noteRecord){
      if(!confirm("이 센서리 노트의 레시피를 삭제하시겠습니까?\n(센서리 노트 자체는 유지됩니다)")) return;
      var list=CN.getTastingRecords();
      list[noteIdx].recipe=null;
      CN.saveToStorage(CN.STORAGE_KEYS.TASTING_RECORDS,list);
    } else {
      if(!confirm("이 레시피를 삭제하시겠습니까?")) return;
      var recipes=CN.getRecipes();
      var rid=params.get("id");
      var filtered=recipes.filter(function(r){return r.id!==rid;});
      CN.saveToStorage(CN.STORAGE_KEYS.RECIPES,filtered);
    }
    CN.showToast("삭제되었습니다");
    setTimeout(function(){location.href="notes.html?tab=recipes";},500);
  });
})();
