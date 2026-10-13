import {DownloadSimpleIcon, PrinterIcon, TableIcon, ChartBarIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Button, Card, CardHeader, Money, PageHeader, StatTile, StatusChip} from '../components/ui';
import {addDays, formatDate, monthKey, MONTHS_LONG, today} from '../domain/dates';
import {isQuote} from '../domain/lifecycle';
import {formatRand} from '../domain/money';
import {totals} from '../domain/totals';
import type {CollectionId, Job} from '../domain/types';
import {COLLECTIONS} from '../data/catalogue';
import {BRANCHES, clientLabel, clientMap, inBranch, itemMap} from '../data/selectors';
import {useStore} from '../data/store';
import {cx} from '../lib/cx';

// SVG presentation attributes can't read CSS variables, so the validated
// series colours (--color-series-* in index.css) are repeated here.
const PTA = '#008f88';
const KDP = '#b3681c';
const INK = '#1c2725';
const MUTED = '#5b6663';
const GRID = '#e4ddd0';
const label = (m: string) => `${MONTHS_LONG[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const short = (m: string) => MONTHS_LONG[Number(m.slice(5)) - 1].slice(0, 3);
const kRand = (c: number) => (c >= 100_000_00 ? `R${(c / 100_000_00).toFixed(1)}m` : `R${Math.round(c / 100_000)}k`);

export function Reports() {
  const s = useStore((x) => x);
  const T = today();
  const months = useMemo(() => {
    const out: string[] = [];
    let d = `${monthKey(T)}-01`;
    for (let i = 0; i < 4; i++) {
      out.unshift(monthKey(d));
      d = addDays(d, -1).slice(0, 8) + '01';
    }
    return out;
  }, [T]);
  const [month, setMonth] = useState(months[months.length - 1]);
  const [asTable, setAsTable] = useState(false);
  const clients = clientMap(s);
  const items = itemMap(s);

  const orders = s.jobs.filter(inBranch(s)).filter((j) => !isQuote(j.status) && j.status !== 'cancelled');
  const all = s.jobs.filter(inBranch(s));
  const rev = (js: Job[]) => js.reduce((n, j) => n + totals(j, s.settings).total, 0);
  const inMonth = orders.filter((j) => monthKey(j.eventDate) === month).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const quotesInMonth = all.filter((j) => monthKey(j.createdAt) === month && j.status !== 'draft');
  const won = quotesInMonth.filter((j) => !isQuote(j.status) && j.status !== 'cancelled').length;
  const monthRev = rev(inMonth);

  const byMonth = months.map((m) => {
    const js = s.jobs.filter((j) => !isQuote(j.status) && j.status !== 'cancelled' && monthKey(j.eventDate) === m);
    return {month: short(m), full: label(m), pta: rev(js.filter((j) => j.branch === 'pta')), kdp: rev(js.filter((j) => j.branch === 'kdp'))};
  });

  const byCollection = useMemo(() => {
    const sums: Record<CollectionId, number> = {furniture: 0, linen: 0, decor: 0, props: 0, games: 0};
    for (const j of inMonth) for (const l of j.lines) sums[items.get(l.itemId)!.collection] += l.qty * l.unitPrice;
    return COLLECTIONS.map((c) => ({name: c.label, value: sums[c.id]})).sort((a, b) => b.value - a.value);
  }, [inMonth, items]);

  const hired = new Map<string, number>();
  for (const j of orders.filter((j) => j.eventDate >= addDays(T, -90))) for (const l of j.lines) hired.set(l.itemId, (hired.get(l.itemId) ?? 0) + l.qty);
  const top = [...hired.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const never = s.items.filter((i) => !hired.has(i.id));

  const bestCollection = byCollection[0];
  const prev = byMonth[byMonth.length - 2];
  const cur = byMonth.find((b) => b.full === label(month))!;
  const summary = `${label(month)}: ${inMonth.length} orders worth ${formatRand(monthRev, {decimals: false})}${bestCollection?.value ? `, led by ${bestCollection.name}` : ''}.`;

  const exportCsv = () => {
    const rows = [
      ['Invoice', 'Quote', 'Event date', 'Event', 'Client', 'Branch', 'Status', 'Total (R)'],
      ...inMonth.map((j) => [j.invoiceNo ?? '', j.quoteNo, j.eventDate, j.eventName, clientLabel(clients.get(j.clientId)), BRANCHES[j.branch].short, j.status, (totals(j, s.settings).total / 100).toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], {type: 'text/csv'}));
    const a = Object.assign(document.createElement('a'), {href: url, download: `eastco-orders-${month}.csv`});
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        sub={`${s.branch === 'all' ? 'Both branches' : BRANCHES[s.branch].name} · by event date`}
        actions={
          <>
            <label className="flex items-center gap-2 text-[14px]">
              <span className="font-medium text-muted">Month</span>
              <select className="h-10 rounded-[var(--radius-control)] border border-control/60 bg-surface px-3 font-semibold" value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {label(m)}
                  </option>
                ))}
              </select>
            </label>
            <Button icon={PrinterIcon} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:gap-3">
        <StatTile label="Orders" value={inMonth.length} />
        <StatTile label="Hire revenue" value={formatRand(monthRev, {decimals: false})} delta={prev && cur && prev.full !== cur.full && prev.pta + prev.kdp ? {text: `${cur.pta + cur.kdp >= prev.pta + prev.kdp ? '▲' : '▼'} vs ${prev.month}`, tone: cur.pta + cur.kdp >= prev.pta + prev.kdp ? 'ok' : 'bad'} : undefined} />
        <StatTile label="Average order" value={formatRand(inMonth.length ? Math.round(monthRev / inMonth.length) : 0, {decimals: false})} />
        <StatTile label="Quotes won" value={quotesInMonth.length ? `${Math.round((won / quotesInMonth.length) * 100)}%` : '—'} delta={{text: `${won} of ${quotesInMonth.length} sent this month`, tone: 'neutral'}} />
      </div>

      <div className="mb-6 grid grid-cols-[3fr_2fr] gap-6 max-xl:grid-cols-1">
        <Card>
          <CardHeader
            title="Hire revenue by month"
            sub="Both branches, last 4 months"
            action={
              <Button size="sm" icon={asTable ? ChartBarIcon : TableIcon} onClick={() => setAsTable(!asTable)}>
                {asTable ? 'Show chart' : 'Show as table'}
              </Button>
            }
          />
          <p className="px-5 pt-3 text-[14px] text-muted">{summary}</p>
          {asTable ? (
            <table className="m-5 w-[calc(100%-40px)] text-[14px]">
              <thead className="text-left text-[12px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-1.5 font-semibold">Month</th>
                  <th className="py-1.5 text-right font-semibold">PTA</th>
                  <th className="py-1.5 text-right font-semibold">KDP</th>
                  <th className="py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {byMonth.map((r) => (
                  <tr key={r.full}>
                    <td className="py-1.5">{r.full}</td>
                    <td className="tabular py-1.5 text-right">{formatRand(r.pta, {decimals: false})}</td>
                    <td className="tabular py-1.5 text-right">{formatRand(r.kdp, {decimals: false})}</td>
                    <td className="tabular py-1.5 text-right font-semibold">{formatRand(r.pta + r.kdp, {decimals: false})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-72 px-2 pt-2 pb-4" role="img" aria-label={`Bar chart. ${byMonth.map((r) => `${r.full}: Pretoria ${formatRand(r.pta, {decimals: false})}, Krugersdorp ${formatRand(r.kdp, {decimals: false})}`).join('. ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth} barGap={2} barCategoryGap="28%" margin={{top: 16, right: 16, left: 4, bottom: 0}}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="month" tickLine={false} axisLine={{stroke: GRID}} tick={{fill: MUTED, fontSize: 13}} />
                  <YAxis tickFormatter={kRand} tickLine={false} axisLine={false} tick={{fill: MUTED, fontSize: 12}} width={52} />
                  <Tooltip
                    cursor={{fill: '#f1ebe0', opacity: 0.6}}
                    formatter={(v, name) => [formatRand(Number(v), {decimals: false}), name]}
                    labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''}
                    contentStyle={{borderRadius: 10, border: '1px solid var(--color-line)', fontSize: 13, color: 'var(--color-ink)'}}
                  />
                  <Legend iconType="square" wrapperStyle={{fontSize: 13, paddingTop: 4}} formatter={(v) => <span style={{color: INK}}>{v}</span>} />
                  <Bar dataKey="pta" name="Pretoria / Centurion" fill={PTA} radius={[4, 4, 0, 0]} stroke="#ffffff" strokeWidth={1} />
                  <Bar dataKey="kdp" name="Krugersdorp" fill={KDP} radius={[4, 4, 0, 0]} stroke="#ffffff" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="By collection" sub={`Item revenue in ${label(month)}`} />
          <div className="h-72 px-2 pt-3 pb-3" role="img" aria-label={`Bar chart. ${byCollection.map((c) => `${c.name} ${formatRand(c.value, {decimals: false})}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCollection} layout="vertical" margin={{top: 4, right: 72, left: 4, bottom: 4}} barCategoryGap="30%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{fill: INK, fontSize: 13}} width={84} />
                <Tooltip cursor={{fill: '#f1ebe0', opacity: 0.6}} formatter={(v) => [formatRand(Number(v), {decimals: false}), 'Revenue']} contentStyle={{borderRadius: 10, border: '1px solid var(--color-line)', fontSize: 13}} />
                <Bar dataKey="value" fill={PTA} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="value" position="right" formatter={(v) => formatRand(Number(v), {decimals: false})} style={{fill: INK, fontSize: 12.5}} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader
          title={`Orders for ${label(month)}`}
          sub={`${inMonth.length} orders · ${formatRand(monthRev)}`}
          action={
            <Button size="sm" icon={DownloadSimpleIcon} onClick={exportCsv} disabled={!inMonth.length}>
              Download Excel (CSV)
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead className="bg-sunken text-left text-[12px] tracking-wide text-muted uppercase">
              <tr>
                <th className="py-2 pl-5 font-semibold">Date</th>
                <th className="py-2 font-semibold">Invoice</th>
                <th className="py-2 font-semibold">Event</th>
                <th className="py-2 font-semibold">Client</th>
                <th className="py-2 font-semibold">Branch</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 pr-5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inMonth.map((j) => (
                <tr key={j.id} className="h-11">
                  <td className="pl-5 whitespace-nowrap">{formatDate(j.eventDate, {year: false})}</td>
                  <td>
                    <Link to={`/jobs/${j.id}`} className="code text-[13px] text-primary-deep hover:underline">
                      {j.invoiceNo ?? j.quoteNo}
                    </Link>
                  </td>
                  <td>{j.eventName}</td>
                  <td className="text-muted">{clientLabel(clients.get(j.clientId))}</td>
                  <td>{BRANCHES[j.branch].short}</td>
                  <td>
                    <StatusChip status={j.status} />
                  </td>
                  <td className="pr-5 text-right">
                    <Money cents={totals(j, s.settings).total} />
                  </td>
                </tr>
              ))}
              {inMonth.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted">
                    No orders in this month. Try another month.
                  </td>
                </tr>
              )}
            </tbody>
            {inMonth.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-ink font-semibold">
                  <td colSpan={6} className="py-2.5 pl-5">
                    Total
                  </td>
                  <td className="tabular py-2.5 pr-5 text-right">{formatRand(monthRev)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
        <Card>
          <CardHeader title="Most hired (last 90 days)" sub="What to buy more of" />
          <ol className="divide-y divide-line">
            {top.map(([id, qty], i) => {
              const it = items.get(id)!;
              return (
                <li key={id} className="flex items-center gap-3 px-5 py-2.5 text-[14px]">
                  <span className="tabular w-5 text-muted">{i + 1}</span>
                  <span className="code w-16 text-[13px] text-primary-deep">{it.code}</span>
                  <span className="flex-1 truncate">{it.name}</span>
                  <span className="tabular font-semibold">{qty}</span>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card>
          <CardHeader title="Not hired in 90 days" sub={`${never.length} items — consider selling or featuring them`} />
          <ul className="max-h-[340px] divide-y divide-line overflow-y-auto">
            {never.map((it) => (
              <li key={it.id} className={cx('flex items-center gap-3 px-5 py-2.5 text-[14px]')}>
                <span className="code w-16 text-[13px] text-primary-deep">{it.code}</span>
                <span className="flex-1 truncate">{it.name}</span>
                <span className="text-muted">{it.stock.pta + it.stock.kdp} owned</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
