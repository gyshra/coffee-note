/**
 * 커피 노트 — Supabase 연동 모듈 v2
 * ====================================================
 * ✅ 환경변수 자동 주입 방식 — 이 파일 수정 불필요
 *    Vercel 대시보드 → Settings → Environment Variables:
 *      NEXT_PUBLIC_SUPABASE_URL
 *      NEXT_PUBLIC_SUPABASE_ANON_KEY
 * ====================================================
 */
(function (global) {
  "use strict";

  var _client = null;
  var _configPromise = null;

  function loadConfig() {
    if (_configPromise) return _configPromise;
    _configPromise = fetch("/api/config")
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (!cfg.configured) return null;
        if (global.supabase) {
          _client = global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        }
        return _client;
      })
      .catch(function (e) {
        console.warn("[SupaDB] config 로드 실패:", e.message);
        return null;
      });
    return _configPromise;
  }

  function getClient() { return _client; }

  loadConfig();

  /* ────── Auth ────── */
  var SupaAuth = {
    getUser: async function () {
      await loadConfig();
      var c = getClient(); if (!c) return null;
      try { return (await c.auth.getUser()).data.user || null; } catch (e) { return null; }
    },

    loginWithGoogle: async function () {
      await loadConfig();
      var c = getClient();
      if (!c) { alert("Supabase 환경변수를 Vercel에 설정해주세요."); return; }
      try {
        var { error } = await c.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin + "/mypage.html" },
        });
        if (error) throw error;
      } catch (e) { console.error("[SupaAuth]", e); alert("로그인 오류: " + e.message); }
    },

    logout: async function () {
      var c = getClient(); if (!c) return;
      try { await c.auth.signOut(); window.location.reload(); } catch (e) {}
    },

    onAuthChange: function (cb) {
      loadConfig().then(function () {
        var c = getClient();
        if (!c) { cb(null); return; }
        c.auth.onAuthStateChange(function (_, session) { cb(session ? session.user : null); });
        c.auth.getUser().then(function (res) { cb(res.data.user || null); });
      });
    },
  };

  /* ────── DB ────── */
  var SupaDB = {
    saveTasting: async function (record) {
      await loadConfig();
      var c = getClient(); if (!c) return null;
      var user = await SupaAuth.getUser(); if (!user) return null;
      try {
        var bs = record.baseScores || record.scores || {};
        var tags = (record.flavorSelections || []).map(function (f) { return f.ko || f.en || ""; });
        var row = {
          user_id: user.id,
          local_id: String(record.id || record.createdAt || Date.now()),
          coffee_name: record.coffeeName || "",
          coffee_index: record.coffeeIndex != null ? Number(record.coffeeIndex) : null,
          aroma:       bs["아로마"]  || null,
          acidity:     bs["산미"]    || null,
          sweetness:   bs["단맛"]    || null,
          body:        bs["바디감"]  || null,
          aftertaste:  bs["여운"]    || null,
          flavor_tags: tags,
          brew_method: record.brewMethod || null,
          memo:        record.memo || null,
          rating:      record.starRating || record.rating || null,
          is_public:   true,
          created_at:  record.createdAt || new Date().toISOString(),
          raw_data:    JSON.stringify(record),
        };
        var { data, error } = await c.from("tastings")
          .upsert(row, { onConflict: "local_id,user_id" }).select().single();
        if (error) throw error;
        return data;
      } catch (e) { console.error("[SupaDB] saveTasting:", e.message); return null; }
    },

    getTastings: async function () {
      await loadConfig();
      var c = getClient(); if (!c) return [];
      var user = await SupaAuth.getUser(); if (!user) return [];
      try {
        var { data, error } = await c.from("tastings").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(function (row) {
          try { return JSON.parse(row.raw_data); } catch (e) { return row; }
        });
      } catch (e) { console.error("[SupaDB] getTastings:", e.message); return []; }
    },

    toggleFavorite: async function (coffeeIndex, coffeeName) {
      await loadConfig();
      var c = getClient(); if (!c) return null;
      var user = await SupaAuth.getUser(); if (!user) return null;
      try {
        var { data: ex } = await c.from("favorites").select("id")
          .eq("user_id", user.id).eq("coffee_index", coffeeIndex).maybeSingle();
        if (ex) {
          await c.from("favorites").delete().eq("id", ex.id);
          return { action: "removed" };
        }
        var { data, error } = await c.from("favorites")
          .insert({ user_id: user.id, coffee_index: coffeeIndex, coffee_name: coffeeName || "" })
          .select().single();
        if (error) throw error;
        return { action: "added", data };
      } catch (e) { console.error("[SupaDB] toggleFavorite:", e.message); return null; }
    },

    getFavorites: async function () {
      await loadConfig();
      var c = getClient(); if (!c) return [];
      var user = await SupaAuth.getUser(); if (!user) return [];
      try {
        var { data, error } = await c.from("favorites").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) { return []; }
    },

    migrateLocalData: async function () {
      if (!global.CoffeeNote) return;
      var records = global.CoffeeNote.getTastingRecords() || [];
      if (!records.length) return;
      var migrated = 0;
      for (var i = 0; i < records.length; i++) {
        if (await SupaDB.saveTasting(records[i])) migrated++;
      }
      if (migrated > 0) {
        global.CoffeeNote && global.CoffeeNote.showToast("☁️ " + migrated + "개 기록을 클라우드에 저장했어요!");
      }
    },
  };

  global.SupaAuth = SupaAuth;
  global.SupaDB   = SupaDB;
  global._supaLoadConfig = loadConfig;

})(window);
