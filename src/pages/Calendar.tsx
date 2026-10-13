import {ArrowDownLeftIcon, ArrowUpRightIcon, CaretLeftIcon, CaretRightIcon} from '@phosphor-icons/react';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Button, Card, IconButton, PageHeader, StatusChip} from '../components/ui';
import {addDays, formatDate, fromISO, MONTHS_LONG, toISO, today} from '../domain/dates';
import type {Job} from '../domain/types';
import {BRANCHES, clientLabel, clientMap, inBranch} from '../data/selectors';
import {useStore} from '../data/store';
import {cx} from '../lib/cx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Calendar() {
  const s = useStore((x) => x);
  const T = today();
  const [month, setMonth] = useState(T.slice(0, 7));
  const clients = clientMap(s);
  const jobs = s.jobs.filter(inBranch(s)).filter((j) => j.status !== 'cancelled' && j.status !== 'draft');

  const first = fromISO(`${month}-01`);
  const start = addDays(toISO(first), -((first.getDay() + 6) % 7));
  const days = Array.from({length: 42}, (_, i) => addDays(start, i));
  const shift = (n: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMonth(toISO(d).slice(0, 7));
  };
  const on = (d: string) => ({
    events: jobs.filter((j) => j.eventDate === d),
    out: jobs.filter((j) => j.outDate === d && j.status !== 'quote_sent'),
    back: jobs.filter((j) => j.backDate === d && j.status !== 'quote_sent'),
  });
  const monthDays = days.filter((d) => d.startsWith(month));

  return (
    <>
      <PageHeader
        title="Calendar"
        sub="Events, deliveries and collections. Quotes still waiting on a reply are shown faded."
        actions={
          <div className="flex items-center gap-2">
            <IconButton icon={CaretLeftIcon} label="Previous month" className="border border-control/60" onClick={() => shift(-1)} />
            <span className="w-40 text-center text-[16px] font-semibold">
              {MONTHS_LONG[first.getMonth()]} {first.getFullYear()}
            </span>
            <IconButton icon={CaretRightIcon} label="Next month" className="border border-control/60" onClick={() => shift(1)} />
            <Button size="sm" onClick={() => setMonth(T.slice(0, 7))}>
              Today
            </Button>
          </div>
        }
      />
      <p className="mb-3 flex flex-wrap gap-4 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary" aria-hidden /> Pretoria / Centurion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-gold-deep" aria-hidden /> Krugersdorp
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowUpRightIcon size={14} weight="bold" aria-hidden /> goes out
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowDownLeftIcon size={14} weight="bold" aria-hidden /> comes back
        </span>
      </p>

      {/* desktop month grid */}
      <Card className="overflow-hidden max-md:hidden">
        <div className="grid grid-cols-7 border-b border-line bg-sunken text-[12px] font-semibold tracking-wide text-muted uppercase">
          {DAYS.map((d) => (
            <div key={d} className="px-2 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const x = on(d);
            const inMonth = d.startsWith(month);
            return (
              <div key={d} className={cx('min-h-28 border-r border-b border-line p-1.5 [&:nth-child(7n)]:border-r-0', !inMonth && 'bg-sunken/40', d === T && 'bg-mist/40')}>
                <p className={cx('mb-1 text-[13px] font-semibold', !inMonth && 'text-muted/60', d === T && 'inline-flex size-6 items-center justify-center rounded-full bg-primary text-white')}>{fromISO(d).getDate()}</p>
                <ul className="space-y-1">
                  {x.events.map((j) => (
                    <EventPill key={j.id} job={j} />
                  ))}
                </ul>
                {(x.out.length > 0 || x.back.length > 0) && (
                  <p className="mt-1 flex gap-2 text-[11.5px] text-muted">
                    {x.out.length > 0 && (
                      <span className="flex items-center gap-0.5" title={x.out.map((j) => j.eventName).join(', ')}>
                        <ArrowUpRightIcon size={12} weight="bold" aria-hidden />
                        {x.out.length} out
                      </span>
                    )}
                    {x.back.length > 0 && (
                      <span className="flex items-center gap-0.5" title={x.back.map((j) => j.eventName).join(', ')}>
                        <ArrowDownLeftIcon size={12} weight="bold" aria-hidden />
                        {x.back.length} back
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* phone agenda */}
      <Card className="md:hidden">
        <ul className="divide-y divide-line">
          {monthDays
            .filter((d) => {
              const x = on(d);
              return x.events.length || x.out.length || x.back.length;
            })
            .map((d) => {
              const x = on(d);
              return (
                <li key={d} className="px-4 py-3">
                  <p className={cx('mb-1.5 text-[13px] font-semibold', d === T ? 'text-primary' : 'text-muted')}>{d === T ? `Today · ${formatDate(d)}` : formatDate(d)}</p>
                  <ul className="space-y-1.5">
                    {x.events.map((j) => (
                      <li key={j.id}>
                        <Link to={`/jobs/${j.id}`} className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{j.eventName}</span>
                            <span className="block truncate text-[13px] text-muted">
                              {clientLabel(clients.get(j.clientId))} · {BRANCHES[j.branch].short}
                            </span>
                          </span>
                          <StatusChip status={j.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {(x.out.length > 0 || x.back.length > 0) && (
                    <p className="mt-1 text-[13px] text-muted">
                      {x.out.length > 0 && `↑ ${x.out.map((j) => j.eventName).join(', ')} `}
                      {x.back.length > 0 && `↓ ${x.back.map((j) => j.eventName).join(', ')}`}
                    </p>
                  )}
                </li>
              );
            })}
        </ul>
      </Card>
    </>
  );
}

function EventPill({job}: {job: Job}) {
  const faded = job.status === 'quote_sent' || job.status === 'accepted';
  return (
    <li>
      <Link
        to={`/jobs/${job.id}`}
        title={`${job.eventName} — ${BRANCHES[job.branch].name}`}
        className={cx(
          'block truncate rounded px-1.5 py-0.5 text-[12px] font-semibold text-white',
          job.branch === 'pta' ? 'bg-primary' : 'bg-gold-deep',
          faded && 'border border-dashed border-current bg-transparent !text-primary-deep',
          faded && job.branch === 'kdp' && '!text-gold-deep',
        )}
      >
        {job.eventName}
      </Link>
    </li>
  );
}
