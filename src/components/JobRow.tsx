import {CaretRightIcon} from '@phosphor-icons/react';
import {Link} from 'react-router-dom';
import {formatDate, relative} from '../domain/dates';
import {totals} from '../domain/totals';
import type {Job} from '../domain/types';
import {BRANCHES, clientLabel, clientMap} from '../data/selectors';
import {useStore} from '../data/store';
import {Money, StatusChip} from './ui';

/** One job as a tappable row; becomes a card-like row on phones. */
export function JobRow({job, meta, showMoney = true}: {job: Job; meta?: string; showMoney?: boolean}) {
  const client = useStore((s) => clientMap(s).get(job.clientId), [job.clientId]);
  const settings = useStore((s) => s.settings);
  const t = totals(job, settings);
  return (
    <li>
      <Link to={`/jobs/${job.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-sunken/60 max-md:gap-3 max-md:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{job.eventName}</p>
          <p className="truncate text-[13px] text-muted">
            {clientLabel(client)} · {meta ?? `${formatDate(job.eventDate)} (${relative(job.eventDate)})`} · {BRANCHES[job.branch].short}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusChip status={job.status} />
          {showMoney && <Money cents={t.total} className="text-[13px] font-medium text-muted" />}
        </div>
        <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}
