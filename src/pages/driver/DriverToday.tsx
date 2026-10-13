import {ArrowDownLeftIcon, ArrowUpRightIcon, CaretRightIcon, MapTrifoldIcon, SealCheckIcon} from '@phosphor-icons/react';
import {Link, useSearchParams} from 'react-router-dom';
import {Chip, StatusChip} from '../../components/ui';
import {addDays, formatDate, today} from '../../domain/dates';
import type {Job} from '../../domain/types';
import {clientLabel, clientMap, inBranch} from '../../data/selectors';
import {useStore} from '../../data/store';
import {DriverShell} from './DriverShell';

export function DriverToday() {
  const s = useStore((x) => x);
  const [params] = useSearchParams();
  const showDone = params.get('done') === '1';
  const T = today();
  const clients = clientMap(s);
  const mine = s.jobs.filter(inBranch(s));

  const outgoing = mine.filter((j) => ['confirmed', 'packing', 'out_for_delivery'].includes(j.status) && j.outDate <= addDays(T, 1)).sort((a, b) => (a.outDate + (a.deliveryWindow ?? '')).localeCompare(b.outDate + (b.deliveryWindow ?? '')));
  const incoming = mine.filter((j) => j.status === 'on_hire' && j.backDate <= addDays(T, 1)).sort((a, b) => a.backDate.localeCompare(b.backDate));
  const done = mine.filter((j) => (j.deliveryNote?.signature.signedAt.slice(0, 10) === T) || j.returnNote?.checkedAt.slice(0, 10) === T);

  return (
    <DriverShell
      header={
        <header className="px-4 pt-5">
          <p className="text-[15px] text-muted">{formatDate(T)}</p>
          <h1 className="font-display text-[30px] leading-tight font-semibold text-primary-ink">{showDone ? 'Done today' : 'Today’s runs'}</h1>
        </header>
      }
    >
      {showDone ? (
        done.length ? (
          <ul className="space-y-3">
            {done.map((j) => (
              <li key={j.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4">
                <SealCheckIcon size={28} weight="fill" className="text-ok" aria-hidden />
                <span className="flex-1">
                  <span className="block font-semibold">{j.eventName}</span>
                  <span className="block text-[15px] text-muted">{j.returnNote?.checkedAt.slice(0, 10) === T ? `Collected · ${j.returnNote.number}` : `Delivered · ${j.deliveryNote?.number}`}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[var(--radius-card)] bg-white p-6 text-center text-muted">Nothing finished yet today.</p>
        )
      ) : (
        <>
          <Section title="Deliveries & hand-overs" icon={ArrowUpRightIcon} jobs={outgoing} kind="out" clients={clients} empty="No deliveries today or tomorrow." />
          <Section title="Collections & returns" icon={ArrowDownLeftIcon} jobs={incoming} kind="back" clients={clients} empty="No collections today or tomorrow." />
        </>
      )}
    </DriverShell>
  );
}

function Section({title, icon: I, jobs, kind, clients, empty}: {title: string; icon: typeof ArrowUpRightIcon; jobs: Job[]; kind: 'out' | 'back'; clients: ReturnType<typeof clientMap>; empty: string}) {
  const T = today();
  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold tracking-wide text-muted uppercase">
        <I size={18} weight="bold" aria-hidden /> {title}
      </h2>
      {jobs.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white p-5 text-[16px] text-muted">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => {
            const day = kind === 'out' ? j.outDate : j.backDate;
            const count = j.lines.reduce((n, l) => n + l.qty, 0);
            return (
              <li key={j.id} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
                <Link to={`/driver/${j.id}${kind === 'back' ? '?mode=return' : ''}`} className="block p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="tabular text-[22px] font-semibold text-primary-deep">{j.fulfilment === 'collection' ? (kind === 'out' ? 'Counter' : 'Counter') : j.deliveryWindow}</span>
                    {day === T ? <Chip tone="info" icon={false}>Today</Chip> : day < T ? <Chip tone="bad">Late</Chip> : <Chip tone="neutral" icon={false}>Tomorrow</Chip>}
                  </div>
                  <p className="mt-1 text-[19px] font-semibold">{clientLabel(clients.get(j.clientId))}</p>
                  <p className="text-[16px] text-muted">{j.venue}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[16px]">
                      <span className="tabular font-semibold">{j.lines.length}</span> lines · <span className="tabular font-semibold">{count}</span> items
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusChip status={j.status} />
                      <CaretRightIcon size={20} className="text-muted" aria-hidden />
                    </span>
                  </div>
                </Link>
                {j.fulfilment === 'delivery' && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.venue)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-14 items-center justify-center gap-2 border-t border-line bg-sunken/60 text-[17px] font-semibold text-primary-deep"
                  >
                    <MapTrifoldIcon size={24} aria-hidden /> Navigate
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
