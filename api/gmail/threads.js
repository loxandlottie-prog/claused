function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k.trim()] = v.join("=");
  });
  return out;
}

async function refreshAccessToken(refreshToken, res) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const data = await r.json();
  if (data.access_token) {
    res.setHeader(
      "Set-Cookie",
      `gmail_access=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
    );
    return data.access_token;
  }
  return null;
}

function getHeader(msg, name) {
  const h = (msg?.payload?.headers || []).find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return h?.value || "";
}

function parseFrom(raw) {
  const angleMatch = raw.match(/^(.*?)\s*<([^>]+)>/);
  if (angleMatch) {
    return { name: angleMatch[1].replace(/"/g, "").trim(), email: angleMatch[2].trim() };
  }
  const emailMatch = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  return { name: "", email: emailMatch ? emailMatch[0] : raw };
}

function toBrandName(contact, domain) {
  const name = contact.name;
  const brandFromName =
    name.match(/\bat\s+([A-Z][A-Za-z0-9& .]+)/)?.[1] ||
    name.match(/^([A-Z][A-Za-z0-9&]+(?:\s[A-Z][A-Za-z0-9&]+)?)\s+(?:team|partnerships|collab|brand)/i)?.[1];
  if (brandFromName) return brandFromName.trim();
  const host = domain.replace(/^(mail\.|em\.|email\.|mg\.|send\.|news\.)/, "");
  const parts = host.split(".");
  const raw = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function toISODate(raw) {
  try { return new Date(raw).toISOString().slice(0, 10); }
  catch { return new Date().toISOString().slice(0, 10); }
}

const CLOSED_KEYWORDS = [
  "invoice", "invoiced", "payment received", "payment sent", "paid",
  "signed contract", "contract signed", "deal confirmed", "confirmed",
  "looking forward to working", "excited to work together",
  "partnership confirmed", "content approved", "post approved",
  "w9", "w-9", "tax form", "wire transfer", "ach payment",
];

const SKIP_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "noreply.github.com",
  "accounts.google.com", "notifications.google.com",
]);
const SKIP_LOCAL = /^(noreply|no-reply|donotreply|notifications?|mailer|bounce|support|hello|info|newsletter|marketing|alerts?)$/i;

const BRAND_QUERY = [
  "collaboration", "sponsorship", "partnership", "sponsored",
  "ambassador", '"paid partnership"', '"brand deal"',
  '"work together"', "collab", '"gifted"', '"product seeding"',
  '"content creator"', '"influencer"',
].join(" OR ");

function inferStatus(msgs, userEmail) {
  const first = msgs[0];
  const last = msgs[msgs.length - 1];
  const subject = getHeader(first, "Subject").toLowerCase();
  const snippet = (last.snippet || "").toLowerCase();
  const allText = subject + " " + snippet;

  // Closed if strong deal-completion signals
  if (CLOSED_KEYWORDS.some((kw) => allText.includes(kw))) return "deal_closed";

  // Determine who sent the last message
  if (userEmail) {
    const lastFrom = parseFrom(getHeader(last, "From"));
    const weSentLast = lastFrom.email.toLowerCase() === userEmail.toLowerCase();
    if (weSentLast) return "waiting_on_them";
  }

  // If there are multiple messages, we've at least replied at some point
  if (msgs.length > 2) return "waiting_on_them";
  if (msgs.length === 2) return "you_replied";

  return "reply_needed";
}

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  let accessToken = cookies.gmail_access;
  const refreshToken = cookies.gmail_refresh;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "not_connected" });
  }

  const gmailFetch = (url) =>
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(BRAND_QUERY)}&maxResults=40`;
  let listRes = await gmailFetch(listUrl);

  if (listRes.status === 401 && refreshToken) {
    accessToken = await refreshAccessToken(refreshToken, res);
    if (!accessToken) return res.status(401).json({ error: "token_expired" });
    listRes = await gmailFetch(listUrl);
  }

  if (!listRes.ok) return res.status(listRes.status).json({ error: "gmail_fetch_failed" });

  const { threads = [] } = await listRes.json();
  if (threads.length === 0) return res.json([]);

  // Get connected user's email for status inference
  const userInfoRes = await gmailFetch("https://www.googleapis.com/oauth2/v2/userinfo");
  const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};
  const userEmail = userInfo.email || null;

  // Fetch each thread — include snippet by omitting format=metadata
  // Use fields param to keep payload small (no base64 body)
  const fields = "messages(id,snippet,payload(headers))";
  const details = await Promise.all(
    threads.slice(0, 30).map(({ id }) =>
      gmailFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?fields=${encodeURIComponent(fields)}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );

  const colors = [
    "#7C5CFC","#F59E0B","#10B981","#3B82F6","#EF4444",
    "#EC4899","#8B5CF6","#0EA5E9","#F97316","#14B8A6",
  ];

  const parsed = details
    .filter(Boolean)
    .map((thread) => {
      const msgs = thread.messages || [];
      const first = msgs[0];
      const last = msgs[msgs.length - 1];

      const fromRaw = getHeader(first, "From");
      const subject = getHeader(first, "Subject");
      const firstDate = getHeader(first, "Date");
      const lastDate = getHeader(last, "Date");

      const contact = parseFrom(fromRaw);
      const domain = contact.email.split("@")[1] || "";

      if (SKIP_DOMAINS.has(domain)) return null;
      const localPart = contact.email.split("@")[0];
      if (SKIP_LOCAL.test(localPart)) return null;
      if (!contact.email.includes("@")) return null;

      const brand = toBrandName(contact, domain);
      const colorIdx = brand.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;
      const initials = brand.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
      const status = inferStatus(msgs, userEmail);

      return {
        id: thread.id,
        brand,
        logo: initials,
        logoColor: colors[colorIdx],
        domain,
        contact,
        firstReached: toISODate(firstDate),
        lastMessage: toISODate(lastDate),
        offer: subject,
        theirRate: null,
        yourRate: null,
        status,
        revenue: null,
        category: "",
        messageCount: msgs.length,
        source: "gmail",
      };
    })
    .filter(Boolean);

  res.json(parsed);
}
