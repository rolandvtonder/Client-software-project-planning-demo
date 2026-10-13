import {FileTextIcon, PlusIcon} from '@phosphor-icons/react';
import {useState} from 'react';
import {JobRow} from '../components/JobRow';
import {Card, EmptyState, LinkButton, PageHeader} from '../components/ui';
import {formatDate} from '../domain/dates';
import type {JobStatus} from '../domain/types';
import {inBranch} from '../data/selectors';
import {useStore} from '../data/store';
import {cx} from '../lib/cx';

const FILTERS: {key: 'all' | JobStatus; label: string}[] = [
  {key: 'all', label: 'All open'},
  {key: 'draft', label: 'Drafts'},
  {key: 'quote_sent', label: 'Sent'},
  {key: 'accepted', label: 'Accepted'},
];

export function Quotes() {
  const s = useStore((x) => x);
  const [f, setF] = useState<'all' | JobStatus>('all');
  const quotes = s.jobs
    .filter(inBranch(s))
    .filter((j) => (f === 'all' ? ['draft', 'quote_sent', 'accepted'].includes(j.status) : j.status === f))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeader
        title="Quotes"
        sub="Quotes become orders once the deposit is paid."
        actions={
          <LinkButton to="/quotes/new" variant="primary" icon={PlusIcon}>
            New quote
          </LinkButton>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3 max-md:px-4" role="group" aria-label="Filter quotes">
          {FILTERS.map((x) => {
            const n = s.jobs.filter(inBranch(s)).filter((j) => (x.key === 'all' ? ['draft', 'quote_sent', 'accepted'].includes(j.status) : j.status === x.key)).length;
            return (
              <button key={x.key} aria-pressed={f === x.key} onClick={() => setF(x.key)} className={cx('h-8 rounded-full px-3 text-[13px] font-semibold', f === x.key ? 'bg-primary-deep text-white' : 'bg-sunken text-muted hover:text-ink')}>
                {x.label} <span className="tabular opacity-75">{n}</span>
              </button>
            );
          })}
        </div>
        {quotes.length ? (
          <ul className="divide-y divide-line">
            {quotes.map((j) => (
              <JobRow key={j.id} job={j} meta={`${j.quoteNo} · event ${formatDate(j.eventDate, {weekday: false})}`} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={FileTextIcon} title="No quotes here." action={<LinkButton to="/quotes/new" variant="primary" icon={PlusIcon}>Start a quote</LinkButton>}>
            Quotes you start or send show up here.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
