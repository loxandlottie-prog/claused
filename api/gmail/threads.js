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

// Strip Re:, Fwd:, OOO headers ("OOO | 4/1-4/7 Re:", "Automatic Reply:", etc.)
// Repeats until no more known prefixes remain.
function stripSubjectPrefixes(subject) {
  if (!subject) return "";
  let s = subject.trim();
  const PREFIX = /^(?:re|fwd?|oo+|out of office|automatic reply|auto.?reply)[^:]*:\s*/i;
  let prev;
  do { prev = s; s = s.replace(PREFIX, "").trim(); } while (s !== prev);
  return s;
}

// Recursively extract plain text from a Gmail message payload (handles multipart MIME).
// Only decodes up to ~3000 chars to keep things fast.
function getTextBody(payload) {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    try {
      const text = Buffer.from(payload.body.data, "base64url").toString("utf-8");
      return text.slice(0, 3000);
    } catch { return ""; }
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = getTextBody(part);
      if (text) return text;
    }
  }
  return "";
}

// Extract a brand name from the plain-text body of the first email in a thread.
// Looks for common agency/brand outreach patterns.
function extractBrandFromBody(text) {
  if (!text) return null;
  const intro = text.slice(0, 2000);
  const patterns = [
    // "reaching out on behalf of Fresh Step"
    /\bon behalf of\s+([A-Z][A-Za-z0-9&'.() ]{1,40?}?)(?:\s*[,!.]|\s+(?:to|and|would|is|has)\b)/,
    // "I'm Sarah from Fresh Step —"
    /\bfrom\s+([A-Z][A-Za-z0-9&'. ]{1,30}?)(?:\s*[—\-,!.]|\s+(?:and|&|to|is|has|would|we|our)\b)/,
    // "our team at Fresh Step"  /  "I work at Fresh Step"
    /\bat\s+([A-Z][A-Za-z0-9&'. ]{1,30}?)(?:\s*[—\-,!.]|\s+(?:and|&|to|is|has|would|we|our)\b)/,
    // "Fresh Step is looking to / would love to / is excited to"
    /\b([A-Z][A-Za-z0-9&'. ]{1,30}?)\s+(?:is looking to|would love to|is excited to|has a campaign|is reaching out|is interested in)/,
    // "representing Fresh Step"
    /\brepresenting\s+([A-Z][A-Za-z0-9&'. ]{1,30}?)(?:\s*[,!.]|\s+(?:and|to|in)\b)/i,
  ];
  for (const pat of patterns) {
    const m = intro.match(pat);
    const candidate = m?.[1]?.trim();
    // Sanity check: at least 2 chars, not a common false-positive word
    if (candidate && candidate.length >= 2 && !/^(hi|hey|hope|happy|thanks|thank|please|just|we|i|the|our|your|this|that)$/i.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

// When the brand is known but the sender is an agency, guess the brand's own domain.
// e.g. "Fresh Step" → "freshstep.com". Logo cascade handles misses gracefully.
function guessBrandDomain(brandName) {
  return brandName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") + ".com";
}

// Returns { brand, senderIsAgency }
// senderIsAgency = true when brand was inferred from subject/body (sender ≠ brand)
function toBrandInfo(contact, domain, subject, bodyText) {
  const clean = stripSubjectPrefixes(subject);

  // 1. Subject: "Brand x Creator ..." or "Brand Campaign/Partnership/..."
  if (clean) {
    const xMatch = clean.match(/^([A-Z][A-Za-z0-9&' ]{1,30}?)\s+[xX×]\s+/);
    if (xMatch) return { brand: xMatch[1].trim(), senderIsAgency: true };
    const labelMatch = clean.match(/^([A-Z][A-Za-z0-9&' ]{1,30}?)\s+(?:Campaign|Partnership|Collab(?:oration)?|Sponsorship|Ambassador)\b/i);
    if (labelMatch) return { brand: labelMatch[1].trim(), senderIsAgency: true };
  }

  // 2. Email body — scan all message bodies for brand mention patterns
  const bodyBrand = extractBrandFromBody(bodyText);
  if (bodyBrand) {
    const domainWord = domain.split(".")[0].toLowerCase();
    const isAgency = !bodyBrand.toLowerCase().replace(/\s+/g, "").includes(domainWord);
    return { brand: bodyBrand, senderIsAgency: isAgency };
  }

  // 3. Sender name: "... at Brand Name"
  const name = contact.name;
  const atMatch = name.match(/\bat\s+([A-Z][A-Za-z0-9&', .]+)/)?.[1];
  if (atMatch) return { brand: atMatch.trim(), senderIsAgency: true };

  // 4. Sender name: "Brand Team / Brand Partnerships"
  const teamMatch = name.match(/^([A-Z][A-Za-z0-9&]+(?:\s[A-Z][A-Za-z0-9&]+)?)\s+(?:team|partnerships|collab|brand)/i)?.[1];
  if (teamMatch) return { brand: teamMatch.trim(), senderIsAgency: false };

  // 5. Fall back to sender domain — sender IS the brand
  const host = domain.replace(/^(mail\.|em\.|email\.|mg\.|send\.|news\.)/, "");
  const parts = host.split(".");
  const raw = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  return { brand: raw.charAt(0).toUpperCase() + raw.slice(1), senderIsAgency: false };
}

function toISODate(raw) {
  try { return new Date(raw).toISOString().slice(0, 10); }
  catch { return new Date().toISOString().slice(0, 10); }
}

// Build a concise deal summary from all message bodies.
// Examples: "Paid · 4x Reels + 2x Stories · $9,200"  /  "Gifted product · TikTok + Stories"  /  "Affiliate program"
function extractOfferSummary(msgs) {
  const bodies = msgs.map((m) => getTextBody(m.payload)).join("\n");
  if (!bodies.trim()) return null;

  const text = bodies.slice(0, 8000);

  // --- compensation type ---
  let compType = null;
  if (/\bgifted\b|\bproduct seeding\b|\bsend you\b/i.test(text) && !/\bpaid\b|\bcompensation\b|\bbudget\b|\brate\b|\bfee\b/i.test(text)) {
    compType = "Gifted product";
  } else if (/\baffiliate\b/i.test(text)) {
    compType = "Affiliate";
  } else if (/\bpaid\b|\bsponsored\b|\bcompensation\b|\bbudget\b|\brate\b|\bfee\b/i.test(text)) {
    compType = "Paid";
  } else if (/\bambassador\b/i.test(text)) {
    compType = "Ambassador";
  }

  // --- deliverable types (with counts where possible) ---
  const delivTypes = [];
  // Match patterns like "2 Reels", "4x TikTok", "one Instagram Story", etc.
  const DELIV_PATTERNS = [
    { re: /(\d+)\s*[x×]?\s*(?:instagram\s+)?reels?/gi, label: "Reel" },
    { re: /(\d+)\s*[x×]?\s*(?:instagram\s+)?stor(?:y|ies)/gi, label: "Story" },
    { re: /(\d+)\s*[x×]?\s*tiktok\s+(?:video|post)?s?/gi, label: "TikTok" },
    { re: /(\d+)\s*[x×]?\s*youtube\s+(?:video|short)?s?/gi, label: "YouTube" },
    { re: /(\d+)\s*[x×]?\s*(?:static\s+)?posts?/gi, label: "Post" },
  ];
  // Also catch mentions without counts
  const MENTION_PATTERNS = [
    { re: /\breels?\b/i, label: "Reels" },
    { re: /\bstori(?:es|y)\b/i, label: "Stories" },
    { re: /\btiktok\b/i, label: "TikTok" },
    { re: /\byoutube\b/i, label: "YouTube" },
    { re: /\bstatic\s+post\b/i, label: "Static post" },
  ];

  const counted = new Map(); // label → max count seen
  for (const { re, label } of DELIV_PATTERNS) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const n = parseInt(m[1], 10);
      if (!counted.has(label) || n > counted.get(label)) counted.set(label, n);
    }
  }
  if (counted.size > 0) {
    for (const [label, n] of counted) delivTypes.push(`${n}x ${label}`);
  } else {
    // Fall back to plain mentions
    for (const { re, label } of MENTION_PATTERNS) {
      if (re.test(text) && !delivTypes.includes(label)) delivTypes.push(label);
    }
  }

  // --- dollar amount ---
  let amount = null;
  const dollarMatches = [...text.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:USD|usd)?/g)];
  if (dollarMatches.length > 0) {
    // Take the largest plausible figure (avoids $0 or tiny numbers)
    const nums = dollarMatches.map((m) => parseFloat(m[1].replace(/,/g, ""))).filter((n) => n >= 50);
    if (nums.length > 0) amount = Math.max(...nums);
  }

  // --- assemble ---
  const parts = [];
  if (compType) parts.push(compType);
  if (delivTypes.length > 0) parts.push(delivTypes.join(" + "));
  if (amount) parts.push(`$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`);

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

// Extract the most recent actionable next step from the last brand message.
// Returns a short string like "Please share your rate card" or null.
function extractNextStep(msgs, userEmail) {
  if (!msgs || msgs.length === 0) return null;

  // Find the last message NOT from the user (i.e. from the brand/agency)
  let brandMsg = null;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const from = parseFrom(getHeader(msgs[i], "From"));
    if (!userEmail || from.email.toLowerCase() !== userEmail.toLowerCase()) {
      brandMsg = msgs[i];
      break;
    }
  }
  if (!brandMsg) return null;

  const body = getTextBody(brandMsg.payload);
  if (!body) return null;

  const text = body.slice(0, 3000);

  // Sentence-level scan for action-request patterns
  const sentences = text.split(/(?<=[.!?])\s+/);
  const ACTION_RE = /\b(could you|can you|please|would you|let us know|let me know|kindly|we need|we'd love|we would love|waiting for|looking forward to hearing|share your|send us|send over|confirm|reply|respond|get back)\b/i;
  const DEADLINE_RE = /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\w+ \d+|end of (?:the )?(?:week|month|day)|\d{1,2}\/\d{1,2})\b/i;

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (s.length < 10 || s.length > 200) continue;
    if (ACTION_RE.test(s)) {
      // Clean up: strip leading/trailing junk, collapse whitespace
      const clean = s.replace(/\s+/g, " ").replace(/^[^A-Za-z]+/, "").trim();
      if (clean.length > 5) return clean.replace(/[.!?]+$/, "");
    }
  }

  // Check for a deadline mention in the whole text even if no action sentence found
  const deadlineMatch = text.match(DEADLINE_RE);
  if (deadlineMatch) return `Deadline: ${deadlineMatch[0]}`;

  return null;
}

const CLOSED_KEYWORDS = [
  "invoice", "invoiced", "payment received", "payment sent", "paid",
  "signed contract", "contract signed", "deal confirmed", "confirmed",
  "looking forward to working", "excited to work together",
  "partnership confirmed", "content approved", "post approved",
  "w9", "w-9", "tax form", "wire transfer", "ach payment",
];

const SKIP_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "noreply.github.com", "accounts.google.com", "notifications.google.com",
  // Amazon — bulk marketing/program emails, never direct brand-deal outreach
  "amazon.com", "store-news.amazon.com", "affiliate-program.amazon.com",
  "associates.amazon.com", "m.amazonservices.com", "amazon.co.uk",
  // Other high-volume automated platforms
  "substack.com", "beehiiv.com", "convertkit.com", "mailchimp.com",
  "constantcontact.com", "klaviyo.com", "sendgrid.net", "mailgun.org",
]);
// Also skip local-parts that look like automated/bulk senders:
// covers: store-news, noreply-store, order-updates, digest-weekly, etc.
const SKIP_LOCAL = /^(noreply|no-reply|donotreply|notifications?|mailer|bounce|support|hello|info|newsletter|marketing|alerts?|unsubscribe|digest|updates?|deals?|offers?|promos?|coupons?|store-\w+|\w+-news|\w+-updates?|\w+-alerts?|\w+-noreply)$/i;

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

  // Fetch each thread with headers + body parts (for brand extraction from body text)
  const fields = "messages(id,snippet,payload(headers,mimeType,body(data),parts(mimeType,body(data),parts(mimeType,body(data)))))";
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

      const cleanedSubject = stripSubjectPrefixes(subject);
      // Concatenate body text from all messages for brand extraction
      const allBodyText = msgs.map((m) => getTextBody(m.payload)).join("\n");
      const { brand, senderIsAgency } = toBrandInfo(contact, domain, subject, allBodyText);
      const offerSummary = extractOfferSummary(msgs);
      const inferredNextStep = extractNextStep(msgs, userEmail);
      const displayDomain = senderIsAgency ? guessBrandDomain(brand) : domain;
      const colorIdx = brand.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;
      const initials = brand.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
      const status = inferStatus(msgs, userEmail);

      return {
        id: thread.id,
        brand,
        logo: initials,
        logoColor: colors[colorIdx],
        domain: displayDomain,
        contact,
        firstReached: toISODate(firstDate),
        lastMessage: toISODate(lastDate),
        offer: offerSummary || cleanedSubject,
        inferredNextStep,
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
