/**
 * src/ui/card-generator.js
 * Coffee Note — Sensory Card Generator v2
 * (card-generator.js의 ES Module 버전)
 *
 * window.CardGenerator = { generate, share } 로 노출됨
 */

var W = 1080, H = 1920;

var CAT_COLORS = {
  Fruity:"#E83D51", Floral:"#C74882", Sweet:"#E8913A",
  "Nutty/Cocoa":"#8B6A3E", Spices:"#A0522D", Roasted:"#6B4F3A",
  "Green/Vegetative":"#4A8C5E", "Sour/Fermented":"#D4A030", Other:"#5B8F90"
};

function getMainColor(record) {
  var sels = record.flavorSelections || [];
  var ints = record.flavorIntensities || {};
  if (!sels.length) return "#E83D51";
  var best = sels[0], bestVal = 0;
  sels.forEach(function(f) {
    var v = ints[f.en] || 5;
    if (v > bestVal) { bestVal = v; best = f; }
  });
  return CAT_COLORS[best.category] || best.color || "#E83D51";
}

function darken(hex, amt) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.max(0, r - amt); g = Math.max(0, g - amt); b = Math.max(0, b - amt);
  return "#" + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

function drawRadar(ctx, cx, cy, maxR, values, aiValues) {
  var axes = ["BODY","SWEETNESS","ACIDITY","FLAVOR","AROMA"];
  var dataKeys = ["바디감","단맛","산미","여운","아로마"];
  var n = 5;

  function angle(i) { return (Math.PI * 2 * i / n) - Math.PI / 2; }
  function pol(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;

  for (var ring = 1; ring <= 10; ring++) {
    var rr = maxR * ring / 10;
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var p = pol(rr, angle(i % n));
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.strokeStyle = ring % 2 === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)";
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  for (var i = 0; i < n; i++) {
    var p = pol(maxR, angle(i));
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  }

  ctx.font = "400 20px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (var num = 1; num <= 10; num++) {
    var rr = maxR * num / 10;
    var p = pol(rr, angle(0));
    var offset = -16;
    ctx.fillText(num, p[0] + offset, p[1]);
  }

  ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var val = Math.max(1, Math.min(10, values[dataKeys[i]] || 5));
    var vr = maxR * val / 10;
    var p = pol(vr, angle(i));
    i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  for (var i = 0; i < n; i++) {
    var val = Math.max(1, Math.min(10, values[dataKeys[i]] || 5));
    var vr = maxR * val / 10;
    var p = pol(vr, angle(i));
    ctx.beginPath();
    ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  if (aiValues && Object.keys(aiValues).length) {
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var val = Math.max(1, Math.min(10, aiValues[dataKeys[i]] || 5));
      var vr = maxR * val / 10;
      var p = pol(vr, angle(i));
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    for (var i = 0; i < n; i++) {
      var val = Math.max(1, Math.min(10, aiValues[dataKeys[i]] || 5));
      var vr = maxR * val / 10;
      var p = pol(vr, angle(i));
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fill();
    }
  }

  ctx.font = "600 30px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  var labelDist = maxR + 55;
  for (var i = 0; i < n; i++) {
    var p = pol(labelDist, angle(i));
    if (i === 0) { ctx.textAlign = "center"; }
    else if (i === 1 || i === 2) { ctx.textAlign = "left"; p[0] -= 10; }
    else { ctx.textAlign = "right"; p[0] += 10; }
    ctx.fillText(axes[i], p[0], p[1]);
    ctx.textAlign = "center";
  }
}

export function generate(record, callback) {
  var canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext("2d");

  var mainColor = getMainColor(record);
  var scores = record.baseScores || record.scores || {};
  var name = record.coffeeName || "Unknown Coffee";
  var flavors = (record.flavorSelections || []).slice(0, 4);
  var star = record.starRating || 0;
  var loc = record.location || "";
  var date = record.createdAt ? new Date(record.createdAt).toLocaleDateString("ko-KR", {year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\. /g,".").replace(/\.$/,"") : "";
  var method = record.brewMethod || "";

  var totalScore = star ? (star * 20).toFixed(1) : "—";

  var aiPred = record.aiPrediction || null;
  var aiScores = aiPred ? aiPred.scores : null;
  var matchScore = null;
  if (aiScores && Object.keys(scores).length) {
    var keys = ["아로마","산미","단맛","바디감","여운"];
    var diff = 0, cnt = 0;
    keys.forEach(function(k) {
      if (scores[k] && aiScores[k]) {
        diff += Math.abs(scores[k] - aiScores[k]);
        cnt++;
      }
    });
    if (cnt) matchScore = Math.round(100 - (diff / cnt) * 10);
    if (matchScore < 0) matchScore = 0;
  }

  ctx.fillStyle = mainColor;
  ctx.fillRect(0, 0, W, H);

  ctx.font = "700 42px 'Georgia', serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Coffee Note.", W / 2, 70);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 130);
  ctx.lineTo(W - 60, 130);
  ctx.stroke();

  drawRadar(ctx, W / 2, 520, 280, scores, aiScores);

  if (matchScore !== null) {
    ctx.textAlign = "center";
    ctx.font = "500 24px 'Helvetica Neue', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("AI 일치도  " + matchScore + "%", W / 2, 830);
    ctx.font = "400 18px 'Helvetica Neue', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("── 나의 경험    - - - AI 예측", W / 2, 860);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";

  var words = name.split(/\s+/);
  var lines = [];
  var line = "";
  ctx.font = "700 72px 'Helvetica Neue', sans-serif";
  words.forEach(function(word) {
    var test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > W - 140) {
      if (line) lines.push(line);
      line = word;
    } else { line = test; }
  });
  if (line) lines.push(line);

  var nameStartY = 940;
  var lineH = 86;
  ctx.font = "700 72px 'Helvetica Neue', sans-serif";
  lines.forEach(function(l, i) {
    ctx.fillText(l, W / 2, nameStartY + i * lineH);
  });

  var tagY = nameStartY + lines.length * lineH + 30;
  if (flavors.length) {
    ctx.font = "400 34px 'Helvetica Neue', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    var tagStr = flavors.map(function(f) { return f.ko || f.en; }).join("  ·  ");
    ctx.fillText(tagStr, W / 2, tagY);
  }

  var infoY = tagY + 60;
  ctx.font = "400 26px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  var infoStr = [date, loc].filter(Boolean).join("  |  ");
  ctx.fillText(infoStr, W / 2, infoY);

  var stripY = H - 280;
  var stripH = 200;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, stripY);
  ctx.lineTo(W - 60, stripY);
  ctx.stroke();

  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(60, stripY + 8);
  ctx.lineTo(W - 60, stripY + 8);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0, stripY + 16, W, stripH);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "500 26px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  var coffee = null;
  try { coffee = window.CoffeeNote.getCoffeeByIndex(record.coffeeIndex); } catch(e) {}
  var process = (coffee && coffee.processCategory) || (coffee && coffee.process) || "";

  ctx.fillText("HEX: " + mainColor.toUpperCase(), 80, stripY + 40);
  if (process) ctx.fillText("PROCESS: " + process, 80, stripY + 78);
  if (method) ctx.fillText("BREW: " + method, 80, stripY + 116);

  ctx.textAlign = "right";
  ctx.font = "700 28px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("SCORE", W - 80, stripY + 40);
  ctx.font = "700 80px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(totalScore, W - 80, stripY + 80);

  ctx.textAlign = "center";
  ctx.font = "400 22px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  var nick = "";
  try { nick = window.CoffeeNote.getNickname() || ""; } catch(e) {}
  var bottomStr = nick ? "@" + nick + "  ·  coffeenote.app" : "coffeenote.app";
  ctx.fillText(bottomStr, W / 2, H - 50);

  ctx.save();
  ctx.translate(W - 70, H - 50);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();

  var dataUrl = canvas.toDataURL("image/png");
  if (callback) callback(dataUrl, canvas);
  return dataUrl;
}

export function share(dataUrl) {
  fetch(dataUrl).then(function(r) { return r.blob(); }).then(function(blob) {
    var file = new File([blob], "coffee-note-card.png", { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ title: "Coffee Note", text: "나의 커피 센서리 카드", files: [file] }).catch(function(){});
    } else {
      var a = document.createElement("a");
      a.href = dataUrl;
      a.download = "coffee-note-card.png";
      a.click();
    }
  });
}

// window.CardGenerator 등록 (기존 호출자 호환)
window.CardGenerator = { generate, share };
