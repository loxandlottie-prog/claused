export function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k.trim()] = v.join("=");
  });
  return out;
}

/**
 * Returns the authenticated user's email, or null if not logged in.
 * Fast path: reads from the gmail_email cookie set during OAuth callback.
 * Fallback: calls Google userinfo API (for sessions created before the cookie was added).
 */
export async function getUserEmail(req) {
  const cookies = parseCookies(req);

  if (cookies.gmail_email) {
    return decodeURIComponent(cookies.gmail_email);
  }

  if (cookies.gmail_access) {
    const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${cookies.gmail_access}` },
    }).catch(() => null);
    if (r?.ok) {
      const info = await r.json();
      return info?.email || null;
    }
  }

  return null;
}
