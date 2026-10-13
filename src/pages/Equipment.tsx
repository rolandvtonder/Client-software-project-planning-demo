import {FilePdfIcon, MagnifyingGlassIcon, PackageIcon, UploadSimpleIcon, WrenchIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Button, Card, Chip, Dialog, EmptyState, Field, inputClass, PageHeader, QtyStepper, toast} from '../components/ui';
import {availability, freeByDay} from '../domain/availability';
import {addDays, eachDay, fromISO, today} from '../domain/dates';
import {formatRand} from '../domain/money';
import type {BranchId, CollectionId, Item} from '../domain/types';
import {COLLECTIONS, collectionLabel, photoUrl} from '../data/catalogue';
import {BRANCHES} from '../data/selectors';
import {actions, useStore} from '../data/store';
import {cx} from '../lib/cx';

export function Equipment() {
  const {items, jobs, branch} = useStore((s) => ({items: s.items, jobs: s.jobs, branch: s.branch}));
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [col, setCol] = useState<CollectionId | 'all'>('all');
  const [importing, setImporting] = useState(false);
  const T = today();
  const openId = params.get('item');
  const open = items.find((i) => i.id === openId);
  const b: BranchId = branch === 'all' ? 'pta' : branch;

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return items
      .filter((i) => col === 'all' || i.collection === col)
      .filter((i) => !t || i.code.toLowerCase().includes(t) || i.name.toLowerCase().includes(t) || i.category.toLowerCase().includes(t))
      .map((i) => ({i, pta: availability(i, 'pta', T, T, jobs), kdp: availability(i, 'kdp', T, T, jobs)}));
  }, [items, jobs, q, col, T]);

  return (
    <>
      <PageHeader
        title="Equipment"
        sub={`${items.length} items across 5 collections · stock per branch, out-of-service and what’s out today`}
        actions={
          <Button variant="primary" icon={UploadSimpleIcon} onClick={() => setImporting(true)}>
            Import catalogue
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 max-md:px-4">
          <div className="relative min-w-60 flex-1">
            <MagnifyingGlassIcon size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input aria-label="Search equipment" className={cx(inputClass, 'pl-9')} placeholder="Code, name or category" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Collection">
            {[{id: 'all' as const, label: 'All'}, ...COLLECTIONS].map((c) => (
              <button key={c.id} aria-pressed={col === c.id} onClick={() => setCol(c.id)} className={cx('h-8 rounded-full px-3 text-[13px] font-semibold', col === c.id ? 'bg-primary-deep text-white' : 'bg-sunken text-muted hover:text-ink')}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={PackageIcon} title="No items match." />
        ) : (
          <table className="w-full text-[14px]">
            <thead className="sticky top-16 z-10 bg-sunken text-left text-[12px] tracking-wide text-muted uppercase max-md:top-14">
              <tr>
                <th className="py-2.5 pl-5 font-semibold max-md:pl-4">Item</th>
                <th className="py-2.5 font-semibold max-lg:hidden">Category</th>
                <th className="py-2.5 text-right font-semibold max-md:hidden">Price</th>
                <th className="py-2.5 text-right font-semibold">PTA</th>
                <th className="py-2.5 text-right font-semibold">KDP</th>
                <th className="py-2.5 pr-5 text-right font-semibold max-md:pr-4">Out today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({i, pta, kdp}) => {
                const out = pta.reserved + kdp.reserved;
                const oos = i.outOfService.pta + i.outOfService.kdp;
                return (
                  <tr key={i.id} className="h-12 cursor-pointer hover:bg-sunken/50" onClick={() => setParams({item: i.id})}>
                    <td className="py-2 pl-5 max-md:pl-4">
                      <button className="flex items-center gap-3 text-left" onClick={(e) => (e.stopPropagation(), setParams({item: i.id}))}>
                        <img src={photoUrl(i)} alt="" loading="lazy" className="size-10 shrink-0 rounded-[var(--radius-control)] bg-white object-contain" />
                        <span className="code mr-2 text-[13px] text-primary-deep">{i.code}</span>
                        <span className="font-medium">{i.name}</span>
                        {oos > 0 && (
                          <span className="ml-2 inline-flex">
                            <Chip tone="warn" icon={WrenchIcon}>
                              {oos} out of service
                            </Chip>
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="text-muted max-lg:hidden">
                      {collectionLabel(i.collection)} · {i.category}
                    </td>
                    <td className="tabular text-right max-md:hidden">{formatRand(i.price)}</td>
                    <td className="tabular text-right">{i.stock.pta}</td>
                    <td className="tabular text-right">{i.stock.kdp}</td>
                    <td className={cx('tabular pr-5 text-right max-md:pr-4', out > 0 ? 'font-semibold' : 'text-muted')}>{out || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {open && <ItemDialog key={open.id} item={open} branch={b} onClose={() => setParams({})} />}
      <ImportDialog open={importing} onClose={() => setImporting(false)} count={items.length} />
    </>
  );
}

function ItemDialog({item, branch: initial, onClose}: {item: Item; branch: BranchId; onClose: () => void}) {
  const jobs = useStore((s) => s.jobs);
  const [branch, setBranch] = useState<BranchId>(initial);
  const [draft, setDraft] = useState(item);
  const T = today();
  const days = eachDay(T, addDays(T, 34));
  const free = freeByDay(item, branch, days, jobs);
  const usable = item.stock[branch] - item.outOfService[branch];

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={`${item.code} · ${item.name}`}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            onClick={() => {
              actions.saveItem(draft);
              toast(`${item.code} updated`);
              onClose();
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[160px_1fr] gap-5 max-md:grid-cols-1">
        <img src={photoUrl(item)} alt={item.name} className="h-40 w-full rounded-[var(--radius-card)] bg-white object-contain" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <dt className="text-muted">Collection</dt>
          <dd>
            {collectionLabel(item.collection)} · {item.category}
          </dd>
          {item.size && (
            <>
              <dt className="text-muted">Size</dt>
              <dd>{item.size}</dd>
            </>
          )}
          <dt className="text-muted">Hire price</dt>
          <dd className="tabular">{formatRand(item.price)}</dd>
          <dt className="text-muted">Replacement cost</dt>
          <dd className="tabular">{formatRand(item.replacementCost)}</dd>
          <dt className="text-muted">Cleaning fee</dt>
          <dd className="tabular">{item.cleaningFee ? formatRand(item.cleaningFee) : '—'}</dd>
          <dt className="text-muted">Turnaround</dt>
          <dd>{item.turnaroundDays ? `${item.turnaroundDays} day after return (washing)` : 'Same day'}</dd>
          <dt className="text-muted">Store room</dt>
          <dd>{item.location}</dd>
        </dl>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Free per day — next 5 weeks</h3>
        <div className="flex gap-1">
          {(['pta', 'kdp'] as const).map((x) => (
            <button key={x} aria-pressed={branch === x} onClick={() => setBranch(x)} className={cx('h-8 rounded-full px-3 text-[13px] font-semibold', branch === x ? 'bg-primary-deep text-white' : 'bg-sunken text-muted')}>
              {BRANCHES[x].short} ({item.stock[x]})
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1" role="table" aria-label={`Free ${item.name} per day at ${BRANCHES[branch].name}`}>
        {days.map((d) => {
          const n = free[d];
          const tone = n <= 0 ? 'bg-bad-tint text-bad' : n < Math.max(2, usable * 0.2) ? 'bg-warn-tint text-warn' : 'bg-ok-tint text-ok';
          return (
            <div key={d} role="cell" className={cx('rounded-[var(--radius-control)] px-1 py-1.5 text-center', tone, d === T && 'ring-2 ring-primary')}>
              <span className="block text-[11px] font-medium opacity-80">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][fromISO(d).getDay()]} {fromISO(d).getDate()}
              </span>
              <span className="tabular block text-[15px] font-semibold">{n}</span>
            </div>
          );
        })}
      </div>

      <h3 className="mt-5 mb-2 font-semibold">Stock</h3>
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {(['pta', 'kdp'] as const).map((x) => (
          <fieldset key={x} className="rounded-[var(--radius-card)] border border-line p-3">
            <legend className="px-1 text-[13px] font-semibold">{BRANCHES[x].name}</legend>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-[14px]">Owned</span>
              <QtyStepper value={draft.stock[x]} onChange={(n) => setDraft({...draft, stock: {...draft.stock, [x]: n}})} label={`${BRANCHES[x].short} stock`} />
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-[14px]">Out of service</span>
              <QtyStepper value={draft.outOfService[x]} onChange={(n) => setDraft({...draft, outOfService: {...draft.outOfService, [x]: Math.min(n, draft.stock[x])}})} label={`${BRANCHES[x].short} out of service`} />
            </div>
          </fieldset>
        ))}
      </div>
      <Field label="Hire price (R)" className="mt-4 max-w-48">
        {(p) => <input {...p} inputMode="decimal" className={inputClass} value={(draft.price / 100).toFixed(2).replace('.', ',')} onChange={(e) => setDraft({...draft, price: Math.round(parseFloat(e.target.value.replace(',', '.') || '0') * 100)})} />}
      </Field>
    </Dialog>
  );
}

function ImportDialog({open, onClose, count}: {open: boolean; onClose: () => void; count: number}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import from catalogues"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => (onClose(), toast('In the live system this opens the preview grid to check before saving'))}>
            Check & import
          </Button>
        </>
      }
    >
      <p className="text-[14px]">Upload Eastco’s catalogue PDFs or a spreadsheet. The system reads the codes, names, sizes, quantities and prices, then shows a grid to check before anything is saved.</p>
      <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line">
        {COLLECTIONS.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 text-[14px]">
            <FilePdfIcon size={22} className="text-bad" aria-hidden />
            <span className="flex-1">eastco-{c.id}-september-2026.pdf</span>
            <Chip tone="ok">Read</Chip>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-muted">This demo already has {count} items from these catalogues. The live import reads every item.</p>
    </Dialog>
  );
}
