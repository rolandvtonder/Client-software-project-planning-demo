import {ArrowDownLeftIcon, ArrowUpRightIcon, CheckCircleIcon, FileTextIcon, PlusIcon, TruckIcon, UserPlusIcon, WarningCircleIcon, XCircleIcon, InfoIcon} from '@phosphor-icons/react';
import {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {JobRow} from '../components/JobRow';
import {Card, CardHeader, Chip, EmptyState, LinkButton, StatTile} from '../components/ui';
import {addDays, formatDate, monthKey, MONTHS_LONG, today} from '../domain/dates';
import {isActiveOrder, isQuote} from '../domain/lifecycle';
import {formatRand} from '../domain/money';
import {balance, totals} from '../domain/totals';
import {attention, BRANCHES, inBranch, itemMap, movements, sortByEvent} from '../data/selectors';
import {currentUser, useStore} from '../data/store';
import {cx} from '../lib/cx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function Dashboard() {
  const s = useStore((x) => x);
  const T = today();
  const month = monthKey(T);
  const prevMonth = monthKey(addDays(`${month}-01`, -1));

  const data = useMemo(() => {
    const mine = s.jobs.filter(inBranch(s));
    const orders = mine.filter((j) => !isQuote(j.status) && j.status !== 'cancelled');
    const thisMonth = orders.filter((j) => monthKey(j.eventDate) === month);
    const lastMonth = orders.filter((j) => monthKey(j.eventDate) === prevMonth);
    const rev = (js: typeof orders) => js.reduce((n, j) => n + totals(j, s.settings).total, 0);
    const depositsHeld = orders
      .filter((j) => j.status !== 'closed')
      .reduce((n, j) => {
        const b = balance(j, s.settings);
        return n + b.depositPaid - b.refunded;
      }, 0);
    const waiting = mine.filter((j) => j.status === 'quote_sent' || j.status === 'accepted');
    const items = itemMap(s);
    const counts = new Map<string, number>();
    for (const j of thisMonth) for (const l of j.lines) counts.set(l.itemId, (counts.get(l.itemId) ?? 0) + l.qty);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, qty]) => ({item: items.get(id)!, qty}));
    const upcoming = mine.filter((j) => isActiveOrder(j.status) && j.outDate > T && j.outDate <= addDays(T, 14)).sort(sortByEvent);
    return {thisMonth, lastMonth, rev: rev(thisMonth), lastRev: rev(lastMonth), depositsHeld, waiting, top, upcoming};
  }, [s, month, prevMonth, T]);

  const todays = movements(s, T);
  const todo = attention(s);
  const delta = data.lastRev ? Math.round(((data.rev - data.lastRev) / data.lastRev) * 100) : 0;
  const branchLabel = s.branch === 'all' ? 'both branches' : BRANCHES[s.branch].name;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[14px] text-muted">
            {formatDate(T)} · {branchLabel}
          </p>
          <h1 className="font-display text-[32px] leading-tight font-semibold text-primary-ink max-md:text-[28px]">
            {greeting()}, {currentUser(s).split(' ')[0]}
          </h1>
        </div>
        <div className="flex gap-2 max-md:hidden">
          <LinkButton to="/clients?new=1" icon={UserPlusIcon}>
            New client
          </LinkButton>
          <LinkButton to="/quotes/new" variant="primary" icon={PlusIcon}>
            New quote
          </LinkButton>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:gap-3">
        <StatTile label={`Orders in ${MONTHS_LONG[Number(month.slice(5)) - 1]}`} value={data.thisMonth.length} to="/reports" delta={{text: `${data.lastMonth.length} last month`, tone: 'neutral'}} />
        <StatTile
          label="Hire revenue this month"
          value={formatRand(data.rev, {decimals: false})}
          to="/reports"
          delta={data.lastRev ? {text: `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs last month`, tone: delta >= 0 ? 'ok' : 'bad'} : undefined}
        />
        <StatTile label="Deposits held" value={formatRand(data.depositsHeld, {decimals: false})} to="/invoices" />
        <StatTile label="Quotes waiting on clients" value={data.waiting.length} to="/quotes" />
      </div>

      <div className="grid grid-cols-[1fr_400px] gap-6 max-xl:grid-cols-1">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Today" sub="What goes out and what comes back" action={<LinkButton to="/driver" size="sm" icon={TruckIcon}>Driver view</LinkButton>} />
            <div className="grid grid-cols-2 divide-x divide-line max-md:grid-cols-1 max-md:divide-x-0 max-md:divide-y">
              <TodayList title="Going out" icon={ArrowUpRightIcon} jobs={todays.out} empty="Nothing goes out today." kind="out" />
              <TodayList title="Coming back" icon={ArrowDownLeftIcon} jobs={todays.back} empty="Nothing comes back today." kind="back" />
            </div>
          </Card>

          <Card>
            <CardHeader title="Next 14 days" sub="Confirmed orders going out" action={<Link to="/calendar" className="text-[14px] font-semibold text-primary underline-offset-2 hover:underline">Calendar</Link>} />
            {data.upcoming.length ? (
              <ul className="divide-y divide-line">
                {data.upcoming.map((j) => (
                  <JobRow key={j.id} job={j} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={TruckIcon} title="Nothing booked for the next two weeks." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Needs attention" sub={todo.length ? `${todo.length} things to sort out` : undefined} />
            {todo.length ? (
              <ul className="divide-y divide-line">
                {todo.map((a, i) => {
                  const I = a.tone === 'bad' ? XCircleIcon : a.tone === 'warn' ? WarningCircleIcon : InfoIcon;
                  return (
                    <li key={i}>
                      <Link to={`/jobs/${a.jobId}`} className="flex items-start gap-3 px-5 py-3 hover:bg-sunken/60">
                        <I size={20} weight="fill" className={cx('mt-0.5 shrink-0', a.tone === 'bad' ? 'text-bad' : a.tone === 'warn' ? 'text-warn' : 'text-info')} aria-hidden />
                        <span className="flex-1 text-[14px]">{a.text}</span>
                        <span className="shrink-0 text-[13px] font-semibold text-primary">{a.action}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={CheckCircleIcon} title="All clear">
                Nothing needs you right now.
              </EmptyState>
            )}
          </Card>

          <Card>
            <CardHeader title="Most hired this month" />
            {data.top.length ? (
              <ol className="divide-y divide-line">
                {data.top.map(({item, qty}, i) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="tabular w-5 text-[13px] font-semibold text-muted">{i + 1}</span>
                    <span className="code w-16 text-[13px] text-primary-deep">{item.code}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{item.name}</span>
                    <span className="tabular text-[14px] font-semibold">{qty}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={FileTextIcon} title="No orders yet this month." />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function TodayList({title, icon: I, jobs, empty, kind}: {title: string; icon: typeof TruckIcon; jobs: ReturnType<typeof movements>['out']; empty: string; kind: 'out' | 'back'}) {
  return (
    <div className="p-5 max-md:p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
        <I size={16} weight="bold" aria-hidden /> {title} <span className="tabular">({jobs.length})</span>
      </h3>
      {jobs.length === 0 ? (
        <p className="text-[14px] text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link to={`/jobs/${j.id}`} className="block rounded-[var(--radius-control)] border border-line p-3 hover:border-control/60 hover:bg-sunken/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{j.eventName}</span>
                  <Chip tone={kind === 'out' ? 'info' : 'warn'} icon={false}>
                    {j.fulfilment === 'collection' ? (kind === 'out' ? 'Client collects' : 'Client returns') : j.deliveryWindow}
                  </Chip>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-muted">
                  {j.lines.reduce((n, l) => n + l.qty, 0)} items · {j.venue}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
