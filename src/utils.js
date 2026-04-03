export function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export function detectConflicts(deals) {
  const active = deals.filter((d) => d.stage !== "paid");
  const conflicts = [];
  const seen = new Set();

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (!a.category || a.category !== b.category) continue;

      const key = [a.id, b.id].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);

      let overlapStart = null;
      let overlapEnd = null;
      let isConflict = false;

      if (a.exclusivityStart && a.exclusivityEnd && b.exclusivityStart && b.exclusivityEnd) {
        const aStart = new Date(a.exclusivityStart + "T00:00:00");
        const aEnd   = new Date(a.exclusivityEnd   + "T00:00:00");
        const bStart = new Date(b.exclusivityStart + "T00:00:00");
        const bEnd   = new Date(b.exclusivityEnd   + "T00:00:00");
        const oStart = aStart > bStart ? aStart : bStart;
        const oEnd   = aEnd   < bEnd   ? aEnd   : bEnd;
        if (oStart <= oEnd) {
          isConflict  = true;
          overlapStart = oStart.toISOString().slice(0, 10);
          overlapEnd   = oEnd.toISOString().slice(0, 10);
        }
      } else {
        // No explicit dates — same active category is a potential conflict
        isConflict = true;
      }

      if (isConflict) {
        conflicts.push({ category: a.category, deals: [a, b], overlapStart, overlapEnd });
      }
    }
  }

  return conflicts;
}

export function formatCurrency(n) {
  return "$" + Number(n).toLocaleString();
}
