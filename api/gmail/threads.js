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

function toBrandName(contact, domain, subject) {
  // 1. Subject line: "Brand x Creator ..." or "Brand Campaign/Partnership/Collab"
  if (subject) {
    const clean = subject.replace(/^(re|fwd|fw):\s*/i, "").trim();
    const xMatch = clean.match(/^([A-Z][A-Za-z0-9&' ]{1,30}?)\s+[xX×]\s+/);
    if (xMatch) return xMatch[1].trim();
    const labelMatch = clean.match(/^([A-Z][A-Za-z0-9&' ]{1,30}?)\s+(?:Campaign|Partnership|Collab(?:oration)?|Sponsorship|Ambassador)\b/i);
    if (labelMatch) return labelMatch[1].trim();
  }

  // 2. Sender name: "... at Brand Name" (common in agency signatures)
  const name = contact.name;
  const atMatch = name.match(/\bat\s+([A-Z][A-Za-z0-9&', .]+)/)?.[1];
  if (atMatch) return atMatch.trim();

  // 3. Sender name starts with "Brand Team / Brand Partnerships"
  const teamMatch = name.match(/^([A-Z][A-Za-z0-9&]+(?:\s[A-Z][A-Za-z0-9&]+)?)\s+(?:team|partnerships|collab|brand)/i)?.[1];
  if (teamMatch) return teamMatch.trim();

  // 4. Fall back to sender domain
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
  // Standard partnership language
  "collaboration", "collaborating", "sponsorship", "partnership", "sponsored",
  "ambassador", "collab", '"brand deal"', '"paid partnership"',
  // Campaign language (agency-managed deals like "Fresh Step x Creator Campaign")
  "campaign", '"content brief"', '"creative brief"', '"posting instructions"',
  '"go live"', '"concept feedback"', '"content feedback"', '"phase 1"', '"phase 2"',
  // Common real-world outreach phrases
  '"work with you"', '"work with us"', '"work together"',
  '"would love to partner"', '"opportunity to partner"',
  '"content opportunity"', '"creator opportunity"', '"creator program"',
  // Gifting / seeding
  '"gifted"', '"product seeding"', '"send you"', '"gifting"',
  // Creator / influencer terms
  '"content creator"', '"influencer"', '"rate card"',
  '"brand collaboration"', '"brand partnership"',
  // Compensation signals
  '"paid collaboration"', '"paid campaign"', '"sponsored content"',
  '"our budget"', '"compensation"', "deliverables",
  // Soft offer / rate negotiation
  '"soft offer"', '"formal offer"', '"going rates"', '"current rates"',
  '"usage rights"', '"exclusivity"',
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

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(BRAND_QUERY)}&maxResults=150`;
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
    threads.slice(0, 100).map(({ id }) =>
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

      const brand = toBrandName(contact, domain, subject);
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

  // Deduplicate by brand name (not domain) so agency-managed deals stay separate.
  // e.g. "Fresh Step" and "Petlibro" both emailed via autumncommunications.com
  // should remain two distinct cards.
  const STATUS_PRIORITY = { reply_needed: 0, you_replied: 1, waiting_on_them: 2, deal_closed: 3 };
  const grouped = {};
  for (const t of parsed) {
    const key = t.brand.toLowerCase();
    if (!grouped[key]) {
      grouped[key] = { ...t };
    } else {
      const g = grouped[key];
      // Earliest first contact
      if (t.firstReached < g.firstReached) g.firstReached = t.firstReached;
      // Latest message wins for id, contact, offer, lastMessage
      if (t.lastMessage > g.lastMessage) {
        g.lastMessage = t.lastMessage;
        g.id = t.id;
        g.contact = t.contact;
        g.offer = t.offer;
      }
      // Most urgent status
      if ((STATUS_PRIORITY[t.status] ?? 99) < (STATUS_PRIORITY[g.status] ?? 99)) {
        g.status = t.status;
      }
      g.messageCount = (g.messageCount || 1) + (t.messageCount || 1);
    }
  }

  res.json(Object.values(grouped));
}
