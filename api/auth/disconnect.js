export default function handler(req, res) {
  res.setHeader("Set-Cookie", [
    "gmail_access=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    "gmail_refresh=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  ]);
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = process.env.BASE_URL || `${proto}://${host}`;
  res.redirect(302, base);
}
