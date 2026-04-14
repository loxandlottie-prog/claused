import { getUserEmail } from "./_lib/auth.js";
import { getSupabase } from "./_lib/supabase.js";

export default async function handler(req, res) {
  const email = await getUserEmail(req);
  if (!email) return res.status(401).json({ error: "not_authenticated" });

  const sb = getSupabase();

  // GET /api/overrides — return all overrides for this user as { thread_id: data } map
  if (req.method === "GET") {
    const { data, error } = await sb
      .from("deal_overrides")
      .select("thread_id, data")
      .eq("user_email", email);

    if (error) return res.status(500).json({ error: error.message });

    const map = {};
    (data || []).forEach((row) => { map[row.thread_id] = row.data; });
    return res.json(map);
  }

  // PUT /api/overrides — upsert a single thread's full override object
  // Body: { thread_id: string, data: object }
  if (req.method === "PUT") {
    const { thread_id, data } = req.body || {};
    if (!thread_id || typeof data !== "object") {
      return res.status(400).json({ error: "missing thread_id or data" });
    }

    const { error } = await sb
      .from("deal_overrides")
      .upsert(
        { user_email: email, thread_id, data, updated_at: new Date().toISOString() },
        { onConflict: "user_email,thread_id" }
      );

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "method not allowed" });
}
