import {
  ArrowLeftIcon,
  ArrowsLeftRightIcon,
  ChatCircleTextIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  FloppyDiskIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  SquaresFourIcon,
  TrashIcon,
  UserPlusIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {AvailabilityPill} from '../components/AvailabilityPill';
import {Button, Card, Chip, Dialog, Field, IconButton, inputClass, PageHeader, QtyStepper, Segmented, toast} from '../components/ui';
import {checkLine, type LineCheck} from '../domain/availability';
import {addDays, formatDate, relative, today} from '../domain/dates';
import {isQuote} from '../domain/lifecycle';
import {formatRand, rand} from '../domain/money';
import {lineTotal, suggestedDeposit, totals} from '../domain/totals';
import type {BranchId, CollectionId, Item, Job, Line} from '../domain/types';
import {COLLECTIONS, collectionLabel} from '../data/catalogue';
import {BRANCHES, clientLabel} from '../data/selectors';
import {actions, currentUser, getState, newId, useStore} from '../data/store';
import {cx} from '../lib/cx';
import {ClientForm} from './Clients';

const EVENT_TYPES: Job['eventType'][] = ['Wedding', 'Birthday', 'Baby shower', 'Corporate', 'Conference', 'Private dinner', 'Other'];

function blankJob(branch: BranchId): Job {
  const event = addDays(today(), 14);
  return {
    id: newId('j'),
    quoteNo: '',
    clientId: '',
    branch,
    eventName: '',
    eventType: 'Wedding',
    eventDate: event,
    outDate: addDays(event, -1),
    backDate: addDays(event, 1),
    fulfilment: 'delivery',
    venue: '',
    deliveryWindow: '08:00 – 10:00',
    lines: [],
    deliveryFee: rand(450),
    setupFee: 0,
    discountPct: 0,
    depositDue: 0,
    validUntil: addDays(today(), 14),
    status: 'draft',
    createdAt: today(),
    createdBy: currentUser(),
    payments: [],
    charges: [],
    history: [],
  };
}

export function QuoteBuilder() {
  const {id} = useParams();
  const navigate = useNavigate();
  const existing = useStore((s) => (id ? s.jobs.find((j) => j.id === id) : undefined), [id]);
  const {items, clients, jobs, settings, branch} = useStore((s) => ({items: s.items, clients: s.clients, jobs: s.jobs, settings: s.settings, branch: s.branch}));
  const [params] = useSearchParams();
  const [job, setJob] = useState<Job>(() => {
    if (existing) return existing;
    const j = blankJob(branch === 'all' ? 'pta' : branch);
    const c = clients.find((x) => x.id === params.get('client'));
    return c ? {...j, clientId: c.id, branch: c.branch, venue: c.addresses[0]?.line ?? ''} : j;
  });
  const [depositEdited, setDepositEdited] = useState(!!existing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [newClient, setNewClient] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const t = totals(job, settings);
  const deposit = depositEdited ? job.depositDue : suggestedDeposit(t.total, settings);
  const otherBranch: BranchId = job.branch === 'pta' ? 'kdp' : 'pta';
  const confirmed = !isQuote(job.status);

  const checks = useMemo(() => {
    const m = new Map<number, LineCheck>();
    job.lines.forEach((l, i) => {
      const item = itemsById.get(l.itemId)!;
      m.set(i, checkLine(item, l.qty, l.source ?? job.branch, job.outDate, job.backDate, jobs, {excludeJobId: job.id}));
    });
    return m;
  }, [job, jobs, itemsById]);
  const shortLines = [...checks.values()].filter((c) => c.tone === 'short').length;

  // Autosave drafts of existing jobs is overkill for the demo; warn before leaving instead.
  const dirty = useRef(false);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const patch = (p: Partial<Job>) => {
    dirty.current = true;
    setJob((j) => ({...j, ...p}));
  };

  const setEventDate = (d: string) => {
    const diffOut = job.outDate && job.eventDate ? Math.round((new Date(job.eventDate).getTime() - new Date(job.outDate).getTime()) / 86400000) : 1;
    const diffBack = job.backDate && job.eventDate ? Math.round((new Date(job.backDate).getTime() - new Date(job.eventDate).getTime()) / 86400000) : 1;
    patch({eventDate: d, outDate: addDays(d, -diffOut), backDate: addDays(d, diffBack)});
  };

  const addItem = (item: Item, qty = 1) => {
    setJob((j) => {
      const idx = j.lines.findIndex((l) => l.itemId === item.id && !l.source);
      if (idx >= 0) return {...j, lines: j.lines.map((l, i) => (i === idx ? {...l, qty: l.qty + qty} : l))};
      return {...j, lines: [...j.lines, {itemId: item.id, qty, unitPrice: item.price, discountPct: 0}]};
    });
    dirty.current = true;
    setFlash(item.id);
    setTimeout(() => setFlash(null), 900);
  };

  const setLine = (i: number, p: Partial<Line>) => patch({lines: job.lines.map((l, k) => (k === i ? {...l, ...p} : l))});
  const removeLine = (i: number) => {
    const before = job.lines;
    patch({lines: job.lines.filter((_, k) => k !== i)});
    toast('Line removed', () => setJob((j) => ({...j, lines: before})));
  };
  const borrow = (i: number) => {
    const c = checks.get(i);
    if (!c || c.tone !== 'short') return;
    const l = job.lines[i];
    const move = Math.min(c.short, c.otherBranchFree);
    const lines = [...job.lines];
    lines[i] = {...l, qty: l.qty - move};
    const existingIdx = lines.findIndex((x) => x.itemId === l.itemId && x.source === otherBranch);
    if (existingIdx >= 0) lines[existingIdx] = {...lines[existingIdx], qty: lines[existingIdx].qty + move};
    else lines.splice(i + 1, 0, {...l, qty: move, source: otherBranch});
    patch({lines: lines.filter((x) => x.qty > 0)});
    toast(`${move} × ${itemsById.get(l.itemId)!.name} will come from ${BRANCHES[otherBranch].short}`);
  };

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!job.clientId) e.client = 'Choose a client, or add a new one.';
    if (!job.eventName.trim()) e.eventName = 'Give the event a name, e.g. “Botha wedding”.';
    if (job.backDate < job.outDate) e.backDate = 'The return date must be on or after the delivery date.';
    if (job.lines.length === 0) e.lines = 'Add at least one item.';
    if (confirmed && shortLines) e.lines = 'This order is confirmed, so every line must be available. Borrow stock or lower the quantities.';
    setErrors(e);
    if (Object.keys(e).length) setTimeout(() => errorRef.current?.focus(), 0);
    return Object.keys(e).length === 0;
  }

  function persist(note: string, p: Partial<Job> = {}): Job {
    const state = getState();
    const quoteNo = job.quoteNo || actions.nextNumber('Q');
    const saved: Job = {
      ...job,
      ...p,
      quoteNo,
      depositDue: deposit,
      validUntil: job.validUntil || addDays(today(), state.settings.quoteValidDays),
      history: job.history.length ? job.history : [],
    };
    actions.saveJob(saved, note);
    dirty.current = false;
    setJob(saved);
    return saved;
  }

  const save = () => {
    if (!validate()) return;
    const s = persist(existing ? (confirmed ? 'Order changed after confirmation — availability re-checked' : 'Quote updated') : 'Quote created as draft');
    toast(`${s.quoteNo} saved`);
    if (!existing) navigate(`/jobs/${s.id}/edit`, {replace: true});
  };

  const preview = () => {
    if (!validate()) return;
    const s = persist(existing ? 'Quote updated' : 'Quote created as draft');
    navigate(`/doc/quote/${s.id}`);
  };

  const client = clients.find((c) => c.id === job.clientId);

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        back={
          <Link to={existing ? `/jobs/${job.id}` : '/quotes'} className="mb-2 inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
            <ArrowLeftIcon size={16} aria-hidden /> {existing ? 'Back to job' : 'Quotes'}
          </Link>
        }
        title={existing ? (confirmed ? `Edit order ${job.invoiceNo ?? job.quoteNo}` : `Edit quote ${job.quoteNo}`) : 'New quote'}
        sub={confirmed ? 'Changes to a confirmed order re-check stock and update the invoice. Both versions are kept.' : 'Pick the client and dates first — stock is checked live for those dates.'}
      />

      {Object.keys(errors).length > 0 && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mb-5 rounded-[var(--radius-card)] border border-bad/30 bg-bad-tint p-4 text-bad outline-none">
          <p className="flex items-center gap-2 font-semibold">
            <WarningCircleIcon size={20} weight="fill" aria-hidden /> Please fix {Object.keys(errors).length === 1 ? 'this' : 'these'} first:
          </p>
          <ul className="mt-1 list-disc pl-9 text-[14px]">
            {Object.values(errors).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-[1fr_360px] items-start gap-6 max-lg:grid-cols-1">
        <div className="min-w-0 space-y-6">
          {/* ---------------------------------------------------- details */}
          <Card className="p-5 max-md:p-4">
            <h2 className="mb-4 text-[16px] font-semibold">Client & event</h2>
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <Field label="Client" required error={errors.client} helper={client ? `${client.phone} · ${client.email}` : undefined}>
                {(p) => (
                  <div className="flex gap-2">
                    <select {...p} className={inputClass} value={job.clientId} onChange={(e) => {
                      const c = clients.find((x) => x.id === e.target.value);
                      patch({clientId: e.target.value, venue: job.venue || c?.addresses[0]?.line || '', branch: existing ? job.branch : (c?.branch ?? job.branch)});
                    }}>
                      <option value="">Choose a client…</option>
                      {[...clients].sort((a, b) => clientLabel(a).localeCompare(clientLabel(b))).map((c) => (
                        <option key={c.id} value={c.id}>
                          {clientLabel(c)}
                          {c.company ? ` (${c.name})` : ''}
                        </option>
                      ))}
                    </select>
                    <IconButton icon={UserPlusIcon} label="Add a new client" className="shrink-0 border border-control/60" onClick={() => setNewClient(true)} />
                  </div>
                )}
              </Field>
              <Field label="Event name" required error={errors.eventName}>
                {(p) => <input {...p} className={inputClass} value={job.eventName} onChange={(e) => patch({eventName: e.target.value})} placeholder="e.g. Botha wedding" />}
              </Field>
              <Field label="Event type">
                {(p) => (
                  <select {...p} className={inputClass} value={job.eventType} onChange={(e) => patch({eventType: e.target.value as Job['eventType']})}>
                    {EVENT_TYPES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Branch" helper="Stock is checked at this branch.">
                {() => (
                  <Segmented
                    label="Branch"
                    value={job.branch}
                    onChange={(b) => patch({branch: b, lines: job.lines.map((l) => (l.source === b ? {...l, source: undefined} : l))})}
                    options={[
                      {value: 'pta', label: BRANCHES.pta.name},
                      {value: 'kdp', label: BRANCHES.kdp.name},
                    ]}
                  />
                )}
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 max-md:grid-cols-1">
              <Field label="Event date" required helper={relative(job.eventDate)}>
                {(p) => <input {...p} type="date" className={inputClass} value={job.eventDate} onChange={(e) => e.target.value && setEventDate(e.target.value)} />}
              </Field>
              <Field label={job.fulfilment === 'delivery' ? 'Delivery date' : 'Client collects on'} helper="Stock is reserved from this day.">
                {(p) => <input {...p} type="date" className={inputClass} value={job.outDate} max={job.eventDate} onChange={(e) => e.target.value && patch({outDate: e.target.value})} />}
              </Field>
              <Field label={job.fulfilment === 'delivery' ? 'Collection date' : 'Client returns on'} error={errors.backDate}>
                {(p) => <input {...p} type="date" className={inputClass} value={job.backDate} min={job.eventDate} onChange={(e) => e.target.value && patch({backDate: e.target.value})} />}
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-end gap-4 max-md:grid-cols-1">
              <Field label="Delivery or collection">
                {() => (
                  <Segmented
                    label="Delivery or collection"
                    value={job.fulfilment}
                    onChange={(f) => patch({fulfilment: f, deliveryFee: f === 'collection' ? 0 : job.deliveryFee || rand(450)})}
                    options={[
                      {value: 'delivery', label: 'We deliver'},
                      {value: 'collection', label: 'Client collects'},
                    ]}
                  />
                )}
              </Field>
              <Field label="Venue / address">
                {(p) => <input {...p} className={inputClass} value={job.venue} onChange={(e) => patch({venue: e.target.value})} placeholder="Venue name and address" />}
              </Field>
              {job.fulfilment === 'delivery' && (
                <Field label="Delivery time">
                  {(p) => (
                    <select {...p} className={inputClass} value={job.deliveryWindow} onChange={(e) => patch({deliveryWindow: e.target.value})}>
                      {['06:00 – 08:00', '08:00 – 10:00', '09:00 – 11:00', '10:00 – 12:00', '12:00 – 14:00', '14:00 – 16:00'].map((w) => (
                        <option key={w}>{w}</option>
                      ))}
                    </select>
                  )}
                </Field>
              )}
            </div>
          </Card>

          {/* ---------------------------------------------------- lines */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 max-md:px-4">
              <div>
                <h2 className="text-[16px] font-semibold">Items</h2>
                <p className="text-[13px] text-muted">
                  Stock at {BRANCHES[job.branch].name} for {formatDate(job.outDate, {year: false})} – {formatDate(job.backDate, {year: false})}
                </p>
              </div>
              <Button size="sm" icon={SquaresFourIcon} onClick={() => setBrowse(true)}>
                Browse catalogue
              </Button>
            </div>
            <div className="border-b border-line bg-sunken/40 px-5 py-3 max-md:px-4">
              <ItemSearch items={items} job={job} jobs={jobs} onAdd={addItem} />
            </div>

            {shortLines > 0 && (
              <p className="flex items-center gap-2 border-b border-line bg-bad-tint px-5 py-2.5 text-[14px] text-bad">
                <WarningCircleIcon size={18} weight="fill" aria-hidden />
                {shortLines} {shortLines === 1 ? 'line is' : 'lines are'} short for these dates. You can still send the quote (it says “subject to availability”), but it can’t be confirmed until it’s sorted.
              </p>
            )}
            {errors.lines && job.lines.length === 0 && <p className="px-5 pt-3 text-[14px] text-bad">{errors.lines}</p>}

            {job.lines.length === 0 ? (
              <p className="px-5 py-10 text-center text-[14px] text-muted">
                Type a code or name above — try <span className="code text-ink">CHA10</span> or <span className="code text-ink">50 nap17</span> — or browse the catalogue.
              </p>
            ) : (
              <>
                <table className="w-full text-[14px] max-md:hidden">
                  <thead className="bg-sunken/60 text-left text-[12px] font-semibold tracking-wide text-muted uppercase">
                    <tr>
                      <th className="py-2 pl-5 font-semibold">Item & availability</th>
                      <th className="py-2 font-semibold">Qty</th>
                      <th className="py-2 text-right font-semibold">Price</th>
                      <th className="py-2 text-right font-semibold">Disc.</th>
                      <th className="py-2 pr-2 text-right font-semibold">Total</th>
                      <th className="w-12 py-2">
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {job.lines.map((l, i) => {
                      const item = itemsById.get(l.itemId)!;
                      return (
                        <tr key={`${l.itemId}-${l.source ?? ''}`} className={cx(flash === l.itemId && !l.source && 'animate-flash')}>
                          <td className="py-2.5 pl-5 align-top">
                            <span className="code mr-2 text-[13px] text-primary-deep">{item.code}</span>
                            <span className="font-medium">{item.name}</span>
                            {l.source && (
                              <span className="ml-2 inline-flex">
                                <Chip tone="info" icon={ArrowsLeftRightIcon}>
                                  From {BRANCHES[l.source].short}
                                </Chip>
                              </span>
                            )}
                            {l.unitPrice !== item.price && <span className="ml-2 text-[12px] text-muted" title={`Catalogue price ${formatRand(item.price)}`}>edited price</span>}
                            <div className="mt-1">
                              <AvailabilityPill check={checks.get(i)!} otherBranch={l.source ? job.branch : otherBranch} onTransfer={l.source ? undefined : () => borrow(i)} />
                            </div>
                          </td>
                          <td className="py-2.5">
                            <QtyStepper value={l.qty} onChange={(n) => setLine(i, {qty: n})} label={item.name} />
                          </td>
                          <td className="py-2.5 text-right">
                            <PriceInput cents={l.unitPrice} onChange={(c) => setLine(i, {unitPrice: c})} label={`${item.name} price`} />
                          </td>
                          <td className="py-2.5 text-right">
                            <PctInput value={l.discountPct} onChange={(v) => setLine(i, {discountPct: v})} label={`${item.name} discount`} />
                          </td>
                          <td className="tabular py-2.5 pr-2 text-right font-semibold whitespace-nowrap">{formatRand(lineTotal(l))}</td>
                          <td className="py-2.5 pr-2">
                            <IconButton icon={TrashIcon} label={`Remove ${item.name}`} onClick={() => removeLine(i)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* phones: one card per line */}
                <ul className="divide-y divide-line md:hidden">
                  {job.lines.map((l, i) => {
                    const item = itemsById.get(l.itemId)!;
                    return (
                      <li key={`${l.itemId}-${l.source ?? ''}`} className={cx('space-y-2 px-4 py-3', flash === l.itemId && !l.source && 'animate-flash')}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="code text-[13px] text-primary-deep">
                              {item.code} {l.source && `· from ${BRANCHES[l.source].short}`}
                            </p>
                            <p className="font-medium">{item.name}</p>
                          </div>
                          <IconButton icon={TrashIcon} label={`Remove ${item.name}`} onClick={() => removeLine(i)} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <QtyStepper value={l.qty} onChange={(n) => setLine(i, {qty: n})} label={item.name} />
                          <span className="text-right">
                            <span className="block text-[12px] text-muted">{formatRand(l.unitPrice)} each</span>
                            <span className="tabular font-semibold">{formatRand(lineTotal(l))}</span>
                          </span>
                        </div>
                        <AvailabilityPill check={checks.get(i)!} otherBranch={l.source ? job.branch : otherBranch} onTransfer={l.source ? undefined : () => borrow(i)} />
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Card>

          <Card className="p-5 max-md:p-4">
            <Field label="Notes on the quote" helper="Printed on the quote and the delivery note, e.g. setup times or gate codes.">
              {(p) => <textarea {...p} rows={3} className={cx(inputClass, 'h-auto py-2')} value={job.notes ?? ''} onChange={(e) => patch({notes: e.target.value})} />}
            </Field>
          </Card>
        </div>

        {/* ---------------------------------------------------- totals */}
        <aside className="sticky top-20 max-lg:static">
          <Card className="p-5">
            <h2 className="mb-3 text-[16px] font-semibold">Totals</h2>
            <dl className="space-y-2 text-[14px]">
              <Row label={`Items (${t.itemCount})`} value={formatRand(t.itemsSubtotal)} />
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Discount</dt>
                <dd className="flex items-center gap-2">
                  <PctInput value={job.discountPct} onChange={(v) => patch({discountPct: v})} label="Overall discount" />
                  <span className="tabular w-24 text-right">{t.discount ? `−${formatRand(t.discount)}` : '—'}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Delivery & collection</dt>
                <dd>
                  <PriceInput cents={job.deliveryFee} onChange={(c) => patch({deliveryFee: c})} label="Delivery fee" />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Setup & strike</dt>
                <dd>
                  <PriceInput cents={job.setupFee} onChange={(c) => patch({setupFee: c})} label="Setup fee" />
                </dd>
              </div>
              {settings.vatRegistered && <Row label="VAT 15%" value={formatRand(t.vat)} />}
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="tabular text-[22px] font-semibold">{formatRand(t.total)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-sunken px-3 py-2">
                <dt>
                  <span className="font-medium">Refundable deposit</span>
                  <span className="block text-[12px] text-muted">{depositEdited ? 'Set by you' : `${settings.depositPct}% · min ${formatRand(settings.depositMin, {decimals: false})}`}</span>
                </dt>
                <dd>
                  <PriceInput
                    cents={deposit}
                    onChange={(c) => {
                      setDepositEdited(true);
                      patch({depositDue: c});
                    }}
                    label="Deposit"
                  />
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12.5px] text-muted">Valid until {formatDate(job.validUntil)}. Prices are guaranteed once the deposit is paid.</p>
            <div className="mt-4 grid gap-2 max-lg:hidden">
              <Button variant="primary" size="lg" icon={PaperPlaneTiltIcon} onClick={() => validate() && setSending(true)}>
                {confirmed ? 'Save changes' : 'Send quote'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button icon={FloppyDiskIcon} onClick={save}>
                  Save draft
                </Button>
                <Button icon={EyeIcon} onClick={preview}>
                  Preview PDF
                </Button>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {/* phone: sticky total + send */}
      <div className="no-print pb-safe fixed inset-x-0 bottom-16 z-30 flex items-center gap-3 border-t border-line bg-surface px-4 py-2.5 lg:hidden">
        <div className="flex-1">
          <p className="text-[12px] text-muted">Total</p>
          <p className="tabular text-[18px] leading-tight font-semibold">{formatRand(t.total)}</p>
        </div>
        <IconButton icon={EyeIcon} label="Preview PDF" className="border border-control/60" onClick={preview} />
        <IconButton icon={FloppyDiskIcon} label="Save draft" className="border border-control/60" onClick={save} />
        <Button variant="primary" icon={PaperPlaneTiltIcon} onClick={() => validate() && setSending(true)}>
          {confirmed ? 'Save' : 'Send'}
        </Button>
      </div>

      <SendDialog
        open={sending}
        onClose={() => setSending(false)}
        confirmed={confirmed}
        clientName={client?.name ?? ''}
        phone={client?.phone ?? ''}
        email={client?.email ?? ''}
        total={t.total}
        deposit={deposit}
        onSend={(channel) => {
          if (confirmed) {
            const s = persist('Order changed after confirmation — availability re-checked, invoice updated');
            toast(`${s.invoiceNo ?? s.quoteNo} updated`);
            navigate(`/jobs/${s.id}`);
            return;
          }
          const s = persist(`Quote sent by ${channel} to ${client?.name}`, {status: 'quote_sent'});
          toast(`${s.quoteNo} sent by ${channel} (demo — nothing was really sent)`);
          navigate(`/jobs/${s.id}`);
        }}
      />

      <BrowseDialog open={browse} onClose={() => setBrowse(false)} items={items} job={job} jobs={jobs} onAdd={addItem} />

      <Dialog open={newClient} onClose={() => setNewClient(false)} title="New client">
        <ClientForm
          defaultBranch={job.branch}
          onSaved={(c) => {
            setNewClient(false);
            patch({clientId: c.id});
            toast(`${clientLabel(c)} added`);
          }}
          onCancel={() => setNewClient(false)}
        />
      </Dialog>
    </div>
  );
}

const Row = ({label, value}: {label: string; value: string}) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-muted">{label}</dt>
    <dd className="tabular">{value}</dd>
  </div>
);

function PriceInput({cents, onChange, label}: {cents: number; onChange: (c: number) => void; label: string}) {
  const [text, setText] = useState((cents / 100).toFixed(2).replace('.', ','));
  useEffect(() => {
    setText((cents / 100).toFixed(2).replace('.', ','));
  }, [cents]);
  return (
    <span className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-control/50 bg-surface pl-2 focus-within:border-primary max-md:h-11">
      <span className="text-[13px] text-muted">R</span>
      <input
        aria-label={label}
        inputMode="decimal"
        className="tabular h-full w-20 bg-transparent px-1.5 text-right outline-none"
        value={text}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = parseFloat(text.replace(/\s/g, '').replace(',', '.'));
          const c = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : cents;
          onChange(c);
          setText((c / 100).toFixed(2).replace('.', ','));
        }}
      />
    </span>
  );
}

function PctInput({value, onChange, label}: {value: number; onChange: (v: number) => void; label: string}) {
  return (
    <span className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-control/50 bg-surface pr-2 focus-within:border-primary max-md:h-11">
      <input
        aria-label={label}
        inputMode="numeric"
        className="tabular h-full w-10 bg-transparent px-1.5 text-right outline-none"
        value={value || ''}
        placeholder="0"
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(Math.min(100, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))}
      />
      <span className="text-[13px] text-muted">%</span>
    </span>
  );
}

/** Type-ahead: code or name; "50 TAB04" or "TAB04 50" adds 50 at once. */
function ItemSearch({items, job, jobs, onAdd}: {items: Item[]; job: Job; jobs: Job[]; onAdd: (i: Item, qty?: number) => void}) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    const m = q.trim().match(/^(\d+)\s*[x×]?\s+(.+)$/i) ?? q.trim().match(/^(.+?)\s+[x×]?\s*(\d+)$/i);
    if (!m) return {term: q.trim(), qty: 1};
    return /^\d+$/.test(m[1]) ? {term: m[2], qty: parseInt(m[1], 10)} : {term: m[1], qty: parseInt(m[2], 10)};
  }, [q]);

  const results = useMemo(() => {
    const t = parsed.term.toLowerCase();
    if (!t) return [];
    const scored = items
      .map((i) => {
        const code = i.code.toLowerCase();
        const name = i.name.toLowerCase();
        const score = code === t ? 0 : code.startsWith(t) ? 1 : name.startsWith(t) ? 2 : name.includes(t) || i.category.toLowerCase().includes(t) ? 3 : 9;
        return {i, score};
      })
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score || a.i.code.localeCompare(b.i.code));
    return scored.slice(0, 8).map((x) => x.i);
  }, [items, parsed.term]);

  const choose = (i: Item) => {
    onAdd(i, parsed.qty);
    setQ('');
    setActive(0);
    input.current?.focus();
  };

  return (
    <div className="relative">
      <label htmlFor="add-item" className="sr-only">
        Add item
      </label>
      <div className="flex items-center gap-2">
        <MagnifyingGlassIcon size={18} className="absolute left-3 text-muted" aria-hidden />
        <input
          id="add-item"
          ref={input}
          value={q}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="add-item-list"
          aria-activedescendant={results[active] ? `opt-${results[active].id}` : undefined}
          onChange={(e) => (setQ(e.target.value), setOpen(true), setActive(0))}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, results.length - 1)));
            if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
            if (e.key === 'Enter' && results[active]) (e.preventDefault(), choose(results[active]));
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Add item — type a code or name (e.g. CHA10, 50 napkin white)"
          className={cx(inputClass, 'pl-9')}
        />
        <span className="shrink-0 text-[13px] text-muted max-md:hidden">
          <kbd className="rounded border border-line bg-surface px-1.5 font-semibold">Enter</kbd> adds
        </span>
      </div>
      {open && results.length > 0 && (
        <ul id="add-item-list" role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface p-1 shadow-[var(--shadow-raise)]">
          {results.map((i, k) => {
            const c = checkLine(i, parsed.qty, job.branch, job.outDate, job.backDate, jobs, {excludeJobId: job.id});
            return (
              <li key={i.id} id={`opt-${i.id}`} role="option" aria-selected={k === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  onMouseEnter={() => setActive(k)}
                  className={cx('flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left', k === active && 'bg-mist/70')}
                >
                  <span className="code w-16 shrink-0 text-[13px] text-primary-deep">{i.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.name}</span>
                    <span className="block text-[12.5px] text-muted">
                      {collectionLabel(i.collection)} · {i.category}
                      {i.size ? ` · ${i.size}` : ''} · {formatRand(i.price)}
                    </span>
                  </span>
                  <span className="shrink-0 max-md:hidden">
                    <AvailabilityPill check={c} otherBranch={job.branch === 'pta' ? 'kdp' : 'pta'} />
                  </span>
                  {parsed.qty > 1 && <span className="tabular shrink-0 text-[13px] font-semibold">× {parsed.qty}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BrowseDialog({open, onClose, items, job, jobs, onAdd}: {open: boolean; onClose: () => void; items: Item[]; job: Job; jobs: Job[]; onAdd: (i: Item, qty?: number) => void}) {
  const [tab, setTab] = useState<CollectionId>('furniture');
  const [qty, setQty] = useState<Record<string, number>>({});
  const list = items.filter((i) => i.collection === tab);
  const chosen = Object.entries(qty).filter(([, n]) => n > 0);
  const cover = COLLECTIONS.find((c) => c.id === tab)!.cover;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title="Browse the catalogue"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={PlusIcon}
            disabled={chosen.length === 0}
            onClick={() => {
              for (const [id, n] of chosen) onAdd(items.find((i) => i.id === id)!, n);
              toast(`${chosen.length} ${chosen.length === 1 ? 'item' : 'items'} added`);
              setQty({});
              onClose();
            }}
          >
            Add {chosen.length || ''} to quote
          </Button>
        </>
      }
    >
      <div role="tablist" aria-label="Collections" className="mb-3 flex gap-1 overflow-x-auto">
        {COLLECTIONS.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={tab === c.id}
            onClick={() => setTab(c.id)}
            className={cx('h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold', tab === c.id ? 'bg-primary-deep text-white' : 'bg-sunken text-muted hover:text-ink')}
          >
            {c.label}
          </button>
        ))}
      </div>
      <img src={cover} alt="" className="mb-3 h-24 w-full rounded-[var(--radius-card)] object-cover" />
      <ul className="divide-y divide-line">
        {list.map((i) => {
          const c = checkLine(i, Math.max(1, qty[i.id] ?? 0), job.branch, job.outDate, job.backDate, jobs, {excludeJobId: job.id});
          return (
            <li key={i.id} className="flex items-center gap-3 py-2.5 max-md:flex-wrap">
              <span className="code w-16 shrink-0 text-[13px] text-primary-deep">{i.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{i.name}</span>
                <span className="block text-[12.5px] text-muted">
                  {i.category}
                  {i.size ? ` · ${i.size}` : ''} · {formatRand(i.price)} · <span className="tabular">{c.free}</span> free
                </span>
              </span>
              <QtyStepper value={qty[i.id] ?? 0} onChange={(n) => setQty((q) => ({...q, [i.id]: n}))} label={i.name} />
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

function SendDialog({
  open,
  onClose,
  onSend,
  confirmed,
  clientName,
  phone,
  email,
  total,
  deposit,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (channel: 'WhatsApp' | 'email') => void;
  confirmed: boolean;
  clientName: string;
  phone: string;
  email: string;
  total: number;
  deposit: number;
}) {
  const [channel, setChannel] = useState<'WhatsApp' | 'email'>('WhatsApp');
  if (confirmed)
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title="Save changes to this order?"
        footer={
          <>
            <Button onClick={onClose}>Keep editing</Button>
            <Button variant="primary" onClick={() => (onClose(), onSend('email'))}>
              Save changes
            </Button>
          </>
        }
      >
        <p>The invoice total becomes {formatRand(total)}. The old version is kept in the history.</p>
      </Dialog>
    );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Send quote to ${clientName.split(' ')[0]}?`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={PaperPlaneTiltIcon} onClick={() => (onClose(), onSend(channel))}>
            Send by {channel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          label="Send by"
          value={channel}
          onChange={setChannel}
          options={[
            {value: 'WhatsApp', label: 'WhatsApp'},
            {value: 'email', label: 'Email'},
          ]}
        />
        <div className="rounded-[var(--radius-card)] bg-sunken p-4 text-[14px]">
          <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-muted">
            {channel === 'WhatsApp' ? <ChatCircleTextIcon size={16} aria-hidden /> : <EnvelopeSimpleIcon size={16} aria-hidden />}
            To {clientName} · {channel === 'WhatsApp' ? phone : email}
          </p>
          <p>
            Hi {clientName.split(' ')[0]}, here is your quote from Eastco Decor Hire: total <strong>{formatRand(total)}</strong>, refundable deposit {formatRand(deposit)}. You can view
            and accept it here: <span className="text-primary underline">[private quote link]</span>
          </p>
        </div>
        <p className="text-[13px] text-muted">The link is private, expires in 30 days and lets the client accept and sign online.</p>
      </div>
    </Dialog>
  );
}
