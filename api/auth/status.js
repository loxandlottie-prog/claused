function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k.trim()] = v.join("=");
  });
  return out;
}

async function getUserInfo(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function handler(req, res) {
  const { gmail_access, gmail_refresh } = parseCookies(req);
  if (!gmail_access && !gmail_refresh) {
    return res.json({ connected: false });
  }
  const info = await getUserInfo(gmail_access).catch(() => null);
  res.json({ connected: true, email: info?.email || null, name: info?.name || null });
}
