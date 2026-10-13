import type {ISODate} from './types';

const pad = (n: number) => n.toString().padStart(2, '0');

export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (iso: ISODate): Date => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = (): ISODate => toISO(new Date());

export const addDays = (iso: ISODate, days: number): ISODate => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};

export const daysBetween = (a: ISODate, b: ISODate): number =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** `Sat 13 Dec 2026` */
export function formatDate(iso: ISODate, opts: {weekday?: boolean; year?: boolean} = {}): string {
  const d = fromISO(iso);
  const parts = [`${d.getDate()} ${MON[d.getMonth()]}`];
  if (opts.year ?? true) parts.push(String(d.getFullYear()));
  return (opts.weekday ?? true ? `${DAY[d.getDay()]} ` : '') + parts.join(' ');
}

export const formatShort = (iso: ISODate) => formatDate(iso, {weekday: false, year: false});

export function formatDateTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return `${formatDate(toISO(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "today", "tomorrow", "in 5 days", "3 days ago" */
export function relative(iso: ISODate, from: ISODate = today()): string {
  const n = daysBetween(from, iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export const monthKey = (iso: ISODate) => iso.slice(0, 7);
