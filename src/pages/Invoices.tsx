import {DownloadSimpleIcon, ReceiptIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {Button, Card, Chip, EmptyState, Money, PageHeader, StatTile, toast} from '../components/ui';
import {daysBetween, formatDate, today} from '../domain/dates';
import {formatRand} from '../domain/money';
import {balance, totals} from '../domain/totals';
import {clientLabel, clientMap, inBranch} from '../data/selectors';
import {useStore} from '../data/store';
import {cx} from '../lib/cx';

type F = 'all' | 'owing' | 'paid' | 'deposits';

export function Invoices() {
  const s = useStore((x) => x);
  const [f, setF] = useState<F>('all');
  const clients = clientMap(s);
  const T = today();

  const rows = useMemo(
    () =>
      s.jobs
        .filter(inBranch(s))
        .filter((j) => j.invoiceNo && j.status !== 'cancelled')
        .map((j) => ({j, t: totals(j, s.settings), b: balance(j, s.settings)}))
        .sort((a, b) => b.j.invoiceNo!.localeCompare(a.j.invoiceNo!)),
    [s],
  );
  const owing = rows.filter((r) => r.b.hireDue > 0 && r.j.status === 'closed');
  const held = rows.filter((r) => r.b.depositPaid > r.b.refunded && r.j.status !== 'closed');
  const shown = f === 'owing' ? owing : f === 'paid' ? rows.filter((r) => r.b.hireDue === 0) : f === 'deposits' ? held : rows;
  const sum = (xs: typeof rows, fn: (r: (typeof rows)[number]) => number) => xs.reduce((n, r) => n + fn(r), 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        sub="Issued invoices can’t be edited — corrections are made with a credit note."
        actions={
          <Button icon={DownloadSimpleIcon} onClick={() => toast('In the live system this downloads a CSV for the bookkeeper')}>
            Export for bookkeeper
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-3 gap-4 max-md:grid-cols-1 max-md:gap-3">
        <StatTile label="Overdue" value={formatRand(sum(owing, (r) => r.b.hireDue), {decimals: false})} delta={{text: `${owing.length} ${owing.length === 1 ? 'invoice' : 'invoices'}`, tone: owing.length ? 'bad' : 'ok'}} />
        <StatTile label="Deposits held" value={formatRand(sum(held, (r) => r.b.depositPaid - r.b.refunded), {decimals: false})} delta={{text: `${held.length} bookings`, tone: 'neutral'}} />
        <StatTile label="Invoiced (all time, demo)" value={formatRand(sum(rows, (r) => r.t.total), {decimals: false})} />
      </div>
      <Card>
        <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3 max-md:px-4" role="group" aria-label="Filter invoices">
          {(
            [
              ['all', 'All'],
              ['owing', 'Overdue'],
              ['paid', 'Paid'],
              ['deposits', 'Deposits held'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} aria-pressed={f === k} onClick={() => setF(k)} className={cx('h-8 rounded-full px-3 text-[13px] font-semibold', f === k ? 'bg-primary-deep text-white' : 'bg-sunken text-muted hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={ReceiptIcon} title="Nothing here." />
        ) : (
          <div className="overflow-x-auto max-md:overflow-visible">
            <table className="w-full text-[14px] max-md:text-[13.5px]">
              <thead className="bg-sunken text-left text-[12px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-2.5 pl-5 font-semibold max-md:pl-4">Invoice</th>
                  <th className="py-2.5 font-semibold max-md:hidden">Client</th>
                  <th className="py-2.5 font-semibold max-md:hidden">Event</th>
                  <th className="py-2.5 text-right font-semibold">Total</th>
                  <th className="py-2.5 text-right font-semibold max-md:hidden">Deposit</th>
                  <th className="py-2.5 pr-5 text-right font-semibold max-md:pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map(({j, t, b}) => {
                  const overdue = b.hireDue > 0 && j.status === 'closed';
                  return (
                    <tr key={j.id} className="h-12">
                      <td className="pl-5 max-md:pl-4">
                        <Link to={`/doc/invoice/${j.id}`} className="code text-[13px] text-primary-deep hover:underline">
                          {j.invoiceNo}
                        </Link>
                        <span className="block text-[12.5px] text-muted md:hidden">{clientLabel(clients.get(j.clientId))}</span>
                      </td>
                      <td className="max-md:hidden">{clientLabel(clients.get(j.clientId))}</td>
                      <td className="text-muted max-md:hidden">
                        <Link to={`/jobs/${j.id}`} className="hover:underline">
                          {j.eventName}
                        </Link>{' '}
                        · {formatDate(j.eventDate, {weekday: false})}
                      </td>
                      <td className="text-right">
                        <Money cents={t.total} />
                      </td>
                      <td className="text-right text-muted max-md:hidden">{b.depositPaid ? (b.refunded ? 'Refunded' : formatRand(b.depositPaid)) : '—'}</td>
                      <td className="pr-5 text-right max-md:pr-4">
                        {overdue ? <Chip tone="bad">Owes {formatRand(b.hireDue, {decimals: false})} · {daysBetween(j.backDate, T)}d</Chip> : b.hireDue === 0 ? <Chip tone="ok">Paid</Chip> : <Chip tone="info">Due on delivery</Chip>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
