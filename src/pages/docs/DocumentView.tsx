import {ArrowLeftIcon, ChatCircleTextIcon, PrinterIcon} from '@phosphor-icons/react';
import type {ReactNode} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {Button, toast} from '../../components/ui';
import {formatDate, formatDateTime} from '../../domain/dates';
import {formatRand} from '../../domain/money';
import {balance, lineTotal, totals} from '../../domain/totals';
import type {Item, Job, Signature} from '../../domain/types';
import {BRANCHES, clientLabel} from '../../data/selectors';
import {useStore} from '../../data/store';
import {cx} from '../../lib/cx';

type Kind = 'quote' | 'invoice' | 'picking' | 'delivery' | 'return';

const TERMS_SHORT =
  'Prices and quantities are only guaranteed once the order is accepted and the deposit is paid. Hire charges and deposits are payable in cash on delivery unless agreed otherwise; deposits paid into an account are refunded less a 10% banking fee. Late returns are charged at the daily rate. Lost or damaged items are charged at full replacement cost; unwashed items attract a cleaning fee. If items are not checked on return with Eastco’s representative, Eastco’s count is final. Cancellations must be in writing; a 10% fee applies to paid bookings. Billing disputes must be raised in writing within 3 days of the invoice date.';

export function DocumentView() {
  const {kind, id} = useParams() as {kind: Kind; id: string};
  const navigate = useNavigate();
  const job = useStore((s) => s.jobs.find((j) => j.id === id), [id]);
  const {items, clients, settings} = useStore((s) => ({items: s.items, clients: s.clients, settings: s.settings}));
  if (!job) return <p className="p-8">Document not found.</p>;
  const client = clients.find((c) => c.id === job.clientId);
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const branch = BRANCHES[job.branch];
  const t = totals(job, settings);
  const b = balance(job, settings);

  const title = {
    quote: 'Quotation',
    invoice: settings.vatRegistered ? 'Tax Invoice' : 'Invoice',
    picking: 'Picking List',
    delivery: 'Delivery Note',
    return: 'Return Note',
  }[kind];
  const number = {quote: job.quoteNo, invoice: job.invoiceNo ?? '—', picking: `PL-${(job.invoiceNo ?? job.quoteNo).slice(-9)}`, delivery: job.deliveryNote?.number ?? 'DN (unsigned)', return: job.returnNote?.number ?? '—'}[kind];
  const showPrices = kind === 'quote' || kind === 'invoice';

  return (
    <div className="print-root min-h-dvh bg-sunken px-4 py-6 max-md:px-0 max-md:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2 max-md:sticky max-md:top-0 max-md:z-10 max-md:mb-0 max-md:border-b max-md:border-line max-md:bg-surface max-md:px-4 max-md:py-2">
        <Button variant="ghost" icon={ArrowLeftIcon} onClick={() => navigate(-1)}>
          Back
        </Button>
        <span className="flex-1" />
        <Button icon={ChatCircleTextIcon} onClick={() => toast(`${title} sent by WhatsApp (demo — nothing was sent)`)}>
          Send
        </Button>
        <Button variant="primary" icon={PrinterIcon} onClick={() => window.print()}>
          Print / save PDF
        </Button>
      </div>

      <article className="doc-page mx-auto" aria-label={`${title} ${number}`}>
        {/* header */}
        <header className="flex items-start justify-between gap-6 border-b border-gold pb-4">
          <div className="flex items-center gap-3">
            <img src="brand/eastco-logo.png" alt="Eastco Decor Hire" className="size-[22mm] max-md:size-16" />
            <div className="text-[0.92em] leading-snug">
              <p className="font-semibold">Eastco CC t/a Eastco Decor Hire</p>
              <p>{branch.address}</p>
              <p>
                {branch.phone} · {branch.email}
              </p>
              {settings.vatRegistered && <p>VAT no. {settings.vatNo}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="font-display text-[24pt] leading-none font-semibold whitespace-nowrap text-primary-ink max-md:text-[26px]">{title}</h1>
            <p className="code mt-2 text-[1.05em]">{number}</p>
            <p className="mt-1 text-[0.92em] text-muted">
              {kind === 'delivery' && job.deliveryNote ? formatDate(job.deliveryNote.signature.signedAt.slice(0, 10)) : formatDate(job.createdAt)} · {branch.short}
            </p>
            {kind === 'quote' && <p className="text-[0.92em] text-muted">Valid until {formatDate(job.validUntil)}</p>}
          </div>
        </header>

        {/* parties */}
        <section className="grid grid-cols-2 gap-6 py-4 max-md:grid-cols-1 max-md:gap-3">
          <div>
            <p className="mb-1 text-[0.8em] font-semibold tracking-wider text-muted uppercase">{kind === 'invoice' || kind === 'quote' ? 'Bill to' : 'Client'}</p>
            <p className="font-semibold">{clientLabel(client)}</p>
            {client?.company && <p>Attn: {client.name}</p>}
            <p>
              {client?.phone} · {client?.email}
            </p>
            {client?.vatNo && kind === 'invoice' && <p>VAT no. {client.vatNo}</p>}
          </div>
          <div>
            <p className="mb-1 text-[0.8em] font-semibold tracking-wider text-muted uppercase">Event</p>
            <p className="font-semibold">{job.eventName}</p>
            <p>Event date: {formatDate(job.eventDate)}</p>
            <p>
              {job.fulfilment === 'delivery' ? `Delivery ${formatDate(job.outDate)}${job.deliveryWindow ? `, ${job.deliveryWindow}` : ''} · Collection ${formatDate(job.backDate)}` : `Client collects ${formatDate(job.outDate)} · returns ${formatDate(job.backDate)}`}
            </p>
            {job.venue && <p>Venue: {job.venue}</p>}
          </div>
        </section>

        {/* lines */}
        {kind === 'picking' ? <PickingTable job={job} itemsById={itemsById} /> : <LineTable job={job} itemsById={itemsById} kind={kind} showPrices={showPrices} />}

        {/* totals */}
        {showPrices && (
          <section className="mt-4 flex justify-end">
            <dl className="w-[75mm] space-y-1 max-md:w-full">
              <Tot label="Items">{formatRand(t.itemsSubtotal)}</Tot>
              {t.discount > 0 && <Tot label={`Discount ${job.discountPct}%`}>−{formatRand(t.discount)}</Tot>}
              {t.delivery > 0 && <Tot label="Delivery & collection">{formatRand(t.delivery)}</Tot>}
              {t.setup > 0 && <Tot label="Setup & strike">{formatRand(t.setup)}</Tot>}
              {settings.vatRegistered && (
                <>
                  <Tot label="Total excl. VAT">{formatRand(t.net)}</Tot>
                  <Tot label="VAT 15%">{formatRand(t.vat)}</Tot>
                </>
              )}
              <div className="flex justify-between border-t-2 border-ink pt-1.5 text-[12pt] font-semibold max-md:text-[16px]">
                <dt>Total{settings.vatRegistered ? ' incl. VAT' : ''}</dt>
                <dd className="tabular">{formatRand(t.total)}</dd>
              </div>
              {kind === 'invoice' && (
                <>
                  <Tot label="Paid">{formatRand(b.hirePaid)}</Tot>
                  <div className="flex justify-between font-semibold">
                    <dt>Balance due</dt>
                    <dd className="tabular">{formatRand(b.hireDue)}</dd>
                  </div>
                </>
              )}
              <div className="mt-2 flex justify-between rounded bg-sunken px-2 py-1.5">
                <dt>Refundable deposit</dt>
                <dd className="tabular font-semibold">{formatRand(job.depositDue)}</dd>
              </div>
            </dl>
          </section>
        )}

        {kind === 'delivery' && job.deliveryNote && Object.keys(job.deliveryNote.shortReasons).length > 0 && (
          <p className="mt-4 rounded bg-warn-tint px-3 py-2 text-warn">
            <strong>Short on delivery:</strong>{' '}
            {job.lines
              .filter((l) => job.deliveryNote!.shortReasons[l.itemId + (l.source ?? '')])
              .map((l) => `${l.qty - (job.deliveryNote!.counts[l.itemId] ?? l.qty)} × ${itemsById.get(l.itemId)!.name} (${job.deliveryNote!.shortReasons[l.itemId + (l.source ?? '')]})`)
              .join('; ')}
            . Not charged.
          </p>
        )}
        {job.notes && kind !== 'invoice' && (
          <p className="mt-4 rounded bg-sunken px-3 py-2">
            <strong>Notes:</strong> {job.notes}
          </p>
        )}

        {/* signatures */}
        {kind === 'delivery' && <SignatureBlock label="Received in good order by" sig={job.deliveryNote?.signature} />}
        {kind === 'return' && (
          <>
            {job.returnNote?.signature ? (
              <SignatureBlock label="Return checked with" sig={job.returnNote.signature} />
            ) : (
              <p className="mt-6 text-[0.95em]">Client was not present at collection — Eastco’s count is final (hire terms §6).</p>
            )}
          </>
        )}
        {kind === 'quote' && (
          <section className="mt-6 grid grid-cols-2 gap-8 max-md:grid-cols-1">
            <div>
              <p className="mb-6 text-[0.9em] text-muted">Accepted by (name & signature)</p>
              <div className="border-b border-gold" />
            </div>
            <div>
              <p className="mb-6 text-[0.9em] text-muted">Date</p>
              <div className="border-b border-gold" />
            </div>
          </section>
        )}

        {/* footer */}
        <footer className="mt-8 border-t border-line pt-3 text-[0.82em] leading-snug text-muted">
          {kind === 'invoice' && (
            <p className="mb-2 text-ink">
              <strong>Banking details:</strong> {settings.bank.holder} · {settings.bank.name} · Account {settings.bank.account} · Branch code {settings.bank.branchCode} · Reference {job.invoiceNo}
            </p>
          )}
          {kind !== 'picking' && <p>{TERMS_SHORT} Full terms: eastcodecorhire.co.za/terms</p>}
          {kind === 'picking' && <p>Pack from the bays listed. Tick each line, count twice for chairs and napkins, and note anything damaged before it goes on the truck.</p>}
          {(kind === 'delivery' || kind === 'return') && job.deliveryNote && (
            <p className="mt-1">
              Verified: <span className="code">{job.deliveryNote.signature.hash.slice(0, 16).toUpperCase()}</span> — any change to this note after signing would change this code.
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}

const Tot = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="flex justify-between">
    <dt className="text-muted">{label}</dt>
    <dd className="tabular">{children}</dd>
  </div>
);

function LineTable({job, itemsById, kind, showPrices}: {job: Job; itemsById: Map<string, Item>; kind: Kind; showPrices: boolean}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-sunken text-left text-[0.85em] tracking-wide uppercase">
          <th className="px-2 py-1.5 font-semibold">Code</th>
          <th className="px-2 py-1.5 font-semibold">Item</th>
          <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
          {kind === 'delivery' && <th className="px-2 py-1.5 text-right font-semibold">Received</th>}
          {kind === 'return' && <th className="px-2 py-1.5 font-semibold">Condition</th>}
          {showPrices && (
            <>
              <th className="px-2 py-1.5 text-right font-semibold max-md:hidden">Unit</th>
              <th className="px-2 py-1.5 text-right font-semibold">Total</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {job.lines.map((l) => {
          const item = itemsById.get(l.itemId)!;
          const r = job.returnNote?.lines[l.itemId];
          const received = job.deliveryNote?.counts[l.itemId];
          return (
            <tr key={l.itemId + (l.source ?? '')} className="border-b border-line">
              <td className="code px-2 py-1.5 align-top">{item.code}</td>
              <td className="px-2 py-1.5 align-top">
                {item.name}
                {item.size && <span className="text-muted"> · {item.size}</span>}
                {l.discountPct > 0 && showPrices && <span className="text-muted"> · {l.discountPct}% off</span>}
              </td>
              <td className={cx('tabular px-2 py-1.5 text-right align-top', !showPrices && 'text-[1.25em] font-semibold')}>{l.qty}</td>
              {kind === 'delivery' && <td className={cx('tabular px-2 py-1.5 text-right align-top text-[1.25em] font-semibold', received !== undefined && received !== l.qty && 'text-warn')}>{received ?? '☐'}</td>}
              {kind === 'return' && <td className="px-2 py-1.5 align-top">{!r || r.state === 'ok' ? 'OK' : `${r.qty} ${r.state}`}</td>}
              {showPrices && (
                <>
                  <td className="tabular px-2 py-1.5 text-right align-top max-md:hidden">{formatRand(l.unitPrice)}</td>
                  <td className="tabular px-2 py-1.5 text-right align-top">{formatRand(lineTotal(l))}</td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PickingTable({job, itemsById}: {job: Job; itemsById: Map<string, Item>}) {
  const groups = new Map<string, Job['lines']>();
  for (const l of job.lines) {
    const loc = l.source ? `Transfer from ${BRANCHES[l.source].short}` : itemsById.get(l.itemId)!.location;
    groups.set(loc, [...(groups.get(loc) ?? []), l]);
  }
  return (
    <div className="space-y-4">
      {[...groups.entries()].sort().map(([loc, lines]) => (
        <section key={loc}>
          <h2 className="mb-1 text-[0.95em] font-semibold text-primary-deep">{loc}</h2>
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((l) => {
                const item = itemsById.get(l.itemId)!;
                return (
                  <tr key={l.itemId + (l.source ?? '')} className="border-b border-line">
                    <td className="w-8 py-2">
                      <span className="inline-block size-5 border-2 border-ink" aria-hidden />
                    </td>
                    <td className="code w-20 py-2">{item.code}</td>
                    <td className="py-2">{item.name}</td>
                    <td className="tabular w-16 py-2 text-right text-[14pt] font-semibold max-md:text-[18px]">{l.qty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
      <p className="pt-2">
        Packed by: ______________________ Checked by: ______________________
      </p>
    </div>
  );
}

function SignatureBlock({label, sig}: {label: string; sig?: Signature}) {
  return (
    <section className="mt-6 grid grid-cols-[1fr_auto] items-end gap-6 max-md:grid-cols-1">
      <div>
        <p className="text-[0.9em] text-muted">{label}</p>
        {sig ? <img src={sig.image} alt={`Signature of ${sig.signedBy}`} className="h-[22mm] max-md:h-20" /> : <div className="h-[22mm]" />}
        <div className="border-b-2 border-gold" />
        <p className="mt-1">{sig ? `${sig.signedBy} (${sig.role})` : 'Name:'}</p>
      </div>
      <p className="text-[0.9em] text-muted">{sig ? `Signed ${formatDateTime(sig.signedAt)}` : 'Date & time:'}</p>
    </section>
  );
}
