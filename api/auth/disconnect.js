export default function handler(req, res) {
  res.setHeader("Set-Cookie", [
    "gmail_access=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    "gmail_refresh=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  ]);
  const base = process.env.BASE_URL || "https://claused.co";
  res.redirect(302, base);
}
