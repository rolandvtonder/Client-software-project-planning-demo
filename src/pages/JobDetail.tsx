import {
  ArrowLeftIcon,
  ArrowsLeftRightIcon,
  CheckIcon,
  ClipboardTextIcon,
  CopyIcon,
  DeviceMobileIcon,
  FileTextIcon,
  HandCoinsIcon,
  PackageIcon,
  PencilSimpleIcon,
  ReceiptIcon,
  SealCheckIcon,
  TruckIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import {useState, type ReactNode} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {Button, Card, CardHeader, Chip, Dialog, EmptyState, Field, inputClass, LinkButton, Money, Segmented, StatusChip, toast} from '../components/ui';
import {checkLine} from '../domain/availability';
import {addDays, formatDate, formatDateTime, relative, today} from '../domain/dates';
import {isQuote, STEPS, stepIndex} from '../domain/lifecycle';
import {formatRand, pct} from '../domain/money';
import {balance, depositRefund, lineTotal, totals} from '../domain/totals';
import type {Job, PaymentMethod} from '../domain/types';
import {BRANCHES, clientLabel} from '../data/selectors';
import {actions, getState, newId, useStore} from '../data/store';
import {cx} from '../lib/cx';

export function JobDetail() {
  const {id} = useParams();
  const job = useStore((s) => s.jobs.find((j) => j.id === id), [id]);
  const {items, jobs, settings, clients} = useStore((s) => ({items: s.items, jobs: s.jobs, settings: s.settings, clients: s.clients}));
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<null | 'deposit' | 'payment' | 'settle' | 'cancel'>(null);

  if (!job)
    return (
      <EmptyState icon={ClipboardTextIcon} title="Order not found" action={<LinkButton to="/jobs">All orders</LinkButton>}>
        It may have been reset with the demo data.
      </EmptyState>
    );

  const client = clients.find((c) => c.id === job.clientId);
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const t = totals(job, settings);
  const b = balance(job, settings);
  const step = stepIndex(job.status);
  const quote = isQuote(job.status);
  const shortLines = job.lines.filter((l) => checkLine(itemsById.get(l.itemId)!, l.qty, l.source ?? job.branch, job.outDate, job.backDate, jobs, {excludeJobId: job.id}).tone === 'short');

  const next: {label: string; icon: typeof CheckIcon; run: () => void; help: string} | null = (() => {
    switch (job.status) {
      case 'draft':
        return {label: 'Finish & send quote', icon: FileTextIcon, run: () => navigate(`/jobs/${job.id}/edit`), help: 'This quote hasn’t been sent yet.'};
      case 'quote_sent':
        return {
          label: 'Client accepted',
          icon: SealCheckIcon,
          help: 'In the live system the client accepts and signs on their quote link. Here you can mark it for them.',
          run: () => {
            actions.updateJob(job.id, {status: 'accepted', holdUntil: new Date(Date.now() + settings.softHoldHours * 3600_000).toISOString()}, `Quote accepted — stock on hold for ${settings.softHoldHours} hours`);
            toast(`Accepted. Stock is held for ${settings.softHoldHours} hours while the deposit is paid.`);
          },
        };
      case 'accepted':
        return {label: 'Record deposit', icon: HandCoinsIcon, run: () => setDialog('deposit'), help: `Deposit of ${formatRand(job.depositDue)} confirms the booking and locks the prices.`};
      case 'confirmed':
        return {
          label: 'Print picking list',
          icon: ClipboardTextIcon,
          help: `Goes out ${relative(job.outDate)}. The warehouse packs from the picking list (no prices on it).`,
          run: () => {
            actions.updateJob(job.id, {status: 'packing'}, 'Picking list printed — packing started');
            navigate(`/doc/picking/${job.id}`);
          },
        };
      case 'packing':
        return {
          label: job.fulfilment === 'delivery' ? 'Start delivery' : 'Client is here — hand over',
          icon: TruckIcon,
          help: job.fulfilment === 'delivery' ? `Opens the driver’s phone screen: count with the client, then they sign.` : 'Count the items with the client at the counter; they sign on the tablet.',
          run: () => navigate(`/driver/${job.id}`),
        };
      case 'out_for_delivery':
        return {label: 'Continue delivery', icon: TruckIcon, run: () => navigate(`/driver/${job.id}`), help: 'The driver is on the way.'};
      case 'on_hire':
        return {
          label: job.fulfilment === 'delivery' ? 'Start collection check' : 'Client returned — check items',
          icon: PackageIcon,
          help: `Due back ${relative(job.backDate)}. Count every line: OK, short, damaged or dirty.`,
          run: () => navigate(`/driver/${job.id}?mode=return`),
        };
      case 'returned':
      case 'issues':
        return {label: job.status === 'issues' ? 'Approve charges & refund deposit' : 'Refund deposit & close', icon: HandCoinsIcon, run: () => setDialog('settle'), help: job.status === 'issues' ? 'The return check found problems. Approve the charges you want to take off the deposit.' : 'Everything came back fine.'};
      case 'closed':
        return b.hireDue > 0 ? {label: 'Record payment', icon: HandCoinsIcon, run: () => setDialog('payment'), help: `${formatRand(b.hireDue)} is still owing on ${job.invoiceNo}.`} : null;
      default:
        return null;
    }
  })();

  const duplicate = () => {
    const s = getState();
    const copy: Job = {
      ...job,
      id: newId('j'),
      quoteNo: actions.nextNumber('Q'),
      invoiceNo: undefined,
      status: 'draft',
      eventDate: addDays(today(), 14),
      outDate: addDays(today(), 13),
      backDate: addDays(today(), 15),
      createdAt: today(),
      validUntil: addDays(today(), s.settings.quoteValidDays),
      payments: [],
      charges: [],
      deliveryNote: undefined,
      returnNote: undefined,
      holdUntil: undefined,
      history: [],
      lines: job.lines.map((l) => ({...l, source: undefined})),
    };
    actions.saveJob(copy, `Copied from ${job.quoteNo}`);
    toast(`Copied to new draft ${copy.quoteNo} — check the dates`);
    navigate(`/jobs/${copy.id}/edit`);
  };

  return (
    <>
      <div className="mb-5">
        <Link to={quote ? '/quotes' : '/jobs'} className="mb-2 inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
          <ArrowLeftIcon size={16} aria-hidden /> {quote ? 'Quotes' : 'Orders'}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[14px] text-muted">
              <span className="code text-primary-deep">{job.invoiceNo ?? job.quoteNo}</span>
              {job.invoiceNo && <span>· quote {job.quoteNo}</span>}
              <StatusChip status={job.status} />
            </p>
            <h1 className="mt-1 font-display text-[32px] leading-tight font-semibold text-primary-ink max-md:text-[26px]">{job.eventName}</h1>
            <p className="text-[14px] text-muted">
              <Link to={`/clients/${job.clientId}`} className="font-semibold text-ink hover:underline">
                {clientLabel(client)}
              </Link>{' '}
              · {job.eventType} · {formatDate(job.eventDate)} ({relative(job.eventDate)}) · {BRANCHES[job.branch].name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.status !== 'closed' && job.status !== 'cancelled' && !['on_hire', 'returned', 'issues'].includes(job.status) && (
              <LinkButton to={`/jobs/${job.id}/edit`} icon={PencilSimpleIcon}>
                Edit
              </LinkButton>
            )}
            <Button icon={CopyIcon} onClick={duplicate}>
              Duplicate
            </Button>
            {!['closed', 'cancelled', 'on_hire', 'returned', 'issues', 'out_for_delivery'].includes(job.status) && (
              <Button variant="ghost" icon={XCircleIcon} onClick={() => setDialog('cancel')}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ progress + next step */}
      {job.status !== 'cancelled' && (
        <Card className="mb-6 p-5 max-md:p-4">
          <ol className="mb-4 grid grid-cols-7 gap-1" aria-label="Progress">
            {STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={label} className="min-w-0" aria-current={current ? 'step' : undefined}>
                  <div className={cx('h-1.5 rounded-full', done ? 'bg-primary' : current ? 'bg-gold' : 'bg-line')} />
                  <p className={cx('mt-1.5 flex items-center gap-1 truncate text-[12.5px] max-md:text-[11px]', current ? 'font-semibold text-ink' : done ? 'text-primary-deep' : 'text-muted')}>
                    {done && <CheckIcon size={12} weight="bold" aria-hidden className="max-md:hidden" />}
                    <span className="truncate">{label}</span>
                  </p>
                </li>
              );
            })}
          </ol>
          {next ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-sunken px-4 py-3">
              <p className="text-[14px]">
                <span className="font-semibold">Next step:</span> {next.help}
              </p>
              <div className="flex flex-wrap items-center gap-2 max-md:w-full">
                {job.status === 'quote_sent' && (
                  <LinkButton to={`/q/${job.id}`} size="lg" icon={DeviceMobileIcon} className="max-md:w-full">
                    Open client’s view
                  </LinkButton>
                )}
                <Button variant="primary" size="lg" icon={next.icon} onClick={next.run} className="max-md:w-full">
                  {next.label}
                </Button>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-[var(--radius-card)] bg-ok-tint px-4 py-3 text-[14px] text-ok">
              <SealCheckIcon size={20} weight="fill" aria-hidden /> All done — paid, returned and closed.
            </p>
          )}
          {job.status === 'accepted' && job.holdUntil && (
            <p className="mt-2 text-[13px] text-muted">
              {new Date(job.holdUntil).getTime() > Date.now() ? `Stock on hold until ${formatDateTime(job.holdUntil)}.` : 'The stock hold has run out — other clients can now book these items.'}
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-[1fr_380px] items-start gap-6 max-xl:grid-cols-1">
        <div className="min-w-0 space-y-6">
          {/* ------------------------------------------------ items */}
          <Card>
            <CardHeader title={`Items (${t.itemCount})`} sub={shortLines.length && quote ? `${shortLines.length} lines are short for these dates` : undefined} />
            <table className="w-full text-[14px]">
              <thead className="bg-sunken/60 text-left text-[12px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-2 pl-5 font-semibold max-md:pl-4">Item</th>
                  <th className="py-2 text-right font-semibold">Qty</th>
                  {job.deliveryNote && <th className="py-2 text-right font-semibold max-md:hidden">Delivered</th>}
                  {job.returnNote && <th className="py-2 pl-4 font-semibold max-md:hidden">Returned</th>}
                  <th className="py-2 pr-5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {job.lines.map((l) => {
                  const item = itemsById.get(l.itemId)!;
                  const r = job.returnNote?.lines[l.itemId];
                  const delivered = job.deliveryNote?.counts[l.itemId];
                  return (
                    <tr key={l.itemId + (l.source ?? '')}>
                      <td className="py-2.5 pl-5 max-md:pl-4">
                        <span className="code mr-2 text-[13px] text-primary-deep">{item.code}</span>
                        {item.name}
                        {l.source && (
                          <span className="ml-2 inline-flex">
                            <Chip tone="info" icon={ArrowsLeftRightIcon}>
                              From {BRANCHES[l.source].short}
                            </Chip>
                          </span>
                        )}
                        {shortLines.includes(l) && quote && (
                          <span className="ml-2 inline-flex">
                            <Chip tone="bad">Short</Chip>
                          </span>
                        )}
                      </td>
                      <td className="tabular py-2.5 text-right font-semibold">{l.qty}</td>
                      {job.deliveryNote && (
                        <td className={cx('tabular py-2.5 text-right max-md:hidden', delivered !== l.qty && 'font-semibold text-warn')}>{delivered ?? l.qty}</td>
                      )}
                      {job.returnNote && (
                        <td className="py-2.5 pl-4 max-md:hidden">
                          {!r || r.state === 'ok' ? (
                            <Chip tone="ok">OK</Chip>
                          ) : (
                            <Chip tone={r.state === 'dirty' ? 'warn' : 'bad'}>
                              {r.qty} {r.state}
                            </Chip>
                          )}
                        </td>
                      )}
                      <td className="tabular py-2.5 pr-5 text-right">{formatRand(lineTotal(l))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {job.notes && <p className="border-t border-line px-5 py-3 text-[14px] text-muted">Notes: {job.notes}</p>}
          </Card>

          {/* ------------------------------------------------ documents */}
          <Card>
            <CardHeader title="Documents" sub="Open, print, or save as PDF" />
            <div className="grid grid-cols-3 gap-3 p-5 max-md:grid-cols-2 max-md:p-4">
              <DocLink to={`/doc/quote/${job.id}`} icon={FileTextIcon} label="Quote" sub={job.quoteNo} />
              <DocLink to={`/q/${job.id}`} icon={DeviceMobileIcon} label="Client’s quote page" sub={job.acceptance ? `Signed by ${job.acceptance.signedBy}` : 'What the client sees'} disabled={job.status === 'draft'} />
              <DocLink to={`/doc/invoice/${job.id}`} icon={ReceiptIcon} label={settings.vatRegistered ? 'Tax invoice' : 'Invoice'} sub={job.invoiceNo ?? 'Issued on deposit'} disabled={!job.invoiceNo} />
              <DocLink to={`/doc/picking/${job.id}`} icon={ClipboardTextIcon} label="Picking list" sub="No prices" disabled={quote} />
              <DocLink to={`/doc/delivery/${job.id}`} icon={TruckIcon} label="Delivery note" sub={job.deliveryNote ? `${job.deliveryNote.number} · signed` : 'Not signed yet'} disabled={quote} />
              <DocLink to={`/doc/return/${job.id}`} icon={PackageIcon} label="Return note" sub={job.returnNote?.number ?? 'After collection'} disabled={!job.returnNote} />
            </div>
          </Card>

          {/* ------------------------------------------------ history */}
          <Card>
            <CardHeader title="History" sub="Who did what, and when. Nobody can edit this." />
            <ol className="relative space-y-4 px-5 py-4 before:absolute before:top-5 before:bottom-5 before:left-[27px] before:w-px before:bg-line">
              {[...job.history].reverse().map((h, i) => (
                <li key={i} className="relative flex gap-4 pl-6">
                  <span className="absolute top-1.5 left-0 size-2.5 rounded-full bg-primary ring-4 ring-surface" aria-hidden />
                  <div>
                    <p className="text-[14px]">{h.text}</p>
                    <p className="text-[12.5px] text-muted">
                      {formatDateTime(h.at)} · {h.by}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-[16px] font-semibold">Event & delivery</h2>
            <dl className="space-y-2 text-[14px]">
              <Def label="Event">{formatDate(job.eventDate)}</Def>
              <Def label={job.fulfilment === 'delivery' ? 'Delivery' : 'Client collects'}>
                {formatDate(job.outDate)}
                {job.fulfilment === 'delivery' && job.deliveryWindow ? `, ${job.deliveryWindow}` : ''}
              </Def>
              <Def label={job.fulfilment === 'delivery' ? 'Collection' : 'Client returns'}>{formatDate(job.backDate)}</Def>
              <Def label="Venue">{job.venue || '—'}</Def>
              {job.driver && <Def label="Driver">{job.driver}</Def>}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-[16px] font-semibold">Money</h2>
            <dl className="space-y-2 text-[14px]">
              <Def label="Items">{formatRand(t.itemsSubtotal)}</Def>
              {t.discount > 0 && <Def label={`Discount ${job.discountPct}%`}>−{formatRand(t.discount)}</Def>}
              {t.delivery > 0 && <Def label="Delivery & collection">{formatRand(t.delivery)}</Def>}
              {t.setup > 0 && <Def label="Setup & strike">{formatRand(t.setup)}</Def>}
              {settings.vatRegistered && <Def label="VAT 15%">{formatRand(t.vat)}</Def>}
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt>Hire total</dt>
                <dd className="tabular">{formatRand(t.total)}</dd>
              </div>
              <Def label="Paid">{formatRand(b.hirePaid)}</Def>
              <div className={cx('flex justify-between font-semibold', b.hireDue > 0 && !quote && 'text-bad')}>
                <dt>Balance due</dt>
                <dd className="tabular">{formatRand(b.hireDue)}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-[var(--radius-control)] bg-sunken p-3 text-[14px]">
              <div className="flex justify-between">
                <span>Refundable deposit</span>
                <Money cents={job.depositDue} className="font-semibold" />
              </div>
              <p className="mt-0.5 text-[13px] text-muted">
                {b.depositPaid ? `Paid ${formatRand(b.depositPaid)} by ${b.depositMethod}${b.refunded ? ` · refunded ${formatRand(b.refunded)}` : ' · held'}` : 'Not paid yet'}
              </p>
            </div>
            {!quote && b.hireDue > 0 && job.status !== 'closed' && (
              <Button className="mt-3 w-full" icon={HandCoinsIcon} onClick={() => setDialog('payment')}>
                Record payment
              </Button>
            )}
          </Card>

          {job.charges.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-[16px] font-semibold">Damage & loss charges</h2>
              <ul className="space-y-2 text-[14px]">
                {job.charges.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3">
                    <span>{c.label}</span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Money cents={c.amount} />
                      <Chip tone={c.approved ? 'ok' : 'warn'}>{c.approved ? 'Approved' : 'To approve'}</Chip>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <DepositDialog open={dialog === 'deposit'} onClose={() => setDialog(null)} job={job} blocked={shortLines.length > 0} />
      <PaymentDialog open={dialog === 'payment'} onClose={() => setDialog(null)} job={job} due={b.hireDue} />
      <SettleDialog open={dialog === 'settle'} onClose={() => setDialog(null)} job={job} />
      <CancelDialog open={dialog === 'cancel'} onClose={() => setDialog(null)} job={job} />
    </>
  );
}

const Def = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="flex justify-between gap-4">
    <dt className="shrink-0 text-muted">{label}</dt>
    <dd className="tabular text-right">{children}</dd>
  </div>
);

function DocLink({to, icon: I, label, sub, disabled}: {to: string; icon: typeof FileTextIcon; label: string; sub: string; disabled?: boolean}) {
  if (disabled)
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line p-3 text-muted" aria-disabled>
        <I size={24} aria-hidden />
        <span>
          <span className="block text-[14px] font-semibold">{label}</span>
          <span className="block text-[12.5px]">{sub}</span>
        </span>
      </div>
    );
  return (
    <Link to={to} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line p-3 hover:border-control/60 hover:bg-sunken/50">
      <I size={24} className="text-primary" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold">{label}</span>
        <span className="block truncate text-[12.5px] text-muted">{sub}</span>
      </span>
    </Link>
  );
}

function DepositDialog({open, onClose, job, blocked}: {open: boolean; onClose: () => void; job: Job; blocked: boolean}) {
  const [method, setMethod] = useState<PaymentMethod>('EFT');
  const [amount, setAmount] = useState((job.depositDue / 100).toFixed(2).replace('.', ','));
  const settings = useStore((s) => s.settings);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record deposit"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={blocked}
            onClick={() => {
              const cents = Math.round(parseFloat(amount.replace(/\s/g, '').replace(',', '.')) * 100) || job.depositDue;
              const invoiceNo = job.invoiceNo ?? actions.nextNumber('INV');
              actions.updateJob(
                job.id,
                (j) => ({status: 'confirmed', invoiceNo, holdUntil: undefined, payments: [...j.payments, {id: newId('p'), at: today(), amount: cents, method, kind: 'deposit'}]}),
                `Deposit of ${formatRand(cents)} received (${method}) — booking confirmed, invoice ${invoiceNo} issued`,
              );
              onClose();
              toast(`Booking confirmed. Invoice ${invoiceNo} issued.`);
            }}
          >
            Confirm booking
          </Button>
        </>
      }
    >
      {blocked ? (
        <p className="rounded-[var(--radius-control)] bg-bad-tint p-3 text-[14px] text-bad">
          Some items are short for these dates. Edit the order and borrow stock from the other branch (or lower the quantities) before confirming.
        </p>
      ) : (
        <div className="space-y-4">
          <Field label="Amount received" helper={`Suggested: ${formatRand(job.depositDue)}`}>
            {(p) => <input {...p} inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />}
          </Field>
          <Field label="Paid by">
            {() => (
              <Segmented
                label="Paid by"
                value={method}
                onChange={setMethod}
                options={[
                  {value: 'EFT', label: 'EFT'},
                  {value: 'Cash', label: 'Cash'},
                  {value: 'Card', label: 'Card'},
                ]}
              />
            )}
          </Field>
          {method === 'EFT' && <p className="text-[13px] text-muted">Per the hire terms, a {settings.bankFeePct}% banking fee comes off EFT deposits when they are refunded.</p>}
          <p className="text-[14px]">This confirms the booking, reserves the stock, locks the prices and issues the invoice.</p>
        </div>
      )}
    </Dialog>
  );
}

function PaymentDialog({open, onClose, job, due}: {open: boolean; onClose: () => void; job: Job; due: number}) {
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [amount, setAmount] = useState('');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record payment"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const cents = Math.round(parseFloat((amount || (due / 100).toString()).replace(/\s/g, '').replace(',', '.')) * 100);
              if (!cents) return;
              actions.updateJob(job.id, (j) => ({payments: [...j.payments, {id: newId('p'), at: today(), amount: cents, method, kind: 'hire'}]}), `Payment of ${formatRand(cents)} received (${method})`);
              onClose();
              toast(`${formatRand(cents)} recorded`);
            }}
          >
            Save payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Amount" helper={`Balance due: ${formatRand(due)}`}>
          {(p) => <input {...p} inputMode="decimal" className={inputClass} placeholder={(due / 100).toFixed(2).replace('.', ',')} value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
        <Segmented
          label="Paid by"
          value={method}
          onChange={setMethod}
          options={[
            {value: 'Cash', label: 'Cash'},
            {value: 'EFT', label: 'EFT'},
            {value: 'Card', label: 'Card'},
          ]}
        />
      </div>
    </Dialog>
  );
}

function SettleDialog({open, onClose, job}: {open: boolean; onClose: () => void; job: Job}) {
  const settings = useStore((s) => s.settings);
  const [approved, setApproved] = useState<Record<string, boolean>>(() => Object.fromEntries(job.charges.map((c) => [c.id, true])));
  const charges = job.charges.map((c) => ({...c, approved: approved[c.id] ?? false}));
  const r = depositRefund(job, settings, charges);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settle deposit"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const b = balance(job, settings);
              actions.updateJob(
                job.id,
                (j) => ({
                  status: 'closed',
                  charges,
                  payments: [
                    ...j.payments,
                    ...(r.refund ? [{id: newId('p'), at: today(), amount: r.refund, method: b.depositMethod ?? 'EFT', kind: 'refund' as const}] : []),
                    ...(r.charges ? [{id: newId('p'), at: today(), amount: r.charges, method: b.depositMethod ?? 'EFT', kind: 'charge' as const}] : []),
                  ],
                }),
                `Deposit settled: ${formatRand(r.charges)} charges, ${formatRand(r.bankFee)} bank fee, ${formatRand(r.refund)} refunded — job closed`,
              );
              onClose();
              toast(r.clientOwes ? `Closed. Client still owes ${formatRand(r.clientOwes)}.` : `Refund of ${formatRand(r.refund)} recorded. Job closed.`);
            }}
          >
            {r.refund ? `Refund ${formatRand(r.refund)} & close` : 'Close job'}
          </Button>
        </>
      }
    >
      {job.charges.length > 0 && (
        <fieldset className="mb-4">
          <legend className="mb-2 text-[14px] font-semibold">Charges from the return check</legend>
          <ul className="space-y-2">
            {job.charges.map((c) => (
              <li key={c.id}>
                <label className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line p-3 text-[14px]">
                  <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-primary)]" checked={approved[c.id] ?? false} onChange={(e) => setApproved({...approved, [c.id]: e.target.checked})} />
                  <span className="flex-1">{c.label}</span>
                  <Money cents={c.amount} className="font-semibold" />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <dl className="space-y-1.5 rounded-[var(--radius-card)] bg-sunken p-4 text-[14px]">
        <Def label="Deposit paid">{formatRand(r.deposit)}</Def>
        <Def label="Approved charges">−{formatRand(r.charges)}</Def>
        <Def label={`Bank fee (${settings.bankFeePct}% — EFT only)`}>−{formatRand(r.bankFee)}</Def>
        <div className="flex justify-between border-t border-line pt-2 text-[16px] font-semibold">
          <dt>{r.clientOwes ? 'Client owes' : 'Refund to client'}</dt>
          <dd className={cx('tabular', r.clientOwes > 0 && 'text-bad')}>{formatRand(r.clientOwes || r.refund)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[13px] text-muted">A deposit statement is sent to the client with the breakdown.</p>
    </Dialog>
  );
}

function CancelDialog({open, onClose, job}: {open: boolean; onClose: () => void; job: Job}) {
  const settings = useStore((s) => s.settings);
  const b = balance(job, settings);
  const fee = b.depositPaid ? pct(b.depositPaid + b.hirePaid, settings.cancellationPct) : 0;
  const navigate = useNavigate();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Cancel ${job.invoiceNo ?? job.quoteNo}?`}
      footer={
        <>
          <Button onClick={onClose}>Keep it</Button>
          <Button
            variant="danger"
            onClick={() => {
              actions.updateJob(job.id, {status: 'cancelled'}, fee ? `Cancelled in writing — ${settings.cancellationPct}% cancellation fee ${formatRand(fee)}` : 'Cancelled');
              onClose();
              toast('Cancelled — the stock is free again');
              navigate('/jobs');
            }}
          >
            Cancel booking
          </Button>
        </>
      }
    >
      <p className="text-[14px]">The stock is released for other clients.</p>
      {fee > 0 && (
        <p className="mt-3 rounded-[var(--radius-control)] bg-warn-tint p-3 text-[14px] text-warn">
          This booking is paid, so the {settings.cancellationPct}% cancellation fee applies: <strong>{formatRand(fee)}</strong>. Cancellations must be in writing — attach the client’s message in the live system.
        </p>
      )}
    </Dialog>
  );
}
