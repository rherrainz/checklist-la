export const MONTH_LABELS = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function getCurrentPeriod(d = new Date()) {
  const m = d.getMonth() + 1;
  const quarter = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
  return { year: d.getFullYear(), quarter, month: m };
}

export function monthsForQuarter(q) {
  if (q === 1) return [1,2,3];
  if (q === 2) return [4,5,6];
  if (q === 3) return [7,8,9];
  return [10,11,12];
}

export function monthLabel(n) {
  return MONTH_LABELS[n] || n;
}
