import {addDays, eachDay} from './dates';
import type {BranchId, ISODate, Item, Job, JobStatus} from './types';

/** Jobs in these states hold real stock. */
export const RESERVING: JobStatus[] = ['confirmed', 'packing', 'out_for_delivery', 'on_hire', 'returned', 'issues', 'closed'];

export type Availability = {
  stock: number;
  outOfService: number;
  /** Highest number already booked on any one day of the window. */
  reserved: number;
  /** Highest number on soft hold (accepted, deposit not yet paid). */
  held: number;
  /** What can still be booked, ignoring soft holds. */
  free: number;
  /** What can be booked without eating into anyone's soft hold. */
  freeAfterHolds: number;
};

const isHeld = (job: Job, now: number) =>
  job.status === 'accepted' && !!job.holdUntil && new Date(job.holdUntil).getTime() > now;

/**
 * How many of `item` are free at `branch` for a hire going out `from` and back `to`.
 * An item is busy from the day it goes out until it comes back plus its turnaround
 * days (washing, checking) — for both the existing bookings and the new one.
 */
export function availability(
  item: Item,
  branch: BranchId,
  from: ISODate,
  to: ISODate,
  jobs: Job[],
  opts: {excludeJobId?: string; now?: number} = {},
): Availability {
  const now = opts.now ?? Date.now();
  const stock = item.stock[branch];
  const outOfService = item.outOfService[branch];
  const windowEnd = addDays(to, item.turnaroundDays);

  const fromBranch = (j: Job) => j.lines.filter((l) => l.itemId === item.id && (l.source ?? j.branch) === branch);
  const relevant = jobs.filter(
    (j) =>
      j.id !== opts.excludeJobId &&
      fromBranch(j).length > 0 &&
      (RESERVING.includes(j.status) || isHeld(j, now)) &&
      j.outDate <= windowEnd &&
      addDays(j.backDate, item.turnaroundDays) >= from,
  );

  let reserved = 0;
  let combined = 0;
  let held = 0;
  for (const day of eachDay(from, windowEnd)) {
    let r = 0;
    let h = 0;
    for (const j of relevant) {
      if (j.outDate > day || addDays(j.backDate, item.turnaroundDays) < day) continue;
      const qty = fromBranch(j).reduce((s, l) => s + l.qty, 0);
      if (isHeld(j, now)) h += qty;
      else r += qty;
    }
    reserved = Math.max(reserved, r);
    held = Math.max(held, h);
    combined = Math.max(combined, r + h);
  }

  const usable = Math.max(0, stock - outOfService);
  return {
    stock,
    outOfService,
    reserved,
    held,
    free: Math.max(0, usable - reserved),
    freeAfterHolds: Math.max(0, usable - combined),
  };
}

export type LineCheck =
  | {tone: 'ok'; free: number}
  | {tone: 'tight'; free: number; reason: 'few-left' | 'soft-hold'}
  | {tone: 'short'; free: number; short: number; otherBranchFree: number};

/** Traffic-light verdict for one quote line. */
export function checkLine(
  item: Item,
  qty: number,
  branch: BranchId,
  from: ISODate,
  to: ISODate,
  jobs: Job[],
  opts: {excludeJobId?: string; now?: number} = {},
): LineCheck {
  const a = availability(item, branch, from, to, jobs, opts);
  if (qty > a.free) {
    const other: BranchId = branch === 'pta' ? 'kdp' : 'pta';
    const o = availability(item, other, from, to, jobs, opts);
    return {tone: 'short', free: a.free, short: qty - a.free, otherBranchFree: o.freeAfterHolds};
  }
  if (qty > a.freeAfterHolds) return {tone: 'tight', free: a.free, reason: 'soft-hold'};
  const leftAfter = a.free - qty;
  const margin = Math.max(2, Math.ceil(a.stock * 0.1));
  if (leftAfter < margin && a.stock > 1) return {tone: 'tight', free: a.free, reason: 'few-left'};
  return {tone: 'ok', free: a.free};
}

/** Per-day free count for an item's availability calendar. */
export function freeByDay(item: Item, branch: BranchId, days: ISODate[], jobs: Job[]): Record<ISODate, number> {
  const out: Record<ISODate, number> = {};
  for (const d of days) out[d] = availability(item, branch, d, d, jobs).freeAfterHolds;
  return out;
}
