/**
 * GET /api/config
 * 클라이언트에 공개해도 되는 설정값만 반환 (anon key는 공개 가능)
 * 민감한 service_role 키는 절대 포함하지 않음
 */
module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=86400"); // 1일 캐시

  if (req.method === "OPTIONS") return res.status(200).end();

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  || process.env.SUPABASE_URL  || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!url || !anon) {
    return res.status(200).json({ configured: false });
  }

  return res.status(200).json({
    configured: true,
    supabaseUrl: url,
    supabaseAnonKey: anon,
  });
};
