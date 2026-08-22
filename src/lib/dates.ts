export function newId(): string {
  return crypto.randomUUID();
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string): string {
  const date = parseISODate(iso);
  const week = "日一二三四五六"[date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日 周${week}`;
}

export function formatShort(iso: string): string {
  const date = parseISODate(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function addDays(iso: string, delta: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + delta);
  return todayISO(date);
}

export function compactDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}${d}`;
}
