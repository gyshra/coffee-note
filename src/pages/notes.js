/**
 * src/pages/notes.js
 * notes.html 인라인 스크립트 → ES Module
 */

import { esc } from '../modules/utils.js';

(function(){
  var CN=window.CoffeeNote;
  CN.renderBottomNav("notes");

  var currentTab="sensory";
  var content=document.getElementById("tabContent");
  var STAR_PTS="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26";
  function miniStar(type){
    if(type==="full") return '<svg width="12" height="12" viewBox="0 0 24 24"><polygon points="'+STAR_PTS+'" fill="#8C7355" stroke="#8C7355"/></svg>';
    if(type==="half") return '<svg width="12" height="12" viewBox="0 0 24 24"><defs><clipPath id="hc"><rect x="0" y="0" width="12" height="24"/></clipPath></defs><polygon points="'+STAR_PTS+'" fill="none" stroke="#E0E0E0" stroke-width="1.5"/><polygon points="'+STAR_PTS+'" fill="#8C7355" stroke="#8C7355" clip-path="url(#hc)"/></svg>';
    return '<svg width="12" height="12" viewBox="0 0 24 24"><polygon points="'+STAR_PTS+'" fill="none" stroke="#E0E0E0" stroke-width="1.5"/></svg>';
  }

  function starsHtml(rating){
    if(!rating)return"";
    var r=parseFloat(rating);
    var h='<div class="sc-stars">';
    for(var i=1;i<=5;i++){
      if(r>=i) h+=miniStar("full");
      else if(r>=i-0.5) h+=miniStar("half");
      else h+=miniStar("empty");
    }
    h+='<span class="sc-stars-num">'+r+'</span></div>';
    return h;
  }

  function renderTab(){
    if(currentTab==="sensory") renderSensory();
    else if(currentTab==="beans") renderBeans();
    else if(currentTab==="recipes") renderRecipes();
  }

  function renderSensory(){
    var records=CN.getTastingRecords();
    var newBtn='<button class="btn-secondary" style="margin-bottom:16px;width:auto;padding:10px 18px;font-size:13px" onclick="location.href=\'tasting.html\'">+ 새 노트 작성</button>';
    if(!records.length){content.innerHTML=newBtn+'<div class="empty">아직 센서리 기록이 없습니다.<br/>새 노트를 작성해보세요.</div>';return;}
    content.innerHTML=newBtn+records.map(function(r,i){
      var coffee=CN.getCoffeeByIndex(r.coffeeIndex);
      var country=(coffee&&coffee.country)||"";
      var flagUrl=CN.getFlagUrl(country);
      var silhouette=CN.getCountrySilhouette(country);
      var domColor=CN.getDominantColor(r);
      var flavors=(r.flavorSelections||r.tasteTags||[]).slice(0,4);
      var flavorStr=flavors.map(function(f){return typeof f==="string"?f:f.ko;}).join(" · ");
      var date=r.createdAt?new Date(r.createdAt).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\. /g,".").replace(/\.$/,""):"";

      return '<div class="sensory-card" data-ridx="'+i+'">'+
        '<div class="sc-color-bar" style="background:'+esc(domColor)+'"></div>'+
        '<div class="sc-content">'+
        '<div class="sc-title-row"><span class="sc-title">'+esc(r.coffeeName)+'</span>'+
        (country?'<img class="sc-flag" src="'+esc(flagUrl)+'" alt="'+esc(country)+'" width="16" height="12"/>':"")+
        '</div>'+
        starsHtml(r.starRating)+
        '<div class="sc-flavors">'+esc(flavorStr)+'</div>'+
        (r.location?'<div class="sc-location">'+esc(r.location)+'</div>':"")+
        '<div class="sc-date">'+esc(date)+'</div>'+
        '</div>'+
        '<div class="sc-country-map">'+silhouette+'</div>'+
        '</div>';
    }).join("");

    content.querySelectorAll(".sensory-card").forEach(function(card){
      card.addEventListener("click",function(){
        var idx=card.getAttribute("data-ridx");
        location.href="note-detail.html?idx="+idx;
      });
    });
  }

  function renderBeans(){
    var coffees=CN.getCoffees();
    var userBeans=[];
    coffees.forEach(function(c,i){if(c.source==="user_created")userBeans.push({coffee:c,index:i});});
    var html='<button class="btn-secondary" style="margin-bottom:16px;width:auto;padding:10px 18px;font-size:13px" onclick="location.href=\'register-coffee.html\'">+ 새 원두 등록</button>';
    if(!userBeans.length){
      html+='<div class="empty">직접 등록한 원두가 없습니다.</div>';
    } else {
      html+=userBeans.map(function(item){
        var c=item.coffee,ri=item.index;
        return '<div class="listCard card" style="padding:14px 16px">'+
          '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
          '<div style="flex:1;cursor:pointer" data-cidx="'+ri+'"><p class="card-title">'+esc(c.name)+'</p>'+
          '<p class="caption" style="margin-top:4px">'+esc(c.roaster||"")+" · "+esc(CN.formatProcessDisplay(c))+'</p></div>'+
          '<div style="display:flex;gap:6px;flex-shrink:0">'+
          '<button type="button" class="btn-secondary" style="width:auto;padding:6px 12px;font-size:12px" data-bedit="'+ri+'">수정</button>'+
          '<button type="button" style="width:auto;padding:6px 12px;font-size:12px;background:none;border:1px solid #C04828;color:#C04828;cursor:pointer;font-family:Pretendard Variable,sans-serif" data-bdel="'+ri+'">삭제</button>'+
          '</div></div></div>';
      }).join("");
    }
    content.innerHTML=html;
    content.querySelectorAll("[data-cidx]").forEach(function(el){
      el.addEventListener("click",function(){location.href="index.html?coffeeId="+el.getAttribute("data-cidx")+"&expand=1";});
    });
    content.querySelectorAll("[data-bedit]").forEach(function(btn){
      btn.addEventListener("click",function(e){e.stopPropagation();location.href="register-coffee.html?edit="+btn.getAttribute("data-bedit");});
    });
    content.querySelectorAll("[data-bdel]").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.stopPropagation();
        if(!confirm("이 원두를 삭제하시겠습니까?"))return;
        var ci=Number(btn.getAttribute("data-bdel"));
        var list=CN.getCoffees();list.splice(ci,1);CN.saveCoffees(list);
        CN.showToast("삭제되었습니다");renderBeans();
      });
    });
  }

  function renderRecipes(){
    var standalone=CN.getRecipes().map(function(r){return{id:r.id,title:r.title,tool:r.tool,temp:r.temp,water:r.water,dose:r.dose,coffeeName:r.coffeeName,createdAt:r.createdAt,source:"standalone",href:"recipe-detail.html?id="+encodeURIComponent(r.id)};});
    var allRecords=CN.getTastingRecords();
    var fromNotes=allRecords.filter(function(r){return r.recipe&&(r.recipe.temp||r.recipe.water||r.recipe.dose||r.recipe.steps);}).map(function(r){
      var idx=allRecords.indexOf(r);
      return{id:"note_"+idx,title:(r.brewMethod||"레시피")+" — "+(r.coffeeName||""),tool:r.brewMethod,temp:r.recipe.temp,water:r.recipe.water,dose:r.recipe.dose,coffeeName:r.coffeeName,createdAt:r.createdAt,source:"from_note",href:"recipe-detail.html?noteIdx="+idx};
    });
    var all=standalone.concat(fromNotes);
    all.sort(function(a,b){return new Date(b.createdAt||0)-new Date(a.createdAt||0);});
    var html='<button class="btn-secondary" style="margin-bottom:16px;width:auto;padding:10px 18px;font-size:13px" onclick="location.href=\'recipe-register.html\'">+ 새 레시피 등록</button>';
    if(!all.length){
      html+='<div class="empty">레시피가 없습니다.</div>';
    } else {
      html+=all.map(function(r){
        var meta=[r.tool,r.temp,r.dose].filter(Boolean).join(" · ");
        var date=r.createdAt?new Date(r.createdAt).toLocaleDateString("ko-KR"):"";
        return'<div class="listCard card" style="cursor:pointer" onclick="location.href=\''+r.href+'\'"><p class="card-title" style="font-size:15px">'+esc(r.title)+'</p><p class="caption" style="margin-top:4px">'+esc(meta)+'</p><p class="caption">'+esc(date)+'</p></div>';
      }).join("");
    }
    content.innerHTML=html;
  }

  // 탭 전환
  document.getElementById("tabBar").querySelectorAll(".tabBtn").forEach(function(btn){
    btn.addEventListener("click",function(){
      document.getElementById("tabBar").querySelectorAll(".tabBtn").forEach(function(b){b.classList.remove("active");});
      btn.classList.add("active");
      currentTab=btn.getAttribute("data-tab");
      renderTab();
    });
  });

  // URL 파라미터 탭
  var params=new URLSearchParams(location.search);
  var tabParam=params.get("tab");
  if(tabParam&&["sensory","beans","recipes"].indexOf(tabParam)>=0){
    currentTab=tabParam;
    document.getElementById("tabBar").querySelectorAll(".tabBtn").forEach(function(b){
      b.classList.toggle("active",b.getAttribute("data-tab")===currentTab);
    });
  }

  renderTab();
})();
