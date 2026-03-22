/**
 * Coffee Note — Sensory Card Generator
 * Pantone-poster aesthetic: clean color block + minimal typography
 * Generates shareable card image (1080×1350 for Instagram)
 */
(function(global) {
  "use strict";

  var W = 1080, H = 1350;
  var CN = null;

  function getColor(record) {
    var sels = record.flavorSelections || [];
    var ints = record.flavorIntensities || {};
    var CAT = {
      Fruity:"#E83D51", Floral:"#E75480", Sweet:"#F19A38",
      "Nutty/Cocoa":"#8B6A3E", Spices:"#A0522D", Roasted:"#7B5B3A",
      "Green/Vegetative":"#5A9E6F", "Sour/Fermented":"#E8A836", Other:"#7BAFB0"
    };
    if (!sels.length) return "#121212";
    // 가장 강한 향미의 카테고리 색
    var best = sels[0];
    var bestVal = 0;
    sels.forEach(function(f) {
      var v = ints[f.en] || 5;
      if (v > bestVal) { bestVal = v; best = f; }
    });
    return CAT[best.category] || best.color || "#121212";
  }

  function drawRadar(ctx, cx, cy, r, values, color) {
    var axes = ["아로마","산미","단맛","바디감","여운"];
    var n = axes.length;
    function angle(i) { return (Math.PI*2*i/n) - Math.PI/2; }
    function pol(rad, a) { return [cx + rad*Math.cos(a), cy + rad*Math.sin(a)]; }

    // 가이드
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    for (var ring = 1; ring <= 3; ring++) {
      var rr = r * ring / 3;
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var p = pol(rr, angle(i % n));
        i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath(); ctx.stroke();
    }

    // 값 다각형
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var val = (values[axes[i]] || 5);
      var vr = r * Math.max(1, Math.min(10, val)) / 10;
      var p = pol(vr, angle(i));
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // 점
    for (var i = 0; i < n; i++) {
      var val = (values[axes[i]] || 5);
      var vr = r * Math.max(1, Math.min(10, val)) / 10;
      var p = pol(vr, angle(i));
      ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI*2);
      ctx.fillStyle = "#fff"; ctx.fill();
    }

    // 라벨
    ctx.font = "500 22px 'Pretendard Variable', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var i = 0; i < n; i++) {
      var p = pol(r + 30, angle(i));
      ctx.fillText(axes[i], p[0], p[1]);
    }
  }

  function generate(record, callback) {
    if (!CN) CN = global.CoffeeNote;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    var mainColor = getColor(record);
    var flavors = (record.flavorSelections || []).slice(0, 4);
    var scores = record.baseScores || record.scores || {};
    var name = record.coffeeName || "";
    var date = record.createdAt ? new Date(record.createdAt).toLocaleDateString("ko-KR", {year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\. /g, ".").replace(/\.$/, "") : "";
    var loc = record.location || "";
    var star = record.starRating || 0;

    // ── 배경: 메인 색상 블록 ──
    ctx.fillStyle = mainColor;
    ctx.fillRect(0, 0, W, H);

    // ── 좌상단: 브랜딩 ──
    ctx.font = "700 28px 'Pretendard Variable', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("Coffee Note.", 60, 60);

    // ── 우상단: 날짜 + 장소 ──
    ctx.font = "400 24px 'Pretendard Variable', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.textAlign = "right";
    ctx.fillText(date, W - 60, 60);
    if (loc) {
      ctx.font = "400 22px 'Pretendard Variable', sans-serif";
      ctx.fillText(loc, W - 60, 92);
    }

    // ── 중앙 상단: 레이더 차트 ──
    drawRadar(ctx, W/2, 380, 160, scores, mainColor);

    // ── 중앙: 원두 이름 (대형) ──
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";

    // 이름이 길면 줄바꿈
    var nameParts = name.split(/\s+/);
    var lines = [];
    var line = "";
    ctx.font = "700 52px 'Pretendard Variable', sans-serif";
    nameParts.forEach(function(word) {
      var test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > W - 160) {
        if (line) lines.push(line);
        line = word;
      } else { line = test; }
    });
    if (line) lines.push(line);
    if (lines.length > 3) lines = lines.slice(0, 3);

    var nameY = 640;
    var lineH = 64;
    var startY = nameY - (lines.length - 1) * lineH / 2;
    lines.forEach(function(l, i) {
      ctx.fillText(l, W/2, startY + i * lineH);
    });

    // ── 구분선 ──
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, nameY + lines.length * lineH / 2 + 30);
    ctx.lineTo(W - 60, nameY + lines.length * lineH / 2 + 30);
    ctx.stroke();

    // ── 별점 ──
    var starY = nameY + lines.length * lineH / 2 + 70;
    if (star) {
      ctx.font = "500 32px 'Pretendard Variable', sans-serif";
      ctx.fillStyle = "#FFFFFF";
      var starStr = "";
      for (var i = 1; i <= 5; i++) {
        starStr += i <= Math.floor(star) ? "★" : (star >= i - 0.5 ? "☆" : "·");
      }
      ctx.fillText(starStr + "  " + star, W/2, starY);
    }

    // ── 향미 태그 ──
    var tagY = starY + 60;
    if (flavors.length) {
      ctx.font = "500 28px 'Pretendard Variable', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      var tagStr = flavors.map(function(f) { return f.ko; }).join("  ·  ");
      ctx.fillText(tagStr, W/2, tagY);
    }

    // ── 하단: Pantone 스타일 정보 블록 ──
    var blockY = H - 200;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, blockY, W, 200);

    // 하단 텍스트
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "400 22px 'Pretendard Variable', sans-serif";
    ctx.textAlign = "left";
    // 색상명 (Pantone 스타일)
    var catName = (flavors[0] && flavors[0].category) || "";
    var catKo = {"Fruity":"과일","Floral":"꽃","Sweet":"단맛","Nutty/Cocoa":"견과·코코아","Spices":"향신료","Roasted":"로스팅","Green/Vegetative":"식물","Sour/Fermented":"산미·발효","Other":"기타"};
    ctx.fillText((catKo[catName] || "") + " — " + mainColor.toUpperCase(), 60, blockY + 45);

    // 기본감각 수치
    var scoreStr = ["아로마 "+(scores["아로마"]||"-"), "산미 "+(scores["산미"]||"-"), "단맛 "+(scores["단맛"]||"-"), "바디 "+(scores["바디감"]||"-"), "여운 "+(scores["여운"]||"-")].join("   ");
    ctx.font = "400 20px 'Pretendard Variable', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(scoreStr, 60, blockY + 85);

    // 앱 링크
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "400 20px 'Pretendard Variable', sans-serif";
    ctx.fillText("coffeenote.app", W - 60, blockY + 45);

    // 닉네임
    var nick = (CN && CN.getNickname) ? CN.getNickname() : "";
    if (nick) {
      ctx.fillText("@" + nick, W - 60, blockY + 85);
    }

    // ── 콜백 ──
    var dataUrl = canvas.toDataURL("image/png");
    if (callback) callback(dataUrl, canvas);
    return dataUrl;
  }

  function share(dataUrl) {
    // Canvas → Blob → Web Share API
    fetch(dataUrl).then(function(r){return r.blob();}).then(function(blob){
      var file = new File([blob], "coffee-note-card.png", {type:"image/png"});
      if (navigator.share && navigator.canShare && navigator.canShare({files:[file]})) {
        navigator.share({
          title: "Coffee Note",
          text: "나의 커피 센서리 카드",
          files: [file]
        }).catch(function(){});
      } else {
        // 폴백: 새 탭에서 이미지 보여주기
        var w = window.open();
        if (w) {
          w.document.write('<img src="'+dataUrl+'" style="max-width:100%;height:auto"/>');
          w.document.title = "Coffee Note Card";
        }
      }
    });
  }

  global.CardGenerator = {
    generate: generate,
    share: share
  };
})(typeof window !== "undefined" ? window : globalThis);
