export const threads = [];

export const analyticsData = {
  thisYear: {
    year: new Date().getFullYear(),
    monthly: [0,0,0,0,0,0,0,0,0,0,0,0],
    totalBrands: 0,
    dealsClosedCount: 0,
    revenue: 0,
    closeRate: 0,
  },
  lastYear: {
    year: new Date().getFullYear() - 1,
    monthly: [0,0,0,0,0,0,0,0,0,0,0,0],
    totalBrands: 0,
    dealsClosedCount: 0,
    revenue: 0,
    closeRate: 0,
  },
  funnel: [
    { label: "Reached out",  count: 0 },
    { label: "Got response", count: 0 },
    { label: "Negotiating",  count: 0 },
    { label: "Closed",       count: 0 },
  ],
  categories: [],
};
