export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export function detectConflicts(deals) {
  const active = deals.filter((d) => d.stage !== "paid");
  const categoryMap = {};
  active.forEach((deal) => {
    if (!categoryMap[deal.category]) categoryMap[deal.category] = [];
    categoryMap[deal.category].push(deal);
  });
  return Object.entries(categoryMap)
    .filter(([, group]) => group.length > 1)
    .map(([category, groupDeals]) => ({ category, deals: groupDeals }));
}

export function formatCurrency(n) {
  return "$" + Number(n).toLocaleString();
}
