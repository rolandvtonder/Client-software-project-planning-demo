import {CaretRightIcon, ClipboardTextIcon, MagnifyingGlassIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Card, EmptyState, inputClass, Money, PageHeader, StatusChip} from '../components/ui';
import {formatDate, today} from '../domain/dates';
import {isActiveOrder, isQuote} from '../domain/lifecycle';
import {totals} from '../domain/totals';
import {BRANCHES, clientLabel, clientMap, inBranch} from '../data/selectors';
import {useStore} from '../data/store';
import {cx} from '../lib/cx';

type View = 'upcoming' | 'active' | 'past' | 'all';
const VIEWS: {key: View; label: string}[] = [
  {key: 'upcoming', label: 'Upcoming'},
  {key: 'active', label: 'Out on hire'},
  {key: 'past', label: 'Past'},
  {key: 'all', label: 'All'},
];

export function Jobs() {
  const s = useStore((x) => x);
  const [view, setView] = useState<View>('upcoming');
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const clients = clientMap(s);
  const T = today();

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return s.jobs
      .filter(inBranch(s))
      .filter((j) => !isQuote(j.status))
      .filter((j) => {
        if (view === 'upcoming') return isActiveOrder(j.status) && ['confirmed', 'packing'].includes(j.status);
        if (view === 'active') return ['out_for_delivery', 'on_hire', 'returned', 'issues'].includes(j.status);
        if (view === 'past') return j.status === 'closed' || j.status === 'cancelled';
        return true;
      })
      .filter((j) => !t || [j.eventName, j.invoiceNo, j.quoteNo, clientLabel(clients.get(j.clientId))].some((v) => v?.toLowerCase().includes(t)))
      .sort((a, b) => (view === 'past' || view === 'all' ? b.eventDate.localeCompare(a.eventDate) : a.eventDate.localeCompare(b.eventDate)));
  }, [s, view, q, clients]);

  return (
    <>
      <PageHeader title="Orders" sub="Every confirmed booking, from deposit to deposit refund." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 max-md:px-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
            {VIEWS.map((v) => (
              <button key={v.key} aria-pressed={view === v.key} onClick={() => setView(v.key)} className={cx('h-8 rounded-full px-3 text-[13px] font-semibold', view === v.key ? 'bg-primary-deep text-white' : 'bg-sunken text-muted hover:text-ink')}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto min-w-56 max-md:ml-0 max-md:w-full">
            <MagnifyingGlassIcon size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input aria-label="Search orders" className={cx(inputClass, 'pl-9')} placeholder="Event, client or INV number" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={ClipboardTextIcon} title="No orders here." />
        ) : (
          <>
            <table className="w-full text-[14px] max-md:hidden">
              <thead className="bg-sunken text-left text-[12px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-2.5 pl-5 font-semibold">Invoice</th>
                  <th className="py-2.5 font-semibold">Event</th>
                  <th className="py-2.5 font-semibold">Client</th>
                  <th className="py-2.5 font-semibold" aria-sort={view === 'past' ? 'descending' : 'ascending'}>
                    Event date
                  </th>
                  <th className="py-2.5 font-semibold">Branch</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 pr-5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((j) => (
                  <tr key={j.id} className="h-12 cursor-pointer hover:bg-sunken/50" onClick={() => navigate(`/jobs/${j.id}`)}>
                    <td className="code pl-5 text-[13px] text-primary-deep">
                      <Link to={`/jobs/${j.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {j.invoiceNo ?? j.quoteNo}
                      </Link>
                    </td>
                    <td className="font-medium">{j.eventName}</td>
                    <td className="text-muted">{clientLabel(clients.get(j.clientId))}</td>
                    <td className={cx(j.eventDate === T && 'font-semibold')}>{formatDate(j.eventDate)}</td>
                    <td>{BRANCHES[j.branch].short}</td>
                    <td>
                      <StatusChip status={j.status} />
                    </td>
                    <td className="pr-5 text-right">
                      <Money cents={totals(j, s.settings).total} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((j) => (
                <li key={j.id}>
                  <Link to={`/jobs/${j.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{j.eventName}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {formatDate(j.eventDate, {year: false})} · {clientLabel(clients.get(j.clientId))}
                      </span>
                    </span>
                    <StatusChip status={j.status} />
                    <CaretRightIcon size={18} className="text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
