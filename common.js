/**
 * 커피 노트 — 공통 유틸 & localStorage
 * // TODO: Supabase 연동 시 이 모듈을 API 클라이언트로 교체
 */

(function (global) {
  "use strict";

  const STORAGE_KEYS = {
    COFFEES: "coffee_note_coffees",
    FAVORITES: "coffee_note_favorites",
    TASTING_RECORDS: "coffee_note_tasting_records",
    SEARCH_HISTORY: "coffee_note_search_history",
    NICKNAME: "coffee_note_nickname",
    COFFEES_SEEDED: "coffee_note_coffees_seeded_v2",
    RECIPES: "coffee_note_recipes",
  };

  /**
   * SCA 플레이버 휠 (9 대분류). 스키마: category, categoryKo, subs[].name, nameKo, items[].en, ko, color
   * // TODO: REVIEW-AND-PLAN.md와 동기화 시 해당 문서의 데이터로 교체
   */
  const SCA_WHEEL = [
    {
      category: "Fruity",
      categoryKo: "과일",
      subs: [
        {
          name: "Berry",
          nameKo: "베리",
          items: [
            { en: "Blackberry", ko: "블랙베리", color: "#6B2D5C" },
            { en: "Raspberry", ko: "라즈베리", color: "#C44D6A" },
            { en: "Blueberry", ko: "블루베리", color: "#E24B4A" },
            { en: "Strawberry", ko: "딸기", color: "#E85D75" },
            { en: "Cranberry", ko: "크랜베리", color: "#A61C3C" },
          ],
        },
        {
          name: "Citrus",
          nameKo: "시트러스",
          items: [
            { en: "Lemon", ko: "레몬", color: "#F5D547" },
            { en: "Lime", ko: "라임", color: "#9ACD32" },
            { en: "Grapefruit", ko: "자몽", color: "#FF6F61" },
            { en: "Orange", ko: "오렌지", color: "#F4A261" },
            { en: "Tangerine", ko: "귤", color: "#E76F51" },
          ],
        },
        {
          name: "Stone fruit",
          nameKo: "핵과",
          items: [
            { en: "Peach", ko: "복숭아", color: "#F4A688" },
            { en: "Apricot", ko: "살구", color: "#F6B26B" },
            { en: "Plum", ko: "자두", color: "#6B4C7A" },
            { en: "Cherry", ko: "체리", color: "#9B2335" },
          ],
        },
        {
          name: "Other fruit",
          nameKo: "기타 과일",
          items: [
            { en: "Apple", ko: "사과", color: "#C4D4A0" },
            { en: "Pear", ko: "배", color: "#D4E157" },
            { en: "Grape", ko: "포도", color: "#6A4C93" },
            { en: "Pomegranate", ko: "석류", color: "#722F37" },
            { en: "Coconut", ko: "코코넛", color: "#E8D4B8" },
          ],
        },
      ],
    },
    {
      category: "Floral",
      categoryKo: "꽃",
      subs: [
        {
          name: "Floral",
          nameKo: "플로럴",
          items: [
            { en: "Jasmine", ko: "자스민", color: "#D4537E" },
            { en: "Rose", ko: "장미", color: "#E8A0BF" },
            { en: "Orange Blossom", ko: "오렌지 블라썸", color: "#F5C4C4" },
            { en: "Honeysuckle", ko: "인동덩굴", color: "#F0E68C" },
            { en: "Magnolia", ko: "목련", color: "#F5E6E8" },
          ],
        },
        {
          name: "Herbal",
          nameKo: "허브",
          items: [
            { en: "Lavender", ko: "라벤더", color: "#B8A9C9" },
            { en: "Chamomile", ko: "캐모마일", color: "#E8DCC4" },
            { en: "Elderflower", ko: "엘더플라워", color: "#E8E8E8" },
          ],
        },
      ],
    },
    {
      category: "Sweet",
      categoryKo: "단맛",
      subs: [
        {
          name: "Sweet",
          nameKo: "스위트",
          items: [
            { en: "Honey", ko: "꿀", color: "#E6A532" },
            { en: "Caramel", ko: "카라멜", color: "#B5651D" },
            { en: "Vanilla", ko: "바닐라", color: "#D4B896" },
            { en: "Maple", ko: "메이플", color: "#C68E17" },
            { en: "Brown Sugar", ko: "흑설탕", color: "#A67B5B" },
            { en: "Marshmallow", ko: "마시멜로", color: "#F5F0E6" },
            { en: "Nougat", ko: "누가", color: "#DEB887" },
          ],
        },
      ],
    },
    {
      category: "Nutty/Cocoa",
      categoryKo: "견과·코코아",
      subs: [
        {
          name: "Nutty",
          nameKo: "견과",
          items: [
            { en: "Almond", ko: "아몬드", color: "#C4A484" },
            { en: "Hazelnut", ko: "헤이즐넛", color: "#8B6914" },
            { en: "Peanut", ko: "땅콩", color: "#C4A35A" },
            { en: "Walnut", ko: "호두", color: "#5D4E37" },
          ],
        },
        {
          name: "Cocoa",
          nameKo: "코코아",
          items: [
            { en: "Milk Chocolate", ko: "밀크초콜릿", color: "#7B5544" },
            { en: "Dark Chocolate", ko: "다크초콜릿", color: "#3D2314" },
            { en: "Cocoa", ko: "코코아", color: "#4E342E" },
          ],
        },
      ],
    },
    {
      category: "Spices",
      categoryKo: "향신료",
      subs: [
        {
          name: "Spices",
          nameKo: "스파이스",
          items: [
            { en: "Cinnamon", ko: "시나몬", color: "#8B4513" },
            { en: "Clove", ko: "정향", color: "#5C4033" },
            { en: "Nutmeg", ko: "넛맥", color: "#6B5344" },
            { en: "Cardamom", ko: "카다멈", color: "#9A8B7A" },
            { en: "Black Pepper", ko: "블랙페퍼", color: "#3C3C3C" },
            { en: "Anise", ko: "아니스", color: "#8B7355" },
          ],
        },
      ],
    },
    {
      category: "Roasted",
      categoryKo: "로스팅",
      subs: [
        {
          name: "Roasted",
          nameKo: "로스티드",
          items: [
            { en: "Cereal", ko: "시리얼", color: "#C9B8A6" },
            { en: "Toast", ko: "토스트", color: "#A0826D" },
            { en: "Smoky", ko: "스모키", color: "#5C5C5C" },
            { en: "Burnt", ko: "번트", color: "#2C2C2C" },
            { en: "Tobacco", ko: "타바코", color: "#4A3728" },
          ],
        },
      ],
    },
    {
      category: "Green/Vegetative",
      categoryKo: "그린·식물",
      subs: [
        {
          name: "Green",
          nameKo: "그린",
          items: [
            { en: "Green Tea", ko: "녹차", color: "#7CB342" },
            { en: "Grass", ko: "풀", color: "#689F38" },
            { en: "Herbaceous", ko: "허베이셔스", color: "#558B2F" },
            { en: "Peapod", ko: "완두콩", color: "#9CCC65" },
          ],
        },
        {
          name: "Vegetative",
          nameKo: "베지터블",
          items: [
            { en: "Cucumber", ko: "오이", color: "#7CB342" },
            { en: "Olive", ko: "올리브", color: "#6B7C59" },
            { en: "Tomato", ko: "토마토", color: "#C62828" },
          ],
        },
      ],
    },
    {
      category: "Sour/Fermented",
      categoryKo: "산미·발효",
      subs: [
        {
          name: "Sour",
          nameKo: "산미",
          items: [
            { en: "Acetic Acid", ko: "초산", color: "#BDB76B" },
            { en: "Butyric Acid", ko: "부티르산", color: "#9E9D24" },
            { en: "Winey", ko: "와이니", color: "#8E24AA" },
          ],
        },
        {
          name: "Fermented",
          nameKo: "발효",
          items: [
            { en: "Wine", ko: "와인", color: "#6A1B9A" },
            { en: "Overripe", ko: "과숙", color: "#795548" },
            { en: "Whiskey", ko: "위스키", color: "#8D6E63" },
          ],
        },
      ],
    },
    {
      category: "Other",
      categoryKo: "기타",
      subs: [
        {
          name: "Other",
          nameKo: "기타",
          items: [
            { en: "Black Tea", ko: "홍차", color: "#5D4037" },
            { en: "Bergamot", ko: "베르가못", color: "#F0C987" },
            { en: "Hibiscus", ko: "히비스커스", color: "#C2185B" },
            { en: "Leather", ko: "가죽", color: "#4E342E" },
            { en: "Petroleum", ko: "석유향", color: "#37474F" },
            { en: "Musty", ko: "곰팡이", color: "#6D4C41" },
          ],
        },
      ],
    },
  ];

  function findScaFlavorByEn(en) {
    const target = String(en || "").trim();
    for (let ci = 0; ci < SCA_WHEEL.length; ci++) {
      const c = SCA_WHEEL[ci];
      for (let si = 0; si < c.subs.length; si++) {
        const s = c.subs[si];
        for (let ii = 0; ii < s.items.length; ii++) {
          const it = s.items[ii];
          if (it.en === target) {
            return {
              en: it.en,
              ko: it.ko,
              color: it.color,
              category: c.category,
              categoryKo: c.categoryKo,
              sub: s.name,
              subKo: s.nameKo,
            };
          }
        }
      }
    }
    return null;
  }

  function findScaFlavorByKo(ko) {
    const target = String(ko || "").trim();
    for (let ci = 0; ci < SCA_WHEEL.length; ci++) {
      const c = SCA_WHEEL[ci];
      for (let si = 0; si < c.subs.length; si++) {
        const s = c.subs[si];
        for (let ii = 0; ii < s.items.length; ii++) {
          const it = s.items[ii];
          if (it.ko === target) {
            return {
              en: it.en,
              ko: it.ko,
              color: it.color,
              category: c.category,
              categoryKo: c.categoryKo,
              sub: s.name,
              subKo: s.nameKo,
            };
          }
        }
      }
    }
    return null;
  }

  const LEGACY_PROCESS_EN = {
    Washed: "워시드",
    Natural: "내추럴",
    Honey: "허니",
    Anaerobic: "무산소 발효",
    Other: "기타",
    CM: "카보닉 매서레이션",
    "Double Fermentation": "더블 발효",
    "Wet Hulled": "웻 헐",
  };

  function resolveProcessCategory(c) {
    if (c.processCategory) return c.processCategory;
    if (c.processKo) return c.processKo;
    if (typeof c.process === "string" && c.process.includes("·")) {
      return c.process.split("·")[0].trim();
    }
    if (c.process && LEGACY_PROCESS_EN[c.process]) return LEGACY_PROCESS_EN[c.process];
    if (typeof c.process === "string" && c.process.length && !LEGACY_PROCESS_EN[c.process]) {
      if (/[가-힣]/.test(c.process)) return c.process.trim();
    }
    return "기타";
  }

  function formatProcessDisplay(c) {
    const cat = resolveProcessCategory(c);
    const det = (c.processDetail || "").trim();
    if (det) return cat + " · " + det;
    if (typeof c.process === "string" && c.process.includes("·")) return c.process.trim();
    return cat;
  }

  const SVG_STAR_FILL =
    '<svg class="star-filled" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>';
  const SVG_STAR_EMPTY =
    '<svg class="star-empty" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>';

  const SVG_HEART_OUTLINE =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
  const SVG_HEART_FILL =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text)" stroke="var(--text)" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';

  /** 기본 샘플 원두 (최초 1회 localStorage에 주입) */
  const DEFAULT_COFFEES = [
    {
      name: "에티오피아 예가체프 콩가 워시드",
      roaster: "Fritz Coffee Company",
      rating: 4.3,
      processCategory: "워시드",
      processDetail: "",
      process: "워시드",
      altitude: "1,900-2,200m",
      region: "예가체프",
      country: "에티오피아",
      farm: "콩가 워싱스테이션",
      variety: "Heirloom",
      price: "18,000원 / 200g",
      mapText: "예가체프, 게데오 존, 에티오피아 | 지도 연동 예정",
      notes: ["블루베리", "자스민", "꿀", "베르가못", "다크초콜릿"],
      keywords: ["예가체프", "예가", "에티오피아", "콩가", "yirgacheffe", "washed", "워시드"],
      source: "builtin",
    },
    {
      name: "에티오피아 예가체프 콩가 내추럴",
      roaster: "Coffee Libre",
      rating: 4.2,
      processCategory: "내추럴",
      processDetail: "",
      process: "내추럴",
      altitude: "1,800-2,100m",
      region: "예가체프",
      country: "에티오피아",
      farm: "콩가 워싱스테이션",
      variety: "Heirloom",
      price: "19,500원 / 200g",
      mapText: "예가체프, 게데오 존, 에티오피아 | 지도 연동 예정",
      notes: ["복숭아", "딸기", "자스민", "꿀"],
      keywords: ["예가체프", "예가", "에티오피아", "콩가", "natural", "내추럴"],
      source: "builtin",
    },
    {
      name: "에티오피아 예가체프 아리차",
      roaster: "Namusairo",
      rating: 4.4,
      processCategory: "워시드",
      processDetail: "",
      process: "워시드",
      altitude: "1,750-2,000m",
      region: "예가체프",
      country: "에티오피아",
      farm: "아리차 워싱스테이션",
      variety: "Heirloom",
      price: "17,000원 / 200g",
      mapText: "예가체프, 게데오 존, 에티오피아 | 지도 연동 예정",
      notes: ["레몬", "녹차", "장미", "꿀"],
      keywords: ["예가체프", "예가", "아리차", "에티오피아"],
      source: "builtin",
    },
    {
      name: "에티오피아 예가체프 첼베사",
      roaster: "Momos Coffee",
      rating: 4.5,
      processCategory: "허니",
      processDetail: "",
      process: "허니",
      altitude: "2,000-2,200m",
      region: "예가체프",
      country: "에티오피아",
      farm: "첼베사 스테이션",
      variety: "Heirloom",
      price: "21,000원 / 200g",
      mapText: "예가체프, 게데오 존, 에티오피아 | 지도 연동 예정",
      notes: ["꿀", "복숭아", "바닐라", "자스민"],
      keywords: ["예가체프", "예가", "첼베사", "에티오피아", "honey", "허니"],
      source: "builtin",
    },
    {
      name: "파나마 게이샤 에스메랄다",
      roaster: "Elida Select",
      rating: 4.8,
      processCategory: "워시드",
      processDetail: "",
      process: "워시드",
      altitude: "1,700-1,900m",
      region: "보케테",
      country: "파나마",
      farm: "에스메랄다 농장",
      variety: "Geisha",
      price: "45,000원 / 100g",
      mapText: "보케테, 치리키, 파나마 | 지도 연동 예정",
      notes: ["자스민", "베르가못", "복숭아", "장미"],
      keywords: ["게이샤", "게이사", "파나마", "geisha"],
      source: "builtin",
    },
    {
      name: "에티오피아 게이샤 빌리지",
      roaster: "Deep Bean",
      rating: 4.7,
      processCategory: "내추럴",
      processDetail: "",
      process: "내추럴",
      altitude: "1,900-2,100m",
      region: "벤치마지",
      country: "에티오피아",
      farm: "게이샤 빌리지",
      variety: "Geisha 1931",
      price: "39,000원 / 150g",
      mapText: "벤치마지, 에티오피아 | 지도 연동 예정",
      notes: ["블루베리", "자스민", "레몬", "꿀"],
      keywords: ["게이샤", "에티오피아", "빌리지", "geisha"],
      source: "builtin",
    },
    {
      name: "케냐 AA 키암부",
      roaster: "Center Coffee",
      rating: 4.3,
      processCategory: "워시드",
      processDetail: "",
      process: "워시드",
      altitude: "1,700-1,900m",
      region: "키암부",
      country: "케냐",
      farm: "키암부 협동조합",
      variety: "SL28/SL34",
      price: "20,000원 / 200g",
      mapText: "키암부, 케냐 | 지도 연동 예정",
      notes: ["블랙커런트", "자몽", "다크초콜릿"],
      keywords: ["케냐", "키암부", "aa", "kenya"],
      source: "builtin",
    },
    {
      name: "케냐 무랑아 AB",
      roaster: "Anthracite Coffee",
      rating: 4.1,
      processCategory: "워시드",
      processDetail: "",
      process: "워시드",
      altitude: "1,650-1,850m",
      region: "무랑아",
      country: "케냐",
      farm: "무랑아 워싱스테이션",
      variety: "SL28/SL34",
      price: "18,500원 / 200g",
      mapText: "무랑아, 케냐 | 지도 연동 예정",
      notes: ["레몬", "카라멜", "헤이즐넛"],
      keywords: ["케냐", "무랑아", "ab", "kenya"],
      source: "builtin",
    },
  ];

  function getFromStorage(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureCoffeesInitialized() {
    if (localStorage.getItem(STORAGE_KEYS.COFFEES_SEEDED) === "1") return;
    if (!getFromStorage(STORAGE_KEYS.COFFEES, null)) {
      saveToStorage(STORAGE_KEYS.COFFEES, DEFAULT_COFFEES);
    }
    localStorage.setItem(STORAGE_KEYS.COFFEES_SEEDED, "1");
  }

  function getCoffees() {
    ensureCoffeesInitialized();
    const list = getFromStorage(STORAGE_KEYS.COFFEES, []);
    return Array.isArray(list) ? list : DEFAULT_COFFEES.slice();
  }

  function saveCoffees(list) {
    saveToStorage(STORAGE_KEYS.COFFEES, list);
  }

  function getCoffeeByIndex(index) {
    const coffees = getCoffees();
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= coffees.length) return null;
    return coffees[i];
  }

  function addCoffee(coffeeObj) {
    const list = getCoffees();
    list.push(coffeeObj);
    saveCoffees(list);
    return list.length - 1;
  }

  function updateCoffee(index, partial) {
    const list = getCoffees();
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= list.length) return false;
    list[i] = { ...list[i], ...partial };
    saveCoffees(list);
    return true;
  }

  function getFavorites() {
    const raw = getFromStorage(STORAGE_KEYS.FAVORITES, []);
    if (!Array.isArray(raw)) return [];
    const n = getCoffees().length;
    return raw
      .map(Number)
      .filter((i) => Number.isInteger(i) && i >= 0 && i < n);
  }

  function setFavorites(arr) {
    saveToStorage(STORAGE_KEYS.FAVORITES, arr);
  }

  function toggleFavorite(index) {
    const i = Number(index);
    const favs = getFavorites();
    const has = favs.includes(i);
    if (has) setFavorites(favs.filter((x) => x !== i));
    else setFavorites([...favs, i]);
    return !has;
  }

  function isFavorite(index) {
    return getFavorites().includes(Number(index));
  }

  var BASE_SENSE_AXES = ["아로마", "산미", "단맛", "바디감", "여운"];

  function normalizeTastingRecord(record) {
    var r = record && typeof record === "object" ? record : {};

    var baseMemosRaw = r.baseMemos && typeof r.baseMemos === "object" ? r.baseMemos : null;

    var baseMemos = {};
    for (var i = 0; i < BASE_SENSE_AXES.length; i++) {
      var ax = BASE_SENSE_AXES[i];
      baseMemos[ax] = baseMemosRaw && baseMemosRaw[ax] != null ? String(baseMemosRaw[ax]) : "";
    }

    var baseScoresRaw = r.baseScores && typeof r.baseScores === "object" ? r.baseScores : null;
    var scoresRaw = r.scores && typeof r.scores === "object" ? r.scores : null;
    var baseScores = baseScoresRaw || scoresRaw || {};

    var loc = typeof r.location === "string" ? r.location : "";

    var photos = Array.isArray(r.photos) ? r.photos : [];
    photos = photos.filter(function (x) {
      return typeof x === "string";
    });

    var normalized = {
      ...r,
      flavorSelections: Array.isArray(r.flavorSelections) ? r.flavorSelections : [],
      flavorIntensities: r.flavorIntensities && typeof r.flavorIntensities === "object" ? r.flavorIntensities : {},
      flavorMemos: r.flavorMemos && typeof r.flavorMemos === "object" ? r.flavorMemos : {},
      baseScores: baseScores,
      baseMemos: baseMemos,
      location: loc,
      locationCoords: r.locationCoords != null ? r.locationCoords : null,
      photos: photos,
    };

    // 하위호환: 기존에 저장된 필드명이 baseScores가 아니면 scores도 맞춰줌
    normalized.scores = normalized.baseScores;

    return normalized;
  }

  function getTastingRecords() {
    const r = getFromStorage(STORAGE_KEYS.TASTING_RECORDS, []);
    if (!Array.isArray(r)) return [];
    return r.map(function (rec) {
      return normalizeTastingRecord(rec);
    });
  }

  function addTastingRecord(record) {
    const list = getTastingRecords();
    list.unshift(record);
    saveToStorage(STORAGE_KEYS.TASTING_RECORDS, list);
  }

  function getSearchHistory() {
    const h = getFromStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
    return Array.isArray(h) ? h : [];
  }

  function addSearchHistory(query) {
    const q = (query || "").trim();
    if (!q) return;
    const list = getSearchHistory().filter((item) => item.query !== q);
    list.unshift({ query: q, ts: Date.now() });
    saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, list.slice(0, 50));
  }

  function getNickname() {
    return localStorage.getItem(STORAGE_KEYS.NICKNAME) || "";
  }

  function setNickname(name) {
    localStorage.setItem(STORAGE_KEYS.NICKNAME, name.trim());
  }

  function normalize(s) {
    return (s || "").toLowerCase().trim();
  }

  function searchCoffeePairs(query) {
    const q = normalize(query);
    const coffees = getCoffees();
    if (!q) return [];
    return coffees
      .map((c, index) => ({ coffee: c, index }))
      .filter(({ coffee: c }) => {
        const hay = [
          c.name,
          c.roaster,
          c.process,
          formatProcessDisplay(c),
          c.processCategory,
          c.processDetail,
          c.altitude,
          c.region,
          c.country,
          (c.keywords || []).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }

  function toneClass(i) {
    return ["t1", "t2", "t3", "t4", "t5"][i % 5];
  }

  function starsHtml(score) {
    const s = Number(score);
    let html = '<span class="stars-row">';
    for (let i = 1; i <= 5; i++) {
      html += s >= i - 0.5 ? SVG_STAR_FILL : SVG_STAR_EMPTY;
    }
    html += "</span><span class=\"rating-num\">" + (Number.isFinite(s) ? s.toFixed(1) : "0.0") + "</span>";
    return html;
  }

  let toastEl = null;
  function showToast(message, duration) {
    duration = duration || 1600;
    if (!toastEl) toastEl = document.getElementById("globalToast");
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toastEl.classList.remove("show");
    }, duration);
  }

  /**
   * 하단 네비 active 표시
   * @param {"search"|"scan"|"notes"|"map"|"mypage"} activePage
   */
  function renderBottomNav(activePage) {
    const nav = document.getElementById("bottomNav");
    if (!nav) return;
    nav.querySelectorAll(".nav-item").forEach(function (item) {
      const key = item.getAttribute("data-nav");
      item.classList.toggle("active", Boolean(activePage) && key === activePage);
    });
  }

  /** 스캔(사진 검색) 시트 — 없으면 주입 */
  function ensurePhotoScanSheet() {
    if (document.getElementById("photoSearchOverlay")) return;

    var html =
      '<div id="photoSearchOverlay" class="sheetOverlay" aria-hidden="true">' +
      '  <div class="sheetPanel" role="dialog" aria-modal="true" aria-labelledby="photoSheetTitle">' +
      '    <div class="sheetHandle"></div>' +
      '    <h2 id="photoSheetTitle" class="sheetTitle">사진으로 검색</h2>' +
      '    <p class="sheetText">커피 봉지나 설명 카드를 촬영하세요.</p>' +
      '    <p class="sheetText" style="margin-top:-4px;">인식된 텍스트를 확인하고 수정하세요.</p>' +
      '    <div id="ocrLoading" class="ocrLoading">텍스트 인식 중...</div>' +
      '    <div class="sheetActions">' +
      '      <input type="file" id="fileCamera" accept="image/*" capture="environment" />' +
      '      <input type="file" id="fileGallery" accept="image/*" />' +
      '      <button type="button" class="btn-primary" id="btnTriggerCamera">카메라 촬영</button>' +
      '      <button type="button" class="btn-secondary" id="btnTriggerGallery">갤러리에서 선택</button>' +
      '      <button type="button" class="btn-secondary" id="btnClosePhotoSheet">닫기</button>' +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.body.insertAdjacentHTML("beforeend", html);

    var overlay = document.getElementById("photoSearchOverlay");
    var loading = document.getElementById("ocrLoading");
    var fc = document.getElementById("fileCamera");
    var fg = document.getElementById("fileGallery");

    document.getElementById("btnClosePhotoSheet").addEventListener("click", closePhotoSearchSheet);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closePhotoSearchSheet();
    });
    document.getElementById("btnTriggerCamera").addEventListener("click", function () {
      fc.click();
    });
    document.getElementById("btnTriggerGallery").addEventListener("click", function () {
      fg.click();
    });

    function handleFile(file) {
      if (!file) return;
      loading.classList.add("show");
      loadTesseractAndRecognize(file)
        .then(function (text) {
          loading.classList.remove("show");
          closePhotoSearchSheet();
          var ev = new CustomEvent("coffeeNote:ocrText", { detail: { text: text || "" } });
          document.dispatchEvent(ev);
        })
        .catch(function () {
          loading.classList.remove("show");
          showToast("인식에 실패했습니다. 다시 시도해 주세요.");
        });
    }

    fc.addEventListener("change", function () {
      handleFile(fc.files && fc.files[0]);
      fc.value = "";
    });
    fg.addEventListener("change", function () {
      handleFile(fg.files && fg.files[0]);
      fg.value = "";
    });
  }

  function openPhotoSearchSheet() {
    ensurePhotoScanSheet();
    var overlay = document.getElementById("photoSearchOverlay");
    if (!overlay) return;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closePhotoSearchSheet() {
    var overlay = document.getElementById("photoSearchOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    var loading = document.getElementById("ocrLoading");
    if (loading) loading.classList.remove("show");
  }

  function loadTesseractAndRecognize(file) {
    return new Promise(function (resolve, reject) {
      if (typeof Tesseract === "undefined") {
        reject(new Error("Tesseract not loaded"));
        return;
      }
      Tesseract.recognize(file, "eng+kor", { logger: function () {} })
        .then(function (result) {
          var t = (result && result.data && result.data.text) || "";
          resolve(t.replace(/\s+/g, " ").trim());
        })
        .catch(reject);
    });
  }

  /** 하단 네비 스캔 — 검색 페이지가 아니면 검색으로 이동 후 시트 오픈 플래그 */
  function openCamera() {
    var path = (location.pathname || "").split("/").pop() || "index.html";
    if (path !== "index.html") {
      sessionStorage.setItem("coffee_note_open_scan", "1");
      location.href = "index.html";
      return;
    }
    openPhotoSearchSheet();
  }

  function openCoffeeMap() {
    showToast("커피맵은 준비 중입니다.");
  }

  /** 페이지 로드 시 스캔 플래그 처리 */
  function consumeScanIntent() {
    if (sessionStorage.getItem("coffee_note_open_scan") === "1") {
      sessionStorage.removeItem("coffee_note_open_scan");
      setTimeout(function () {
        openPhotoSearchSheet();
      }, 300);
    }
  }

  // SCA 카테고리 대표 색상 (플레이버 휠과 동일)
  var SCA_CAT_COLORS = {
    Fruity: "#E24B4A", Floral: "#D4537E", Sweet: "#EF9F27",
    "Nutty/Cocoa": "#854F0B", Spices: "#993C1D", Roasted: "#5F5E5A",
    "Green/Vegetative": "#639922", "Sour/Fermented": "#D85A30", Other: "#888888",
  };

  function getDominantColor(record) {
    var rec = record && typeof record === "object" ? record : {};
    var intensities = rec.flavorIntensities && typeof rec.flavorIntensities === "object" ? rec.flavorIntensities : {};
    var selections = Array.isArray(rec.flavorSelections) ? rec.flavorSelections : [];

    var maxEn = "";
    var maxVal = 0;
    for (var en in intensities) {
      if (intensities[en] > maxVal) {
        maxVal = intensities[en];
        maxEn = en;
      }
    }
    // 가장 강한 향미의 카테고리 색상 반환 (플레이버 휠과 일치)
    for (var i = 0; i < selections.length; i++) {
      if (selections[i].en === maxEn) {
        return SCA_CAT_COLORS[selections[i].category] || selections[i].color || "#8C7355";
      }
    }
    // flavorSelections 없으면 첫 번째 것 사용
    if (selections.length > 0) {
      return SCA_CAT_COLORS[selections[0].category] || selections[0].color || "#8C7355";
    }
    return "#8C7355";
  }

  function getFlagUrl(country) {
    var codes = {
      "에티오피아": "et",
      "케냐": "ke",
      "콜롬비아": "co",
      "파나마": "pa",
      "과테말라": "gt",
      "브라질": "br",
      "코스타리카": "cr",
      "인도네시아": "id",
      "르완다": "rw",
      "탄자니아": "tz",
      "예멘": "ye",
      "인도": "in",
      "베트남": "vn",
      "중국": "cn",
      "태국": "th",
      "미얀마": "mm",
      "하와이": "us",
      "자메이카": "jm",
    };
    var code = codes[country] || "un";
    return "https://flagcdn.com/w20/" + code + ".png";
  }

  var COUNTRY_SILHOUETTES = {
    "에티오피아": '<svg viewBox="0 0 100 100"><path d="M30 20L50 15L75 25L85 45L80 70L60 85L35 80L20 60L25 35Z"/></svg>',
    "케냐": '<svg viewBox="0 0 100 100"><path d="M35 15L55 10L70 20L75 45L65 70L50 80L30 70L25 45Z"/></svg>',
    "콜롬비아": '<svg viewBox="0 0 100 100"><path d="M40 10L55 15L65 30L60 50L55 70L45 85L30 75L25 50L30 25Z"/></svg>',
    "브라질": '<svg viewBox="0 0 100 100"><path d="M25 20L50 10L75 20L85 40L80 65L60 80L35 85L15 65L20 40Z"/></svg>',
    "파나마": '<svg viewBox="0 0 100 100"><path d="M10 45L30 35L50 40L70 35L90 45L75 55L55 50L35 55L15 55Z"/></svg>',
    "과테말라": '<svg viewBox="0 0 100 100"><path d="M25 25L45 15L60 20L70 35L75 55L65 75L45 85L30 70L20 50Z"/></svg>',
    "코스타리카": '<svg viewBox="0 0 100 100"><path d="M30 30L45 20L60 25L70 40L66 58L55 72L40 68L30 52Z"/></svg>',
    "인도네시아": '<svg viewBox="0 0 100 100"><path d="M35 20L55 25L65 40L80 55L65 75L45 82L30 68L20 45Z"/></svg>',
  };

  function getCountrySilhouette(country) {
    return COUNTRY_SILHOUETTES[country] || '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30"/></svg>';
  }

  /* ── Recipe CRUD ── */
  function getRecipes() {
    var r = getFromStorage(STORAGE_KEYS.RECIPES, []);
    return Array.isArray(r) ? r : [];
  }
  function addRecipe(recipe) {
    var list = getRecipes();
    if (!recipe.id) recipe.id = "recipe_" + Date.now();
    if (!recipe.createdAt) recipe.createdAt = new Date().toISOString();
    list.unshift(recipe);
    saveToStorage(STORAGE_KEYS.RECIPES, list);
    return recipe.id;
  }
  function getRecipeById(id) {
    return getRecipes().find(function (r) { return r.id === id; }) || null;
  }
  function updateRecipe(id, updates) {
    var list = getRecipes();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in updates) list[i][k] = updates[k];
        saveToStorage(STORAGE_KEYS.RECIPES, list);
        return true;
      }
    }
    return false;
  }

  if (typeof global.openCamera === "undefined") global.openCamera = openCamera;

  /* ══════════════════════════════════════
     공통 컴포넌트: 원두 검색/선택 바텀시트
     어디서든 CoffeeNote.openCoffeeSearch(callback) 호출
     ══════════════════════════════════════ */
  function openCoffeeSearch(onSelect) {
    var existing = document.getElementById("coffeeSearchSheet");
    if (existing) existing.remove();

    var html =
      '<div id="coffeeSearchSheet" class="sheetOverlay open" aria-hidden="false">' +
      '<div class="sheetPanel" style="max-height:85vh;overflow-y:auto">' +
      '<div class="sheetHandle"></div>' +
      '<h2 class="sheetTitle">원두 선택</h2>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px">' +
      '<button type="button" class="chip" id="csTabSearch" style="flex:1" data-cstab="search">검색</button>' +
      '<button type="button" class="chip" id="csTabSaved" style="flex:1" data-cstab="saved">저장된 원두</button>' +
      '<button type="button" class="chip" id="csTabDirect" style="flex:1" data-cstab="direct">직접 입력</button>' +
      '</div>' +
      '<div id="csSearchArea" style="display:none"><div class="search-bar" style="margin-bottom:12px"><input type="search" id="csQuery" class="search-input" placeholder="원두 이름 검색" style="padding:12px 14px"/><button type="button" class="search-btn" id="csSearchBtn" style="padding:12px 16px">검색</button></div><div id="csResults"></div></div>' +
      '<div id="csSavedArea" style="display:none"><div id="csSavedList"></div></div>' +
      '<div id="csDirectArea" style="display:none"><input type="text" id="csDirectName" placeholder="원두 이름을 직접 입력" style="margin-bottom:12px"/><button type="button" class="btn-primary" id="csDirectConfirm">이 이름으로 진행</button></div>' +
      '<button type="button" class="btn-secondary" id="csClose" style="margin-top:12px">닫기</button>' +
      '</div></div>';

    document.body.insertAdjacentHTML("beforeend", html);
    var sheet = document.getElementById("coffeeSearchSheet");
    var activeTab = "";

    function switchTab(tab) {
      activeTab = tab;
      ["csSearchArea", "csSavedArea", "csDirectArea"].forEach(function (id) {
        document.getElementById(id).style.display = "none";
      });
      sheet.querySelectorAll("[data-cstab]").forEach(function (b) {
        b.classList.toggle("selected", b.getAttribute("data-cstab") === tab);
      });
      if (tab === "search") {
        document.getElementById("csSearchArea").style.display = "block";
        document.getElementById("csQuery").focus();
      } else if (tab === "saved") {
        document.getElementById("csSavedArea").style.display = "block";
        renderSaved();
      } else if (tab === "direct") {
        document.getElementById("csDirectArea").style.display = "block";
        document.getElementById("csDirectName").focus();
      }
    }

    function renderSaved() {
      var allCoffees = getCoffees();
      var favs = getFavorites();
      // 사용자 등록 원두 + 즐겨찾기 원두만 표시
      var items = [];
      allCoffees.forEach(function (c, i) {
        if (c.source === "user_created" || favs.indexOf(i) >= 0) {
          items.push({ coffee: c, index: i });
        }
      });
      var list = document.getElementById("csSavedList");
      if (!items.length) {
        list.innerHTML = '<div class="empty" style="padding:12px">직접 등록하거나 즐겨찾기한 원두가 없습니다.<br/>검색에서 원두를 찾아 즐겨찾기에 추가해보세요.</div>';
        return;
      }
      list.innerHTML = items.map(function (item) {
        var c = item.coffee;
        var badge = c.source === "user_created" ? '<span style="font-size:11px;color:var(--accent-warm);margin-left:6px">직접등록</span>' : '<span style="font-size:11px;color:var(--text-sub);margin-left:6px">즐겨찾기</span>';
        return '<div class="listCard card" style="cursor:pointer;margin-bottom:1px;padding:14px 16px" data-ci="' + item.index + '"><p style="font-size:14px;font-weight:600;color:var(--text);margin:0">' + esc(c.name) + badge + '</p><p style="font-size:12px;color:var(--text-sub);margin:4px 0 0">' + esc(c.roaster || "") + '</p></div>';
      }).join("");
      list.querySelectorAll("[data-ci]").forEach(function (el) {
        el.addEventListener("click", function () {
          var ci = Number(el.getAttribute("data-ci"));
          close();
          if (onSelect) onSelect({ coffee: allCoffees[ci], index: ci });
        });
      });
    }

    function doSearch() {
      var q = document.getElementById("csQuery").value.trim();
      if (!q) return;
      addSearchHistory(q);
      var pairs = searchCoffeePairs(q);
      var results = document.getElementById("csResults");
      if (!pairs.length) {
        results.innerHTML = '<div class="empty" style="padding:12px">결과가 없습니다. 직접 입력해보세요.</div>';
        return;
      }
      results.innerHTML = pairs.map(function (p) {
        return '<div class="listCard card" style="cursor:pointer;margin-bottom:1px;padding:14px 16px" data-si="' + p.index + '"><p style="font-size:14px;font-weight:600;color:var(--text);margin:0">' + esc(p.coffee.name) + '</p><p style="font-size:12px;color:var(--text-sub);margin:4px 0 0">' + esc(p.coffee.roaster || "") + " · " + esc(formatProcessDisplay(p.coffee)) + '</p></div>';
      }).join("");
      results.querySelectorAll("[data-si]").forEach(function (el) {
        el.addEventListener("click", function () {
          var si = Number(el.getAttribute("data-si"));
          close();
          if (onSelect) onSelect({ coffee: getCoffees()[si], index: si });
        });
      });
    }

    function esc(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function close() {
      sheet.classList.remove("open");
      setTimeout(function () { sheet.remove(); }, 300);
    }

    // 이벤트
    sheet.querySelectorAll("[data-cstab]").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-cstab")); });
    });
    document.getElementById("csSearchBtn").addEventListener("click", doSearch);
    document.getElementById("csQuery").addEventListener("keydown", function (e) { if (e.key === "Enter") doSearch(); });
    document.getElementById("csDirectConfirm").addEventListener("click", function () {
      var name = document.getElementById("csDirectName").value.trim();
      if (!name) { showToast("이름을 입력하세요"); return; }
      close();
      if (onSelect) onSelect({ coffee: { name: name, source: "direct_input" }, index: -1 });
    });
    document.getElementById("csClose").addEventListener("click", close);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });

    // 기본 탭: 검색
    switchTab("search");
  }

  global.CoffeeNote = {
    SCA_WHEEL: SCA_WHEEL,
    findScaFlavorByEn: findScaFlavorByEn,
    findScaFlavorByKo: findScaFlavorByKo,
    STORAGE_KEYS: STORAGE_KEYS,
    getFromStorage: getFromStorage,
    saveToStorage: saveToStorage,
    ensureCoffeesInitialized: ensureCoffeesInitialized,
    getCoffees: getCoffees,
    saveCoffees: saveCoffees,
    getCoffeeByIndex: getCoffeeByIndex,
    addCoffee: addCoffee,
    updateCoffee: updateCoffee,
    getFavorites: getFavorites,
    setFavorites: setFavorites,
    toggleFavorite: toggleFavorite,
    isFavorite: isFavorite,
    getTastingRecords: getTastingRecords,
    addTastingRecord: addTastingRecord,
    getSearchHistory: getSearchHistory,
    addSearchHistory: addSearchHistory,
    getNickname: getNickname,
    setNickname: setNickname,
    normalize: normalize,
    searchCoffeePairs: searchCoffeePairs,
    toneClass: toneClass,
    starsHtml: starsHtml,
    formatProcessDisplay: formatProcessDisplay,
    resolveProcessCategory: resolveProcessCategory,
    heartIconHtml: function (filled) {
      return filled ? SVG_HEART_FILL : SVG_HEART_OUTLINE;
    },
    showToast: showToast,
    renderBottomNav: renderBottomNav,
    openCamera: openCamera,
    openCoffeeMap: openCoffeeMap,
    openPhotoSearchSheet: openPhotoSearchSheet,
    closePhotoSearchSheet: closePhotoSearchSheet,
    consumeScanIntent: consumeScanIntent,
    normalizeTastingRecord: normalizeTastingRecord,
    getDominantColor: getDominantColor,
    getFlagUrl: getFlagUrl,
    getCountrySilhouette: getCountrySilhouette,
    getRecipes: getRecipes,
    addRecipe: addRecipe,
    getRecipeById: getRecipeById,
    updateRecipe: updateRecipe,
    openCoffeeSearch: openCoffeeSearch,
  };
})(typeof window !== "undefined" ? window : globalThis);
