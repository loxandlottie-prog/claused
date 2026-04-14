function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k.trim()] = v.join("=");
  });
  return out;
}

// Search buffer for dollar amounts — works for plain text, HTML, and
// text-based PDFs (dollar signs + digits are usually stored as ASCII).
function extractAmounts(buf) {
  const text = buf.toString("latin1");
  const found = new Set();
  const regex = /\$\s{0,3}([\d,]+(?:\.\d{2})?)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (n >= 50 && n <= 500000) found.add(n);
  }
  return [...found].sort((a, b) => b - a).slice(0, 10);
}

export default async function handler(req, res) {
  const { msgId, attachmentId } = req.query;
  if (!msgId || !attachmentId) return res.status(400).json({ error: "missing params" });

  const cookies = parseCookies(req);
  const accessToken = cookies.gmail_access;
  if (!accessToken) return res.status(401).json({ error: "not_connected" });

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/attachments/${attachmentId}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) return res.status(r.status).json({ error: "fetch_failed" });

  const data = await r.json();
  const buf = Buffer.from(data.data || "", "base64url");
  const amounts = extractAmounts(buf);

  res.json({ amounts, size: data.size });
}
