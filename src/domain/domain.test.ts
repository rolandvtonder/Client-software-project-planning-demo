import {describe, expect, it} from 'vitest';
import {availability, checkLine} from './availability';
import {formatRand} from './money';
import {depositRefund, suggestedDeposit, totals} from './totals';
import type {Item, Job, Settings} from './types';

const settings: Settings = {
  vatRegistered: true,
  vatNo: '',
  vatRate: 0.15,
  depositPct: 30,
  depositMin: 50000,
  bankFeePct: 10,
  cancellationPct: 10,
  softHoldHours: 48,
  quoteValidDays: 14,
  bank: {name: '', account: '', branchCode: '', holder: ''},
};

const chair: Item = {
  id: 'cha10',
  code: 'CHA10',
  name: 'Tiffany chair',
  collection: 'furniture',
  category: 'Chairs',
  price: 2500,
  replacementCost: 25000,
  cleaningFee: 0,
  turnaroundDays: 0,
  stock: {pta: 80, kdp: 70},
  outOfService: {pta: 0, kdp: 0},
  location: '',
};
const cloth: Item = {...chair, id: 'mini28', code: 'MINI28', turnaroundDays: 1, stock: {pta: 10, kdp: 9}};

const job = (p: Partial<Job>): Job => ({
  id: Math.random().toString(36),
  quoteNo: 'Q',
  clientId: 'c',
  branch: 'pta',
  eventName: '',
  eventType: 'Wedding',
  eventDate: '2026-11-07',
  outDate: '2026-11-06',
  backDate: '2026-11-08',
  fulfilment: 'delivery',
  venue: '',
  lines: [],
  deliveryFee: 0,
  setupFee: 0,
  discountPct: 0,
  depositDue: 0,
  validUntil: '2026-12-01',
  status: 'confirmed',
  createdAt: '2026-10-01',
  createdBy: '',
  payments: [],
  charges: [],
  history: [],
  ...p,
});

describe('availability', () => {
  const now = new Date('2026-10-13T08:00:00').getTime();

  it('counts confirmed bookings that overlap the window', () => {
    const jobs = [job({lines: [{itemId: 'cha10', qty: 70, unitPrice: 2500, discountPct: 0}]})];
    expect(availability(chair, 'pta', '2026-11-07', '2026-11-07', jobs, {now}).free).toBe(10);
    expect(availability(chair, 'pta', '2026-11-09', '2026-11-10', jobs, {now}).free).toBe(80);
  });

  it('ignores quotes, cancelled jobs and other branches', () => {
    const jobs = [
      job({status: 'quote_sent', lines: [{itemId: 'cha10', qty: 50, unitPrice: 0, discountPct: 0}]}),
      job({status: 'cancelled', lines: [{itemId: 'cha10', qty: 50, unitPrice: 0, discountPct: 0}]}),
      job({branch: 'kdp', lines: [{itemId: 'cha10', qty: 50, unitPrice: 0, discountPct: 0}]}),
    ];
    expect(availability(chair, 'pta', '2026-11-07', '2026-11-07', jobs, {now}).free).toBe(80);
  });

  it('keeps linen busy for its washing turnaround after return', () => {
    const jobs = [job({lines: [{itemId: 'mini28', qty: 10, unitPrice: 0, discountPct: 0}]})];
    // Comes back on the 8th, needs a day of washing: still unavailable on the 9th.
    expect(availability(cloth, 'pta', '2026-11-09', '2026-11-09', jobs, {now}).free).toBe(0);
    expect(availability(cloth, 'pta', '2026-11-10', '2026-11-10', jobs, {now}).free).toBe(10);
  });

  it('treats an unexpired soft hold as tight, and an expired one as free', () => {
    const held = job({status: 'accepted', holdUntil: '2026-10-14T08:00:00', lines: [{itemId: 'cha10', qty: 75, unitPrice: 0, discountPct: 0}]});
    expect(checkLine(chair, 10, 'pta', '2026-11-06', '2026-11-08', [held], {now}).tone).toBe('tight');
    const expired = {...held, holdUntil: '2026-10-12T08:00:00'};
    expect(checkLine(chair, 10, 'pta', '2026-11-06', '2026-11-08', [expired], {now}).tone).toBe('ok');
  });

  it('reports a shortfall and what the other branch has free', () => {
    const jobs = [job({lines: [{itemId: 'cha10', qty: 70, unitPrice: 0, discountPct: 0}]})];
    const c = checkLine(chair, 30, 'pta', '2026-11-06', '2026-11-08', jobs, {now});
    expect(c).toEqual({tone: 'short', free: 10, short: 20, otherBranchFree: 70});
  });

  it('counts borrowed lines against the branch they come from', () => {
    const jobs = [job({lines: [{itemId: 'cha10', qty: 20, unitPrice: 0, discountPct: 0, source: 'kdp'}]})];
    expect(availability(chair, 'pta', '2026-11-07', '2026-11-07', jobs, {now}).free).toBe(80);
    expect(availability(chair, 'kdp', '2026-11-07', '2026-11-07', jobs, {now}).free).toBe(50);
  });

  it('excludes the job being edited from its own check', () => {
    const self = job({lines: [{itemId: 'cha10', qty: 80, unitPrice: 0, discountPct: 0}]});
    expect(availability(chair, 'pta', '2026-11-07', '2026-11-07', [self], {now, excludeJobId: self.id}).free).toBe(80);
  });
});

describe('totals and deposits', () => {
  it('adds discounts, fees and VAT in cents', () => {
    const t = totals({lines: [{itemId: 'x', qty: 70, unitPrice: 2500, discountPct: 10}], discountPct: 5, deliveryFee: 45000, setupFee: 0}, settings);
    expect(t.itemsSubtotal).toBe(157500);
    expect(t.discount).toBe(7875);
    expect(t.net).toBe(194625);
    expect(t.vat).toBe(29194);
    expect(t.total).toBe(223819);
  });

  it('rounds the deposit up to R50 and respects the minimum', () => {
    expect(suggestedDeposit(223819, settings)).toBe(70000);
    expect(suggestedDeposit(50000, settings)).toBe(50000);
  });

  it('refunds the deposit less charges and the 10% EFT bank fee', () => {
    const j = job({
      payments: [{id: 'p', at: '2026-10-01', amount: 100000, method: 'EFT', kind: 'deposit'}],
      charges: [{id: 'c', label: '', amount: 25000, approved: true}, {id: 'd', label: '', amount: 9999, approved: false}],
    });
    expect(depositRefund(j, settings)).toEqual({deposit: 100000, charges: 25000, bankFee: 10000, refund: 65000, clientOwes: 0});
  });

  it('takes no bank fee off cash deposits, and shows what the client owes when charges are bigger', () => {
    const j = job({payments: [{id: 'p', at: '2026-10-01', amount: 50000, method: 'Cash', kind: 'deposit'}], charges: [{id: 'c', label: '', amount: 80000, approved: true}]});
    expect(depositRefund(j, settings)).toMatchObject({bankFee: 0, refund: 0, clientOwes: 30000});
  });
});

describe('formatRand', () => {
  it('formats SA style', () => {
    expect(formatRand(125000)).toBe('R 1 250,00');
    expect(formatRand(-500)).toBe('−R 5,00');
  });
});
