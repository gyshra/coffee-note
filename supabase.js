/**
 * 커피 노트 — Supabase 연동 모듈
 * ===================================================
 * ⚠️  아래 두 줄에 본인의 Supabase 프로젝트 정보를 입력하세요.
 *    Supabase 대시보드 → Settings → API 에서 확인할 수 있습니다.
 * ===================================================
 */
const SUPABASE_URL = "YOUR_SUPABASE_URL";        // 예: https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"; // 예: eyJhbGciOi...

// ===================================================
// 아래는 수정하지 마세요
// ===================================================

(function (global) {
  "use strict";

  var _isConfigured = (
    SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
    SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY"
  );

  function getClient() {
    if (!_isConfigured) return null;
    if (!global.supabase) return null;
    if (!getClient._client) {
      getClient._client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return getClient._client;
  }

  // ─── 인증 (Auth) ───────────────────────────────────

  var SupaAuth = {
    /**
     * 현재 로그인된 사용자 반환 (없으면 null)
     */
    getUser: async function () {
      var client = getClient();
      if (!client) return null;
      try {
        var res = await client.auth.getUser();
        return res.data.user || null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Google 소셜 로그인 (팝업 방식)
     */
    loginWithGoogle: async function () {
      var client = getClient();
      if (!client) {
        alert("Supabase 설정이 필요합니다. supabase.js 파일을 확인해주세요.");
        return;
      }
      try {
        var { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin + "/mypage.html",
          },
        });
        if (error) throw error;
      } catch (e) {
        console.error("[CoffeeNote] Google 로그인 오류:", e);
        alert("로그인 중 오류가 발생했습니다.");
      }
    },

    /**
     * 로그아웃
     */
    logout: async function () {
      var client = getClient();
      if (!client) return;
      try {
        await client.auth.signOut();
        window.location.reload();
      } catch (e) {
        console.error("[CoffeeNote] 로그아웃 오류:", e);
      }
    },

    /**
     * 인증 상태 변경 감지 콜백 등록
     * callback(user) — user가 null이면 로그아웃 상태
     */
    onAuthChange: function (callback) {
      var client = getClient();
      if (!client) return;
      client.auth.onAuthStateChange(function (event, session) {
        callback(session ? session.user : null);
      });
    },
  };

  // ─── 데이터베이스 (DB) ──────────────────────────────

  var SupaDB = {
    /**
     * 테이스팅 기록 저장
     * record: localStorage에 저장되는 기존 객체와 동일한 형태
     */
    saveTasting: async function (record) {
      var client = getClient();
      if (!client) return null;
      var user = await SupaAuth.getUser();
      if (!user) return null;

      try {
        var row = {
          user_id: user.id,
          local_id: record.id,               // localStorage 기준 ID (중복 방지용)
          coffee_name: record.coffeeName || record.name || "",
          coffee_index: record.coffeeIndex != null ? record.coffeeIndex : null,
          aroma: record.sliders ? record.sliders["아로마"] : null,
          acidity: record.sliders ? record.sliders["산미"] : null,
          sweetness: record.sliders ? record.sliders["단맛"] : null,
          body: record.sliders ? record.sliders["바디감"] : null,
          aftertaste: record.sliders ? record.sliders["여운"] : null,
          flavor_tags: record.flavorSelections || record.tags || [],
          brew_method: record.brewMethod || null,
          memo: record.memo || null,
          rating: record.rating || null,
          created_at: record.createdAt || new Date().toISOString(),
          raw_data: JSON.stringify(record),   // 전체 원본 보존
        };

        var { data, error } = await client
          .from("tastings")
          .upsert(row, { onConflict: "local_id,user_id" })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (e) {
        console.error("[CoffeeNote] 테이스팅 저장 오류:", e);
        return null;
      }
    },

    /**
     * 사용자의 테이스팅 기록 전체 조회 (최신순)
     */
    getTastings: async function () {
      var client = getClient();
      if (!client) return [];
      var user = await SupaAuth.getUser();
      if (!user) return [];

      try {
        var { data, error } = await client
          .from("tastings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        // raw_data를 파싱해서 반환 (기존 코드와 호환)
        return (data || []).map(function (row) {
          try {
            return JSON.parse(row.raw_data);
          } catch (e) {
            return row;
          }
        });
      } catch (e) {
        console.error("[CoffeeNote] 테이스팅 조회 오류:", e);
        return [];
      }
    },

    /**
     * 즐겨찾기 추가
     * coffeeIndex: 원두 인덱스 (localStorage 기준)
     * coffeeName: 원두 이름 (표시용)
     */
    saveFavorite: async function (coffeeIndex, coffeeName) {
      var client = getClient();
      if (!client) return null;
      var user = await SupaAuth.getUser();
      if (!user) return null;

      try {
        var { data, error } = await client
          .from("favorites")
          .upsert(
            {
              user_id: user.id,
              coffee_index: coffeeIndex,
              coffee_name: coffeeName || "",
            },
            { onConflict: "user_id,coffee_index" }
          )
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (e) {
        console.error("[CoffeeNote] 즐겨찾기 저장 오류:", e);
        return null;
      }
    },

    /**
     * 즐겨찾기 삭제
     */
    removeFavorite: async function (coffeeIndex) {
      var client = getClient();
      if (!client) return;
      var user = await SupaAuth.getUser();
      if (!user) return;

      try {
        var { error } = await client
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("coffee_index", coffeeIndex);

        if (error) throw error;
      } catch (e) {
        console.error("[CoffeeNote] 즐겨찾기 삭제 오류:", e);
      }
    },

    /**
     * 사용자의 즐겨찾기 목록 조회
     * 반환: coffee_index 배열
     */
    getFavorites: async function () {
      var client = getClient();
      if (!client) return [];
      var user = await SupaAuth.getUser();
      if (!user) return [];

      try {
        var { data, error } = await client
          .from("favorites")
          .select("coffee_index")
          .eq("user_id", user.id);

        if (error) throw error;
        return (data || []).map(function (r) { return r.coffee_index; });
      } catch (e) {
        console.error("[CoffeeNote] 즐겨찾기 조회 오류:", e);
        return [];
      }
    },

    /**
     * localStorage 데이터를 Supabase로 마이그레이션
     * 로그인 직후 1회 실행 → 기존 데이터를 클라우드에 업로드
     */
    migrateFromLocalStorage: async function () {
      var user = await SupaAuth.getUser();
      if (!user) return;

      var CN = window.CoffeeNote;
      if (!CN) return;

      var migrationKey = "cn_migrated_" + user.id;
      if (localStorage.getItem(migrationKey)) return; // 이미 마이그레이션 완료

      console.log("[CoffeeNote] localStorage → Supabase 마이그레이션 시작...");

      // 테이스팅 기록 업로드
      var records = CN.getTastingRecords ? CN.getTastingRecords() : [];
      for (var i = 0; i < records.length; i++) {
        await SupaDB.saveTasting(records[i]);
      }

      // 즐겨찾기 업로드
      var favorites = CN.getFavoriteIndices ? CN.getFavoriteIndices() : [];
      var allCoffees = CN.getCoffees ? CN.getCoffees() : [];
      for (var j = 0; j < favorites.length; j++) {
        var coffee = allCoffees[favorites[j]];
        var name = coffee ? (coffee.name || "") : "";
        await SupaDB.saveFavorite(favorites[j], name);
      }

      localStorage.setItem(migrationKey, "1");
      console.log("[CoffeeNote] 마이그레이션 완료!");
    },
  };

  // 전역 노출
  global.SupaAuth = SupaAuth;
  global.SupaDB = SupaDB;
})(window);
