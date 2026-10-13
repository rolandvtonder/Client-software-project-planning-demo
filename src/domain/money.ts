import type {Cents} from './types';

const NBSP = ' '; // narrow no-break space, the SA thousands separator

/** `R 1 250,00` — SA format. Integer cents in, string out. */
export function formatRand(cents: Cents, opts: {decimals?: boolean} = {}): string {
  const decimals = opts.decimals ?? true;
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const body = decimals ? `${grouped},${frac.toString().padStart(2, '0')}` : grouped;
  return `${negative ? '−' : ''}R${NBSP}${body}`;
}

export const rand = (rands: number): Cents => Math.round(rands * 100);

/** Percentage of an amount, rounded to the cent. */
export const pct = (amount: Cents, percent: number): Cents => Math.round((amount * percent) / 100);

/** Round up to the nearest R50 — deposits are quoted in round numbers. */
export const roundUpTo50 = (cents: Cents): Cents => Math.ceil(cents / 5000) * 5000;
