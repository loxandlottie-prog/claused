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
    /\bon behalf of\s+([A-Z][A-Za-z0-9&'.()\- ]{1,40?}?)(?:\s*[,!.]|\s+(?:to|and|would|is|has)\b)/,
    // "I'm Sarah from Fresh Step —"
    /\bfrom\s+([A-Z][A-Za-z0-9&'.\- ]{1,30}?)(?:\s*[—\-,!.]|\s+(?:and|&|to|is|has|would|we|our)\b)/,
    // "our team at Fresh Step"  /  "I work at Fresh Step"
    /\bat\s+([A-Z][A-Za-z0-9&'.\- ]{1,30}?)(?:\s*[—\-,!.]|\s+(?:and|&|to|is|has|would|we|our)\b)/,
    // "Fresh Step is looking to / would love to / is excited to"
    /\b([A-Z][A-Za-z0-9&'.\- ]{1,30}?)\s+(?:is looking to|would love to|is excited to|has a campaign|is reaching out|is interested in)/,
    // "representing Fresh Step"
    /\brepresenting\s+([A-Z][A-Za-z0-9&'.\- ]{1,30}?)(?:\s*[,!.]|\s+(?:and|to|in)\b)/i,
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

// Convert ALL-CAPS brand names to Title Case ("CATTASAURUS" → "Cattasaurus")
function normalizeBrandName(name) {
  if (!name) return name;
  if (name === name.toUpperCase() && name.length > 2) {
    return name.charAt(0) + name.slice(1).toLowerCase();
  }
  return name;
}

// Returns { brand, senderIsAgency }
// senderIsAgency = true when brand was inferred from subject/body (sender ≠ brand)
function toBrandInfo(contact, domain, subject, bodyText) {
  const clean = stripSubjectPrefixes(subject);

  // 1. Subject: "Brand x Creator ..." or "Brand Campaign/Partnership/..."
  // No ^ anchor — brand name may appear anywhere in the subject
  // (e.g. "Collaboration Proposal: CATTASAURUS x Lox and Latke")
  if (clean) {
    // "Brand x Creator" pattern
    const xMatch = clean.match(/\b([A-Z][A-Za-z0-9&'.\- ]{1,30}?)\s+[xX×]\s+/);
    if (xMatch) return { brand: normalizeBrandName(xMatch[1].trim()), senderIsAgency: true };

    // Pipe-separator pattern: "Open Farm Pet | Terms for Ambassador Program"
    // The segment BEFORE the pipe is the brand name; the segment after describes the campaign.
    const pipeIdx = clean.indexOf(" | ");
    if (pipeIdx > 0) {
      const beforePipe = clean.slice(0, pipeIdx).trim();
      // Accept if it starts with a capital and isn't a generic phrase
      if (beforePipe.length >= 2 && /^[A-Z]/.test(beforePipe) &&
          !/^(re|fwd?|hi|hey|hello|thanks|update|news|offer|terms|collab|partnership|sponsorship|campaign|ambassador)\b/i.test(beforePipe)) {
        return { brand: normalizeBrandName(beforePipe), senderIsAgency: true };
      }
    }

    // "Brand Campaign/Partnership/Ambassador" pattern.
    // No /i flag — requires uppercase start so "fect" (after "Purr-") can't be a match start.
    // Exclude space from the match so it can't cross pipe-like boundaries or grab descriptor words.
    const labelMatch = clean.match(/\b([A-Z][A-Za-z0-9&'.\-]{1,20}(?:\s[A-Z][A-Za-z0-9&'.\-]{1,20}){0,3}?)\s+(?:Campaign|Partnership|Collab(?:oration)?|Sponsorship|Ambassador)\b/);
    if (labelMatch) return { brand: normalizeBrandName(labelMatch[1].trim()), senderIsAgency: true };
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

  // 5. Sender display name is the brand when the local part is a role/department address.
  //    e.g. "Open Farm" <reviews@yotpo.com> — "reviews" signals a platform sender, "Open Farm" is the brand.
  const ROLE_LOCAL = /^(reviews?|social|collab|partnership|brand|marketing|hello|info|team|pr|press|media|campaigns?|creators?|influencers?|gifting|seeding|ambassador|sponsor|noreply|no-reply|hello|support)s?$/i;
  const localPart2 = contact.email.split("@")[0];
  if (ROLE_LOCAL.test(localPart2) && contact.name && contact.name.length >= 2) {
    const domainWord = domain.split(".")[0].toLowerCase();
    const isAgency = !contact.name.toLowerCase().replace(/\s+/g, "").includes(domainWord);
    return { brand: contact.name.trim(), senderIsAgency: isAgency };
  }

  // 6. Fall back to sender domain — sender IS the brand
  const host = domain.replace(/^(mail\.|em\.|email\.|mg\.|send\.|news\.)/, "");
  const parts = host.split(".");
  const raw = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  return { brand: raw.charAt(0).toUpperCase() + raw.slice(1), senderIsAgency: false };
}

function toISODate(raw) {
  try { return new Date(raw).toISOString().slice(0, 10); }
  catch { return new Date().toISOString().slice(0, 10); }
}

// Recursively collect attachment metadata from a message payload.
function getAttachments(payload, msgId) {
  const out = [];
  const scan = (parts) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        out.push({
          filename: part.filename,
          attachmentId: part.body.attachmentId,
          msgId,
          mimeType: part.mimeType || "",
          size: part.body.size || 0,
        });
      }
      if (part.parts) scan(part.parts);
    }
  };
  scan(payload?.parts);
  return out;
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
  // Review / loyalty / creator-tool platforms — not brand-deal senders
  "yotpo.com", "stamped.io", "okendo.io", "loox.io", "junip.co",
  "beacons.ai", "hello.beacons.ai", "linktree.com",
  // Adobe marketing emails
  "e.adobe.com", "adobe.com",
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

function inferStatus(msgs, lastMsg, userEmail) {
  const first = msgs[0];
  const last = lastMsg;
  const subject = getHeader(first, "Subject").toLowerCase();
  const snippet = (last.snippet || "").toLowerCase();
  const allText = subject + " " + snippet;

  // Completed if strong deal-completion signals
  if (CLOSED_KEYWORDS.some((kw) => allText.includes(kw))) return "completed";

  // New if user hasn't replied yet (last message is from brand, not user)
  const lastLabels = last?.labelIds || [];
  if (!lastLabels.includes("SENT")) return "new";

  return "negotiating";
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
  // labelIds: detect SENT messages regardless of From address/alias
  // internalDate: server-assigned Unix ms timestamp — more reliable than the Date header
  const fields = "id,messages(id,snippet,labelIds,internalDate,payload(headers,mimeType,body(data,attachmentId,size),parts(mimeType,filename,body(data,attachmentId,size),parts(mimeType,filename,body(data,attachmentId,size),parts(mimeType,filename,body(data,attachmentId,size))))))";
  const details = await Promise.all(
    threads.slice(0, 100).map(({ id }) =>
      gmailFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?fields=${encodeURIComponent(fields)}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );

  // Gmail often omits internalDate for SENT messages in the threads endpoint.
  // For threads whose last message has no timestamp, fetch that message individually
  // via the messages endpoint which reliably returns internalDate for all message types.
  const missingTsmsgs = details
    .filter(Boolean)
    .flatMap((thread) => {
      const msgs = thread.messages || [];
      const last = msgs[msgs.length - 1];
      if (!last) return [];
      const ts = parseInt(last.internalDate || 0);
      if (ts > 0) return [];
      // Also check Date header fallback before adding to supplement list
      const dateVal = (last?.payload?.headers || []).find(
        (h) => h.name.toLowerCase() === "date"
      )?.value || "";
      const dateTs = dateVal ? new Date(dateVal).getTime() : 0;
      if (dateTs > 0) return [];
      return [last.id];
    });

  // Build a msgId → internalDate map from supplemental fetches
  const supplementalTs = {};
  if (missingTsmsgs.length > 0) {
    const fetched = await Promise.all(
      missingTsmsgs.map((msgId) =>
        gmailFetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=METADATA&metadataHeaders=Date`
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );
    fetched.forEach((msg) => {
      if (!msg) return;
      const ts = parseInt(msg.internalDate || 0);
      if (ts > 0) { supplementalTs[msg.id] = ts; return; }
      // Fallback: try Date header from metadata response
      const dateVal = (msg?.payload?.headers || []).find(
        (h) => h.name.toLowerCase() === "date"
      )?.value || "";
      if (dateVal) {
        const t = new Date(dateVal).getTime();
        if (t > 0) supplementalTs[msg.id] = t;
      }
    });
  }

  const colors = [
    "#7C5CFC","#F59E0B","#10B981","#3B82F6","#EF4444",
    "#EC4899","#8B5CF6","#0EA5E9","#F97316","#14B8A6",
  ];

  const parsed = details
    .filter(Boolean)
    .map((thread) => {
      const msgs = thread.messages || [];
      if (msgs.length === 0) return null;

      // "first" must be the first message FROM THE BRAND — never from us.
      // If internalDate is missing/zero on sent messages they'd sort to position 0
      // and make first = our own email, triggering the gmail.com SKIP_DOMAINS filter.
      const allSent = msgs.every((m) => (m.labelIds || []).includes("SENT"));
      const firstBrand = msgs.find((m) => !(m.labelIds || []).includes("SENT")) || msgs[0];

      // Gmail returns messages in chronological order — the last element is always the most recent.
      // Using a timestamp-based reduce was unreliable because internalDate is often omitted
      // for sent messages, causing them to "lose" the reduce and the first message to win.
      const last = msgs[msgs.length - 1];

      const msgTs = (m) => {
        const id = parseInt(m.internalDate || 0);
        if (id > 0) return id;
        // Check supplemental timestamps fetched individually for SENT messages
        if (m.id && supplementalTs[m.id]) return supplementalTs[m.id];
        try { const t = new Date(getHeader(m, "Date")).getTime(); if (t > 0) return t; } catch {}
        return 0;
      };

      // For display dates, scan from the relevant position backwards until we find a valid timestamp.
      const scanTs = (arr, fromIdx) => {
        for (let i = fromIdx; i >= 0; i--) {
          const t = msgTs(arr[i]);
          if (t > 0) return t;
        }
        return 0;
      };

      // For user-initiated threads (no brand reply yet), flip to use the To header
      // so we get the brand's email/domain rather than filtering on gmail.com.
      const firstMsg = msgs[0];
      const fromRaw = allSent ? getHeader(firstMsg, "To") : getHeader(firstBrand, "From");
      const subject = getHeader(allSent ? firstMsg : firstBrand, "Subject");
      const firstTs = scanTs(msgs, msgs.indexOf(firstBrand));
      const firstDate = firstTs > 0 ? new Date(firstTs).toISOString() : getHeader(firstBrand, "Date");
      const lastTs = scanTs(msgs, msgs.length - 1);
      const lastDate = lastTs > 0 ? new Date(lastTs).toISOString() : getHeader(last, "Date");

      const contact = parseFrom(fromRaw);
      const domain = contact.email.split("@")[1] || "";

      if (SKIP_DOMAINS.has(domain)) return null;
      // For user-initiated outreach don't filter on local part — the user deliberately
      // emailed this address (e.g. partnerships@brand.com, hello@brand.com).
      if (!allSent && SKIP_LOCAL.test(contact.email.split("@")[0])) return null;
      if (!contact.email.includes("@")) return null;

      const cleanedSubject = stripSubjectPrefixes(subject);

      // Filter noise: subjects that are clearly not brand-deal outreach
      // (newsletter blasts, platform welcome emails, Instagram growth pitches, etc.)
      const NOISE_SUBJECT = /\b(welcome to\b|insider update\b|grow your (following|instagram|tiktok|audience|account)\b|invitation to join\b|casting (opps?|opportunities?)\b|join our (program|platform|network)\b|unsubscribe\b)/i;
      if (NOISE_SUBJECT.test(cleanedSubject || subject)) return null;
      // For user-initiated threads, use the sent body for brand extraction.
      // Otherwise use only received messages to avoid polluting brand/offer detection.
      const receivedMsgs = msgs.filter((m) => !(m.labelIds || []).includes("SENT"));
      const bodyMsgs = allSent ? msgs : receivedMsgs;
      const allBodyText = bodyMsgs.map((m) => getTextBody(m.payload)).join("\n");
      const { brand, senderIsAgency } = toBrandInfo(contact, domain, subject, allBodyText);
      const displayDomain = senderIsAgency ? guessBrandDomain(brand) : domain;
      const colorIdx = brand.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;
      const initials = brand.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
      const status = inferStatus(msgs, last, userEmail);
      const attachments = msgs.flatMap((m) => getAttachments(m.payload, m.id));

      return {
        id: thread.id,
        brand,
        senderIsAgency,
        senderDomain: domain,
        logo: initials,
        logoColor: colors[colorIdx],
        domain: displayDomain,
        contact,
        firstReached: toISODate(firstDate),
        lastMessage: toISODate(lastDate),
        offer: cleanedSubject,
        yourRate: null,
        status,
        revenue: null,
        category: "",
        messageCount: msgs.length,
        attachments,
        source: "gmail",
      };
    })
    .filter(Boolean);

  // Dedup key:
  // - Non-agency senders: key by sender domain. Multiple threads from openfarmpet.com
  //   all belong to the same brand regardless of whether the subject said "Open Farm"
  //   or "Open Farm Pet". Domain is authoritative.
  // - Agency senders: key by brand name. "Fresh Step" and "Petlibro" both sent via
  //   autumncommunications.com must stay as separate cards.
  const brandNameKey = (name) => name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const dedupKey = (t) => t.senderIsAgency ? brandNameKey(t.brand) : t.senderDomain.toLowerCase();

  const grouped = {};
  for (const t of parsed) {
    const key = dedupKey(t);
    if (!grouped[key]) {
      grouped[key] = { ...t, subThreads: [] };
    } else {
      const g = grouped[key];
      // Earliest first contact
      if (t.firstReached < g.firstReached) g.firstReached = t.firstReached;
      // Latest message wins for id, contact, offer, lastMessage, AND status.
      // Status must follow the most recent thread — an old OOO or stale thread
      // must never override the status of a more recent exchange.
      if (t.lastMessage > g.lastMessage) {
        // Current main thread becomes a sub-thread
        g.subThreads.push({ id: g.id, offer: g.offer, lastMessage: g.lastMessage, contact: g.contact });
        g.lastMessage = t.lastMessage;
        g.id = t.id;
        g.contact = t.contact;
        g.offer = t.offer;
        g.status = t.status;
      } else {
        g.subThreads.push({ id: t.id, offer: t.offer, lastMessage: t.lastMessage, contact: t.contact });
      }
      g.messageCount = (g.messageCount || 1) + (t.messageCount || 1);
      // Merge attachments from all threads for this brand
      g.attachments = [...(g.attachments || []), ...(t.attachments || [])];
    }
  }

  res.json(Object.values(grouped));
}
