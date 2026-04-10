/**
 * src/pages/recipe-register.js
 * recipe-register.html 인라인 스크립트 → ES Module
 */

(function(){
  var CN=window.CoffeeNote;
  CN.renderBottomNav("notes");
  document.getElementById("btnBack").addEventListener("click",function(){if(history.length>1)history.back();else location.href="notes.html?tab=recipes";});

  var params=new URLSearchParams(location.search);
  var editId=params.get("edit");
  var editRecipe=editId?CN.getRecipeById(editId):null;
  var isEdit=!!editRecipe;

  if(isEdit){
    document.querySelector(".title").textContent="레시피 수정";
    document.getElementById("btnSave").textContent="수정 저장";
  }

  var TOOLS=['V60','칼리타','케멕스','에어로프레스','프렌치프레스','에스프레소 머신','모카포트','콜드브루','콜드드립','클레버','하리오 스위치','사이폰','터키식'];
  var selectedTool='';
  var tc=document.getElementById("toolChips");
  tc.innerHTML=TOOLS.map(function(t){return'<button type="button" class="chip" data-tool="'+t+'">'+t+'</button>';}).join("");
  tc.querySelectorAll(".chip").forEach(function(b){b.addEventListener("click",function(){tc.querySelectorAll(".chip").forEach(function(x){x.classList.remove("selected");});b.classList.add("selected");selectedTool=b.getAttribute("data-tool");});});

  // 원두 검색 버튼
  document.getElementById("btnSearchCoffee").addEventListener("click",function(){
    CN.openCoffeeSearch(function(result){
      document.getElementById("rCoffee").value=result.coffee.name||"";
    });
  });

  var stepCount=0;
  var stepsWrap=document.getElementById("pourSteps");
  function addStep(){
    stepCount++;
    var div=document.createElement("div");div.className="pour-step-input";div.setAttribute("data-step",stepCount);
    div.innerHTML='<div class="psi-header"><span class="psi-num">'+stepCount+'회차</span><button type="button" class="psi-remove">&times;</button></div><div class="psi-row"><input type="text" class="psi-time" placeholder="시간 (예: 0:00~0:30)"/><input type="text" class="psi-amount" placeholder="물 양 (예: 50ml)"/></div><textarea class="psi-tip" placeholder="이 단계의 팁"></textarea>';
    div.querySelector(".psi-remove").addEventListener("click",function(){div.remove();renumber();});
    stepsWrap.appendChild(div);
  }
  function renumber(){
    stepCount=0;stepsWrap.querySelectorAll(".pour-step-input").forEach(function(el){stepCount++;el.querySelector(".psi-num").textContent=stepCount+"회차";});
  }

  // 수정 모드: 기존 데이터 프리필
  if(isEdit){
    document.getElementById("rTitle").value=editRecipe.title||"";
    document.getElementById("rCoffee").value=editRecipe.coffeeName||"";
    document.getElementById("rTemp").value=editRecipe.temp||"";
    document.getElementById("rWater").value=editRecipe.water||"";
    document.getElementById("rDose").value=editRecipe.dose||"";
    document.getElementById("rGrind").value=editRecipe.grind||"";
    document.getElementById("rNote").value=editRecipe.note||"";
    // 도구 선택
    if(editRecipe.tool){var tc2=document.querySelector('[data-tool="'+editRecipe.tool+'"]');if(tc2){tc2.classList.add("selected");selectedTool=editRecipe.tool;}}
    // 단계 프리필
    if(editRecipe.steps&&editRecipe.steps.length){
      editRecipe.steps.forEach(function(s){
        addStep();
        var last=stepsWrap.querySelector(".pour-step-input:last-child");
        if(last){last.querySelector(".psi-time").value=s.time||"";last.querySelector(".psi-amount").value=s.amount||"";last.querySelector(".psi-tip").value=s.tip||"";}
      });
    } else { addStep(); }
  } else {
    addStep(); // 신규: 1회차 기본
  }

  document.getElementById("btnAddStep").addEventListener("click",function(){if(stepCount<10)addStep();else CN.showToast("최대 10단계");});

  document.getElementById("btnSave").addEventListener("click",function(){
    var title=document.getElementById("rTitle").value.trim();
    if(!title){CN.showToast("제목을 입력하세요");return;}
    if(!selectedTool){CN.showToast("추출 도구를 선택하세요");return;}

    var rawSteps=[];
    stepsWrap.querySelectorAll(".pour-step-input").forEach(function(el){
      rawSteps.push({time:el.querySelector(".psi-time").value.trim(),amount:el.querySelector(".psi-amount").value.trim(),tip:el.querySelector(".psi-tip").value.trim()});
    });

    // recipe.html 브루 패널이 기대하는 스키마로 스텝 정규화
    var normalizedSteps=rawSteps.map(function(s,i){
      var waterMl=parseFloat(s.amount)||null;
      var timeEnd=s.time.includes('~')?s.time.split('~').pop().trim():(s.time||'—');
      return{
        action: s.amount?(s.amount+' 붓기'):('스텝 '+(i+1)),
        detail: s.tip||'',
        time:   timeEnd,
        waterMl:waterMl,
        _timeRange:s.time,  // 원본 보존 (recipe-detail용)
      };
    });

    var isPublic=document.getElementById("rPublic")?document.getElementById("rPublic").checked:false;
    var temp=document.getElementById("rTemp").value.trim();
    var grind=document.getElementById("rGrind").value.trim();

    var data={
      // 원본 필드 (recipe-detail, 역호환)
      title:   title,
      coffeeName: document.getElementById("rCoffee").value.trim(),
      tool:    selectedTool,
      temp:    temp,
      water:   document.getElementById("rWater").value.trim(),
      dose:    document.getElementById("rDose").value.trim(),
      grind:   grind,
      note:    document.getElementById("rNote").value.trim(),
      source:  "user_recipe",
      // recipe.html 브루 패널 호환 별칭
      name:       title,
      brew_method:selectedTool,
      dripper:    selectedTool,
      water_temp: temp,
      grind_size: grind,
      by:         '나',
      badge:      'mine',
      is_public:  isPublic,
      // 정규화된 스텝 (타이머 호환)
      steps: normalizedSteps,
    };

    if(isEdit){
      CN.updateRecipe(editId,data);
      CN.showToast("레시피가 수정되었습니다!");
    } else {
      CN.addRecipe(data);
      CN.showToast("레시피가 저장되었습니다!");
    }

    // Supabase 클라우드 동기화 (설정된 경우에만, 실패해도 로컬 저장은 완료)
    if(window.SupaDB){
      window.SupaDB.saveRecipe(data).catch(function(){});
    }

    setTimeout(function(){location.href="notes.html?tab=recipes";},600);
  });
})();
