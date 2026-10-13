import {daysBetween, today} from '../domain/dates';
import {isQuote} from '../domain/lifecycle';
import {balance} from '../domain/totals';
import type {BranchId, Client, Item, Job} from '../domain/types';
import type {State} from './store';

export const BRANCHES: Record<BranchId, {short: string; name: string; address: string; phone: string; email: string}> = {
  pta: {
    short: 'PTA',
    name: 'Pretoria / Centurion',
    address: "4E Coachman's Crescent, Coachman's Business Park, Hennopspark, Centurion",
    phone: '066 523 1125',
    email: 'pta@eastcodecorhire.co.za',
  },
  kdp: {
    short: 'KDP',
    name: 'Krugersdorp',
    address: '62 Pigot Road, Protea Ridges, Protearif, Krugersdorp',
    phone: '078 019 2167',
    email: 'kdp@eastcodecorhire.co.za',
  },
};

export const inBranch = (s: State) => (j: {branch: BranchId}) => s.branch === 'all' || j.branch === s.branch;

export const itemMap = (s: State): Map<string, Item> => new Map(s.items.map((i) => [i.id, i]));
export const clientMap = (s: State): Map<string, Client> => new Map(s.clients.map((c) => [c.id, c]));

export const clientLabel = (c?: Client) => (c ? (c.company ? `${c.company}` : c.name) : 'Unknown client');

export type Attention = {jobId: string; tone: 'bad' | 'warn' | 'info'; text: string; action: string};

/** The dashboard's "needs attention" list. */
export function attention(s: State): Attention[] {
  const T = today();
  const out: Attention[] = [];
  const clients = clientMap(s);
  for (const j of s.jobs.filter(inBranch(s))) {
    const who = clientLabel(clients.get(j.clientId));
    if (j.status === 'issues') out.push({jobId: j.id, tone: 'bad', text: `${j.eventName}: return check found problems — approve charges`, action: 'Resolve'});
    if (j.status === 'accepted') {
      const expired = !j.holdUntil || new Date(j.holdUntil).getTime() < Date.now();
      out.push({
        jobId: j.id,
        tone: expired ? 'bad' : 'warn',
        text: expired ? `${who}: deposit not paid and the stock hold has run out` : `${who}: accepted, waiting for deposit`,
        action: 'Record deposit',
      });
    }
    if (j.status === 'quote_sent' && daysBetween(j.createdAt, T) >= 2) out.push({jobId: j.id, tone: 'info', text: `${who}: quote sent ${daysBetween(j.createdAt, T)} days ago, no reply yet`, action: 'Follow up'});
    if (j.status === 'on_hire' && j.backDate < T) out.push({jobId: j.id, tone: 'bad', text: `${j.eventName}: return is late`, action: 'Collect'});
    if (j.status === 'closed' && j.invoiceNo) {
      const b = balance(j, s.settings);
      if (b.hireDue > 0) out.push({jobId: j.id, tone: 'bad', text: `${j.invoiceNo} — ${who}: balance overdue`, action: 'Record payment'});
    }
  }
  const rank = {bad: 0, warn: 1, info: 2};
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

export const quotesOf = (s: State) => s.jobs.filter((j) => isQuote(j.status));

/** Jobs going out or coming back on a given day. */
export function movements(s: State, day: string) {
  const jobs = s.jobs.filter(inBranch(s)).filter((j) => j.status !== 'cancelled' && !isQuote(j.status));
  return {
    out: jobs.filter((j) => j.outDate === day),
    back: jobs.filter((j) => j.backDate === day && j.status !== 'closed'),
  };
}

export const sortByEvent = (a: Job, b: Job) => a.eventDate.localeCompare(b.eventDate);
