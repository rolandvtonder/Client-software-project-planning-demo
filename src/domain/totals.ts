import {pct, roundUpTo50} from './money';
import type {Cents, Charge, Job, Line, Payment, Settings} from './types';

export const lineTotal = (l: Line): Cents => Math.round(l.qty * l.unitPrice * (1 - l.discountPct / 100));

export type Totals = {
  itemsSubtotal: Cents;
  discount: Cents;
  delivery: Cents;
  setup: Cents;
  net: Cents;
  vat: Cents;
  total: Cents;
  itemCount: number;
};

export function totals(job: Pick<Job, 'lines' | 'discountPct' | 'deliveryFee' | 'setupFee'>, s: Settings): Totals {
  const itemsSubtotal = job.lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const discount = pct(itemsSubtotal, job.discountPct);
  const net = itemsSubtotal - discount + job.deliveryFee + job.setupFee;
  const vat = s.vatRegistered ? Math.round(net * s.vatRate) : 0;
  return {
    itemsSubtotal,
    discount,
    delivery: job.deliveryFee,
    setup: job.setupFee,
    net,
    vat,
    total: net + vat,
    itemCount: job.lines.reduce((n, l) => n + l.qty, 0),
  };
}

/** [ASSUMED] deposit rule: a % of the hire total, never below the minimum, rounded up to R50. */
export const suggestedDeposit = (total: Cents, s: Settings): Cents =>
  total === 0 ? 0 : Math.max(s.depositMin, roundUpTo50(pct(total, s.depositPct)));

const sum = (ps: Payment[], kind: Payment['kind']) => ps.filter((p) => p.kind === kind).reduce((n, p) => n + p.amount, 0);

export type Balance = {
  hireTotal: Cents;
  hirePaid: Cents;
  hireDue: Cents;
  depositPaid: Cents;
  depositMethod?: Payment['method'];
  refunded: Cents;
};

export function balance(job: Job, s: Settings): Balance {
  const t = totals(job, s);
  const hirePaid = sum(job.payments, 'hire');
  const deposit = job.payments.find((p) => p.kind === 'deposit');
  return {
    hireTotal: t.total,
    hirePaid,
    hireDue: Math.max(0, t.total - hirePaid),
    depositPaid: sum(job.payments, 'deposit'),
    depositMethod: deposit?.method,
    refunded: sum(job.payments, 'refund'),
  };
}

export type Refund = {
  deposit: Cents;
  charges: Cents;
  bankFee: Cents;
  refund: Cents;
  /** Positive when the charges are bigger than the deposit. */
  clientOwes: Cents;
};

/**
 * From the hire terms: the deposit comes back less any deductions, and less a
 * banking fee if it was paid into an account (EFT).
 */
export function depositRefund(job: Job, s: Settings, charges: Charge[] = job.charges): Refund {
  const b = balance(job, s);
  const chargeTotal = charges.filter((c) => c.approved).reduce((n, c) => n + c.amount, 0);
  const bankFee = b.depositMethod === 'EFT' ? pct(b.depositPaid, s.bankFeePct) : 0;
  const left = b.depositPaid - chargeTotal - bankFee;
  return {
    deposit: b.depositPaid,
    charges: chargeTotal,
    bankFee,
    refund: Math.max(0, left),
    clientOwes: Math.max(0, -left),
  };
}
