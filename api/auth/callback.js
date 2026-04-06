export default async function handler(req, res) {
  const base = process.env.BASE_URL || "https://claused.co";
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(302, `${base}/?gmail=error`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${base}/api/auth/callback`,
      grant_type: "authorization_code",
    }).toString(),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    console.error("Token exchange error:", tokens.error);
    return res.redirect(302, `${base}/?gmail=error`);
  }

  const maxAge = 60 * 60 * 24 * 365;
  const cookieBase = `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  const cookies = [`gmail_access=${tokens.access_token}; ${cookieBase}`];
  if (tokens.refresh_token) {
    cookies.push(`gmail_refresh=${tokens.refresh_token}; ${cookieBase}`);
  }
  res.setHeader("Set-Cookie", cookies);
  res.redirect(302, `${base}/?gmail=connected`);
}
