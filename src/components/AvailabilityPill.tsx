import {ArrowsLeftRightIcon} from '@phosphor-icons/react';
import type {LineCheck} from '../domain/availability';
import type {BranchId} from '../domain/types';
import {BRANCHES} from '../data/selectors';
import {Chip} from './ui';

/** Availability always says the number, never just a colour. */
export function AvailabilityPill({check, otherBranch, onTransfer, compact}: {check: LineCheck; otherBranch: BranchId; onTransfer?: () => void; compact?: boolean}) {
  if (check.tone === 'ok') return <Chip tone="ok">{compact ? `${check.free} free` : `${check.free} free`}</Chip>;
  if (check.tone === 'tight') return <Chip tone="warn">{check.reason === 'soft-hold' ? `On hold for another quote · ${check.free} free` : `Tight · ${check.free} free`}</Chip>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Chip tone="bad">
        Short {check.short} · {check.free} free
      </Chip>
      {onTransfer && check.otherBranchFree > 0 && (
        <button type="button" onClick={onTransfer} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary underline underline-offset-2">
          <ArrowsLeftRightIcon size={14} weight="bold" aria-hidden />
          {BRANCHES[otherBranch].short} has {check.otherBranchFree} — borrow {Math.min(check.short, check.otherBranchFree)}
        </button>
      )}
      {check.otherBranchFree === 0 && <span className="text-[12.5px] text-muted">{BRANCHES[otherBranch].short} has none either</span>}
    </span>
  );
}
