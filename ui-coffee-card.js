/**
 * ui-coffee-card.js — 커피 카드 UI 템플릿 & 데이터 로직 모듈
 * Coffee Note v33 모듈화 Step 4
 *
 * 원칙:
 *  - document.* 직접 호출 금지 (DOM 조작 없음)
 *  - HTML 문자열만 생성하여 반환, 삽입은 호출자가 담당
 *  - API 결과는 콜백으로만 전달
 */
var UICoffeeCard = (function () {

  /* ── 카드 목록 아이템 HTML ── */

  /**
   * 검색 결과 목록에 표시할 카드 한 장의 innerHTML을 생성한다.
   *
   * @param {Object} coffee - 커피 객체
   * @param {number} idx - 배열 인덱스
   * @param {boolean} isFavorite - 즐겨찾기 여부
   * @returns {string} innerHTML 문자열
   */
  function buildCardHTML(coffee, idx, isFavorite) {
    var notes = coffee.cup_notes || coffee.cupNotes || [];
    var score = coffee.sca_score;
    var tagsHtml = '';
    if (notes.length) {
      tagsHtml = '<div class="card-tags">' +
        notes.slice(0, 3).map(function (n) {
          return '<span class="tag-sm">' + esc(n) + '</span>';
        }).join('') + '</div>';
    }
    var scoreHtml = score
      ? '<div class="card-score">' + esc(parseFloat(score).toFixed(1)) + '</div>'
      : '';
    var favIcon = isFavorite ? '♥' : '♡';

    return '<div class="card-row" onclick="toggleCard(' + idx + ')">' +
      '<div class="card-ico">☕</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + esc(coffee.name || '이름 없음') + '</div>' +
        '<div class="card-sub">' +
          esc([coffee.roaster, coffee.country, coffee.process].filter(Boolean).join(' · ')) +
        '</div>' +
        tagsHtml +
      '</div>' +
      '<div class="card-right">' +
        scoreHtml +
        '<button class="card-fav" onclick="event.stopPropagation();toggleFavBtn(' + idx + ',this)">' + favIcon + '</button>' +
        '<span class="chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="6,9 12,15 18,9"/></svg></span>' +
      '</div>' +
    '</div>' +
    '<div class="detail-panel" id="detail-' + idx + '"></div>';
  }

  /* ── 상세 패널 HTML ── */

  /**
   * 원두 상세 정보 패널의 전체 HTML을 생성한다.
   * 이 함수는 document.*를 일절 호출하지 않는다.
   *
   * @param {Object} c - 커피 객체
   * @param {number} idx - 배열 인덱스
   * @returns {string} HTML 문자열
   */
  function buildDetailHTML(c, idx) {
    var notes = c.cup_notes || c.cupNotes || [];
    var score = c.sca_score;
    var comm = c.community || {};
    var ar = c.aroma || 0, ac = c.acidity || 0, sw = c.sweetness || 0;
    var bo = c.body || 0, af = c.aftertaste || 0;
    var hasPred = ar || ac || sw || bo || af;
    var isVer = score && parseFloat(score) >= 80;

    // 향미 태그
    var flavorHtml;
    if (notes.length) {
      flavorHtml = notes.map(function (n, i) {
        return '<span class="' + (i < 3 ? 'tag-filled' : 'tag-outline-lg') + '">' + esc(n) + '</span>';
      }).join('');
    } else {
      flavorHtml = '<span style="font-size:12px;color:var(--text-sub)">정보 없음</span>';
    }

    // 정보 행 헬퍼
    function ir(k, v) {
      return v ? '<div class="info-row"><span class="info-k">' + esc(k) + '</span><span class="info-v">' + esc(v) + '</span></div>' : '';
    }

    // 검증 배지
    var verifiedHtml = isVer
      ? '<div class="verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><polyline points="20,6 9,17 4,12"/></svg>Q-GRADER 검증</div>'
      : '';

    // SCA 점수 행
    var scoreRow = score
      ? '<div class="info-row"><span class="info-k">SCA점수</span><span class="info-v big">' + esc(parseFloat(score).toFixed(1)) + '</span></div>'
      : '';

    // AI 예측 강도 바
    var predictHtml = '';
    if (hasPred) {
      var axes = [['아로마', ar], ['산미', ac], ['단맛', sw], ['바디', bo], ['여운', af]];
      predictHtml = '<div class="more-sec"><div class="more-sec-lbl">AI 향미 강도 예측</div>' +
        axes.map(function (pair) {
          var pct = Math.max(0, Math.min(100, pair[1] * 10));
          return '<div class="predict-row">' +
            '<span class="predict-key">' + esc(pair[0]) + '</span>' +
            '<div class="predict-track"><div class="predict-fill" style="width:' + pct + '%"></div></div>' +
            '<span class="predict-val">' + esc(pair[1]) + '</span></div>';
        }).join('') + '</div>';
    }

    // 링크 행 (URL 새니타이징 적용)
    var linkHtml = '';
    var safeRoasterUrl = sanitizeUrl(c.roaster_url);
    var safeFarmUrl = sanitizeUrl(c.farm_url);
    var safePurchaseUrl = sanitizeUrl(c.purchase_url);
    if (safeRoasterUrl || safeFarmUrl || safePurchaseUrl) {
      linkHtml = '<div class="link-row">' +
        (safeRoasterUrl ? '<a href="' + safeRoasterUrl + '" target="_blank" rel="noopener noreferrer" class="btn-link-sm">🔗 로스터리</a> ' : '') +
        (safeFarmUrl ? '<a href="' + safeFarmUrl + '" target="_blank" rel="noopener noreferrer" class="btn-link-sm">🌱 농장</a> ' : '') +
        (safePurchaseUrl ? '<a href="' + safePurchaseUrl + '" target="_blank" rel="noopener noreferrer" class="btn-link-sm">🛒 구매</a>' : '') +
        '</div>';
    }

    // 스토리 텍스트
    var storyText = esc(c.story || c.description || '') || '<span style="color:var(--text-sub);font-style:italic">불러오는 중...</span>';

    // 조립
    return '<div class="detail-hero">' + verifiedHtml +
      '<div class="detail-name">' + esc(c.name || '—') + '</div>' +
      '<div class="detail-by">' + esc([c.roaster, c.process].filter(Boolean).join(' · ')) + '</div></div>' +
      ir('산지', [c.region, c.country].filter(Boolean).join(', ')) +
      ir('고도', c.altitude) +
      ir('품종', c.variety) +
      ir('가공', c.process) +
      scoreRow +
      '<div class="flavor-sec"><div class="flavor-sec-lbl">예상 향미</div><div class="flavor-row">' + flavorHtml + '</div></div>' +
      '<div class="recorder-row"><span class="recorder-lbl">이 원두 기록한 사람</span><span class="recorder-cnt">' +
        (comm.count > 0 ? esc(comm.count) + '명' : '첫 번째') + '</span></div>' +
      '<div class="detail-actions">' +
        '<button class="btn-outline" onclick="goRecipe(' + idx + ')">레시피 보기</button>' +
        '<button class="btn-fill" onclick="goTasting(' + idx + ')">기록하기</button></div>' +
      '<div class="more-toggle" onclick="toggleMore(' + idx + ')">상세 정보 더보기 ↓</div>' +
      '<div class="more-panel" id="more-' + idx + '">' +
        predictHtml +
        '<div class="more-sec"><div class="more-sec-lbl">원두 이야기</div>' +
          '<div class="more-text" id="story-' + idx + '">' + storyText + '</div></div>' +
        linkHtml +
      '</div>';
  }

  /* ── 원두 스토리 API ── */

  /**
   * /api/story 엔드포인트를 호출하고 결과를 콜백으로 전달한다.
   *
   * @param {string} name - 원두 이름
   * @param {string} country - 원두 산지 국가
   * @param {function(story:string)} onSuccess
   * @param {function(error:Error)} [onError]
   */
  async function fetchStory(name, country, onSuccess, onError) {
    try {
      var res = await fetch('/api/story?name=' + encodeURIComponent(name || '') +
                            '&country=' + encodeURIComponent(country || ''));
      if (res.ok) {
        var d = await res.json();
        if (d.story && onSuccess) onSuccess(d.story);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  }

  /* ── 네비게이션 데이터 준비 ── */

  /**
   * 테이스팅 화면으로 이동하기 위한 데이터를 준비한다.
   * sessionStorage 저장과 location 이동은 호출자가 담당한다.
   *
   * @param {Object} coffee - 커피 객체
   * @param {Array<Object>} coffeeList - 전체 커피 목록 (localDB)
   * @returns {{ url: string, sessionItems: Array<{key:string, value:string}> }}
   */
  function prepareGoTasting(coffee, coffeeList) {
    var ri = coffeeList.findIndex(function (x) { return x.name === coffee.name; });
    var coffeeId = ri >= 0 ? ri : 0;
    return {
      url: 'tasting.html?coffeeId=' + coffeeId,
      sessionItems: [
        { key: 'tasting_coffee', value: JSON.stringify(coffee) },
        { key: 'tasting_coffeeIdx', value: String(coffeeId) }
      ]
    };
  }

  /**
   * 레시피 화면으로 이동하기 위한 데이터를 준비한다.
   *
   * @param {Object} coffee - 커피 객체
   * @param {Array<Object>} coffeeList - 전체 커피 목록 (localDB)
   * @returns {{ url: string, sessionItems: Array<{key:string, value:string}> }}
   */
  function prepareGoRecipe(coffee, coffeeList) {
    var ri = coffeeList.findIndex(function (x) { return x.name === coffee.name; });
    var coffeeId = ri >= 0 ? ri : 0;
    return {
      url: 'recipe.html?coffeeId=' + coffeeId,
      sessionItems: [
        { key: 'recipe_coffee', value: JSON.stringify(coffee) }
      ]
    };
  }

  /* ── 노출 ── */
  return {
    buildCardHTML:     buildCardHTML,
    buildDetailHTML:   buildDetailHTML,
    fetchStory:        fetchStory,
    prepareGoTasting:  prepareGoTasting,
    prepareGoRecipe:   prepareGoRecipe
  };

})();
