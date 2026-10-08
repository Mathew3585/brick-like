const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** 01:24:07 */
export const clock = (s: number) => `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;

/** "2 h 14", "14 min", "42 s" */
export function duration(s: number) {
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${pad((s % 3600) / 60)}`;
  if (s >= 60) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s)} s`;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export function longDate(d = new Date()) {
  const s = dateFmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ago(t: number, now = Date.now()) {
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} j`;
}
