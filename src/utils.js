export function daysSince(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((today - d) / (1000 * 60 * 60 * 24));
}

export function formatCurrency(n) {
  if (!n && n !== 0) return "—";
  return "$" + Number(n).toLocaleString();
}

export function fmtDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// Parse a pasted email or DM thread into structured brand data
export function parseThread(text) {
  const result = {
    brand: "",
    contactName: "",
    contactEmail: "",
    offer: "",
    theirRate: null,
    yourRate: null,
  };

  // Email address
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) result.contactEmail = emailMatch[0];

  // Brand from email domain or explicit mentions
  if (result.contactEmail) {
    const domain = result.contactEmail.split("@")[1];
    const domainBrand = domain.split(".")[0];
    result.brand = domainBrand.charAt(0).toUpperCase() + domainBrand.slice(1);
  }
  const brandOverride =
    text.match(/(?:from|at|with|team at|on behalf of)\s+([A-Z][A-Za-z0-9 &.'-]{2,30})(?:\s|,|!|\.|$)/)?.[1] ||
    text.match(/(?:I'?m|I am)[^,.\n]*?(?:from|at|with)\s+([A-Z][A-Za-z0-9 &.'-]{2,30})/i)?.[1];
  if (brandOverride) result.brand = brandOverride.trim();

  // Contact name
  const nameMatch =
    text.match(/(?:^|from:?\s*)([A-Z][a-z]+ [A-Z][a-z]+)(?:\s|,|<|\n)/m) ||
    text.match(/(?:I'?m|my name is)\s+([A-Z][a-z]+ [A-Z][a-z]+)/i) ||
    text.match(/(?:best|thanks|cheers|regards),?\s*\n\s*([A-Z][a-z]+ [A-Z][a-z]+)/i);
  if (nameMatch) result.contactName = nameMatch[1].trim();

  // Offer type
  const offerKeywords = [
    ["instagram reel", "Instagram Reel"],
    ["ig reel", "Instagram Reel"],
    ["tiktok video", "TikTok Video"],
    ["tiktok", "TikTok"],
    ["youtube video", "YouTube Video"],
    ["instagram story", "Instagram Story"],
    ["sponsored post", "Sponsored Post"],
    ["paid partnership", "Paid Partnership"],
    ["product seeding", "Product Seeding"],
    ["unboxing", "Unboxing Video"],
    ["ambassador", "Brand Ambassador"],
    ["content licensing", "Content Licensing"],
    ["collaboration", "Collaboration"],
  ];
  const lc = text.toLowerCase();
  const foundOffers = [];
  for (const [kw, label] of offerKeywords) {
    if (lc.includes(kw) && !foundOffers.includes(label)) foundOffers.push(label);
  }
  if (foundOffers.length) result.offer = foundOffers.slice(0, 2).join(" + ");

  // Rates — find all dollar amounts, treat the largest as their offer
  const amounts = [...text.matchAll(/\$\s*([\d,]+(?:\.\d{2})?)/g)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => n > 0)
    .sort((a, b) => b - a);
  if (amounts.length > 0) result.theirRate = amounts[0];

  return result;
}
