import type {JobStatus} from './types';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

export const STATUS: Record<JobStatus, {label: string; tone: Tone}> = {
  draft: {label: 'Draft', tone: 'neutral'},
  quote_sent: {label: 'Quote sent', tone: 'info'},
  accepted: {label: 'Accepted – on hold', tone: 'warn'},
  confirmed: {label: 'Confirmed', tone: 'ok'},
  packing: {label: 'Packing', tone: 'info'},
  out_for_delivery: {label: 'Out for delivery', tone: 'info'},
  on_hire: {label: 'On hire', tone: 'ok'},
  returned: {label: 'Returned – checking', tone: 'warn'},
  issues: {label: 'Issues to resolve', tone: 'bad'},
  closed: {label: 'Closed', tone: 'neutral'},
  cancelled: {label: 'Cancelled', tone: 'neutral'},
};

/** The seven steps shown on every job's progress bar. */
export const STEPS = ['Quote', 'Accepted', 'Deposit paid', 'Packed', 'Delivered', 'Returned', 'Closed'] as const;

/** Index of the step that comes next (steps before it are done). */
export function stepIndex(s: JobStatus): number {
  switch (s) {
    case 'draft':
      return 0;
    case 'quote_sent':
      return 1;
    case 'accepted':
      return 2;
    case 'confirmed':
    case 'packing':
      return 3;
    case 'out_for_delivery':
      return 4;
    case 'on_hire':
      return 5;
    case 'returned':
    case 'issues':
      return 6;
    case 'closed':
      return 7; // all done
    case 'cancelled':
      return -1;
  }
}

/** Quotes are jobs that haven't been confirmed yet. */
export const isQuote = (s: JobStatus) => s === 'draft' || s === 'quote_sent' || s === 'accepted';
export const isActiveOrder = (s: JobStatus) => !isQuote(s) && s !== 'closed' && s !== 'cancelled';
