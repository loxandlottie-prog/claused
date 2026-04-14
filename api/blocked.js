import { getUserEmail } from "./_lib/auth.js";
import { getSupabase } from "./_lib/supabase.js";

export default async function handler(req, res) {
  const email = await getUserEmail(req);
  if (!email) return res.status(401).json({ error: "not_authenticated" });

  const sb = getSupabase();

  // GET /api/blocked — return array of dedup keys the user has blocked
  if (req.method === "GET") {
    const { data, error } = await sb
      .from("blocked_threads")
      .select("dedup_key")
      .eq("user_email", email);

    if (error) return res.status(500).json({ error: error.message });
    return res.json((data || []).map((r) => r.dedup_key));
  }

  // POST /api/blocked — mark a thread as "not a deal" permanently
  // Body: { dedup_key: string }
  if (req.method === "POST") {
    const { dedup_key } = req.body || {};
    if (!dedup_key) return res.status(400).json({ error: "missing dedup_key" });

    const { error } = await sb
      .from("blocked_threads")
      .upsert(
        { user_email: email, dedup_key },
        { onConflict: "user_email,dedup_key" }
      );

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "method not allowed" });
}
