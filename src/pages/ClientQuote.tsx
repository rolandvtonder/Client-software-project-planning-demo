/**
 * What the client sees when they open the quote link from WhatsApp or email:
 * Eastco's branding, the items with photos, totals, terms, and accept & sign.
 * Phone-first. In the live system this page sits behind a private, expiring
 * link and shows nothing else from the system.
 */

import {ArrowLeftIcon, CalendarBlankIcon, ChatCircleTextIcon, CheckCircleIcon, MapPinIcon, SealCheckIcon} from '@phosphor-icons/react';
import {useCallback, useRef, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {SignaturePadField, type SignatureHandle} from '../components/SignaturePadField';
import {Button, toast} from '../components/ui';
import {formatDate, formatDateTime} from '../domain/dates';
import {formatRand} from '../domain/money';
import {lineTotal, totals} from '../domain/totals';
import {photoUrl} from '../data/catalogue';
import {BRANCHES} from '../data/selectors';
import {actions, getState, useStore} from '../data/store';
import {cx} from '../lib/cx';
import {tour} from '../layout/Tour';

const TERMS = [
  'Prices and quantities are only guaranteed once the order is accepted and the deposit is paid.',
  'Hire charges and deposits are paid in cash on delivery unless agreed otherwise. Deposits paid into an account are refunded less a 10% banking fee.',
  'Late returns are charged at the daily rate, plus travel fees if Eastco collects.',
  'Lost or damaged items are charged at full replacement cost. Unwashed items attract a cleaning fee. Please don’t put wet linen in a bag.',
  'If items aren’t checked on return with Eastco’s representative, Eastco’s count is final.',
  'Cancellations must be in writing. A 10% cancellation fee applies to paid bookings.',
];

export function ClientQuote() {
  const {id} = useParams();
  const job = useStore((s) => s.jobs.find((j) => j.id === id), [id]);
  const {items, clients, settings} = useStore((s) => ({items: s.items, clients: s.clients, settings: s.settings}));
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const pad = useRef<SignatureHandle>(null);
  const onPad = useCallback((e: boolean) => setEmpty(e), []);

  if (!job)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6 text-center">
        <p>
          This quote link has expired or doesn’t exist. Please contact Eastco Decor Hire.
          <br />
          <Link to="/" className="font-semibold text-primary underline">
            Back to the demo
          </Link>
        </p>
      </div>
    );

  const client = clients.find((c) => c.id === job.clientId);
  const branch = BRANCHES[job.branch];
  const byId = new Map(items.map((i) => [i.id, i]));
  const t = totals(job, settings);
  const accepted = job.status !== 'draft' && job.status !== 'quote_sent' && job.status !== 'cancelled';
  const firstName = (client?.name ?? '').split(' ')[0];
  // One row per item, even when part of it is borrowed from the other branch.
  const rows = [...new Map(job.lines.map((l) => [l.itemId, l])).keys()].map((itemId) => {
    const ls = job.lines.filter((l) => l.itemId === itemId);
    return {item: byId.get(itemId)!, qty: ls.reduce((n, l) => n + l.qty, 0), total: ls.reduce((n, l) => n + lineTotal(l), 0)};
  });

  const accept = () => {
    if (pad.current?.isEmpty() || !name.trim() || !agree) return;
    const s = getState();
    actions.updateJob(
      job.id,
      {
        status: 'accepted',
        holdUntil: new Date(Date.now() + s.settings.softHoldHours * 3600_000).toISOString(),
        acceptance: {signedBy: name.trim(), role: 'Client', signedAt: new Date().toISOString(), image: pad.current!.toDataURL(), hash: ''},
      },
      `Quote accepted and signed online by ${name.trim()} — stock on hold for ${s.settings.softHoldHours} hours`,
    );
    tour.rememberJob(job.id);
    window.scrollTo({top: 0});
  };

  return (
    <div className="min-h-dvh bg-bg pb-10">
      <div className="no-print flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-gold-soft px-4 py-1.5 text-center text-[12.5px] text-primary-ink">
        <span>
          <strong className="tracking-[0.12em]">DEMO</strong> — this is what your client sees on their phone.
        </span>
        <Link to={`/jobs/${job.id}`} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
          <ArrowLeftIcon size={14} aria-hidden /> Back to the system
        </Link>
      </div>

      <header className="bg-primary-deep px-4 pt-6 pb-16 text-center text-white">
        <img src="brand/eastco-logo.png" alt="Eastco Decor Hire" className="mx-auto size-20 rounded-full bg-white" />
        <p className="mt-3 text-[12px] tracking-[0.18em] text-aqua uppercase">Events · Décor · Hire</p>
        <h1 className="mt-2 font-display text-[30px] leading-tight font-semibold">{firstName ? `Hi ${firstName}, here’s your quote` : 'Your quote'}</h1>
        <p className="mt-1 text-[14px] text-white/80">
          {job.quoteNo} · valid until {formatDate(job.validUntil, {weekday: false})}
        </p>
      </header>

      <main className="mx-auto -mt-10 max-w-xl space-y-4 px-4">
        {accepted && (
          <section className="animate-rise rounded-[var(--radius-card)] border border-ok/30 bg-ok-tint p-5 text-ok" role="status">
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <SealCheckIcon size={26} weight="fill" aria-hidden /> Thank you — your quote is accepted
            </p>
            <p className="mt-1 text-[15px] text-ink">
              {job.acceptance ? `Signed by ${job.acceptance.signedBy} on ${formatDateTime(job.acceptance.signedAt)}. ` : ''}
              Your items are held for {settings.softHoldHours} hours. Pay the deposit of <strong>{formatRand(job.depositDue)}</strong> to confirm your booking — {branch.name} will send you the details.
            </p>
          </section>
        )}

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="font-display text-[24px] leading-tight font-semibold text-primary-ink">{job.eventName}</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li className="flex gap-2">
              <CalendarBlankIcon size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <span>
                Event on <strong>{formatDate(job.eventDate)}</strong>
                <span className="block text-[14px] text-muted">
                  {job.fulfilment === 'delivery' ? `Delivered ${formatDate(job.outDate, {year: false})}${job.deliveryWindow ? `, ${job.deliveryWindow}` : ''} · collected ${formatDate(job.backDate, {year: false})}` : `You collect ${formatDate(job.outDate, {year: false})} · return ${formatDate(job.backDate, {year: false})}`}
                </span>
              </span>
            </li>
            {job.venue && (
              <li className="flex gap-2">
                <MapPinIcon size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                <span>{job.venue}</span>
              </li>
            )}
          </ul>
        </section>

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <h2 className="border-b border-line px-5 py-3 text-[16px] font-semibold">Your items</h2>
          <ul className="divide-y divide-line">
            {rows.map(({item, qty, total}) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <img src={photoUrl(item)} alt="" loading="lazy" className="size-16 shrink-0 rounded-[var(--radius-control)] bg-white object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{item.name}</p>
                  <p className="text-[13px] text-muted">
                    <span className="tabular">{qty}</span> × {formatRand(item.price)}
                    {item.size ? ` · ${item.size}` : ''}
                  </p>
                </div>
                <p className="tabular shrink-0 font-semibold">{formatRand(total)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-line bg-sunken/50 px-5 py-4 text-[15px]">
            {t.discount > 0 && (
              <Row label={`Discount ${job.discountPct}%`} value={`−${formatRand(t.discount)}`} />
            )}
            {t.delivery > 0 && <Row label="Delivery & collection" value={formatRand(t.delivery)} />}
            {t.setup > 0 && <Row label="Setup & strike" value={formatRand(t.setup)} />}
            {settings.vatRegistered && <Row label="VAT 15%" value={formatRand(t.vat)} />}
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="tabular text-[24px] font-semibold">{formatRand(t.total)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-muted">Refundable deposit</dt>
              <dd className="tabular font-semibold">{formatRand(job.depositDue)}</dd>
            </div>
          </dl>
        </section>

        {job.notes && (
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-[15px]">
            <h2 className="mb-1 font-semibold">Notes</h2>
            <p>{job.notes}</p>
          </section>
        )}

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <button onClick={() => setShowTerms(!showTerms)} aria-expanded={showTerms} className="flex w-full items-center justify-between text-left font-semibold">
            Hire terms in short
            <span className="text-[14px] font-semibold text-primary">{showTerms ? 'Hide' : 'Read'}</span>
          </button>
          {showTerms && (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] text-muted">
              {TERMS.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
        </section>

        {!accepted && job.status !== 'cancelled' && (
          <section className="rounded-[var(--radius-card)] border-2 border-primary/40 bg-surface p-5">
            <h2 className="font-display text-[24px] leading-tight font-semibold text-primary-ink">Happy with your quote?</h2>
            <p className="mt-1 text-[15px] text-muted">Accept and sign below. We’ll hold your items for {settings.softHoldHours} hours while you pay the deposit.</p>
            <label htmlFor="acc-name" className="mt-4 mb-1 block text-[15px] font-medium">
              Your full name <span className="text-bad">*</span>
            </label>
            <input
              id="acc-name"
              autoComplete="name"
              value={name}
              placeholder={client?.name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-[var(--radius-control)] border border-control/70 bg-white px-3 text-[16px]"
            />
            <div className="mt-4">
              <SignaturePadField ref={pad} onChange={onPad} />
              <div className="mt-1 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => pad.current?.clear()}>
                  Clear signature
                </Button>
              </div>
            </div>
            <label className="mt-2 flex items-start gap-3 text-[15px]">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
              <span>I accept this quote and Eastco Decor Hire’s hire terms.</span>
            </label>
            <Button size="xl" variant="primary" icon={CheckCircleIcon} className="mt-4" disabled={empty || !name.trim() || !agree} onClick={accept}>
              {!name.trim() ? 'Type your name' : empty ? 'Sign above' : !agree ? 'Tick to accept the terms' : `Accept quote · ${formatRand(t.total)}`}
            </Button>
          </section>
        )}

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-center">
          <p className="font-semibold">Questions or changes?</p>
          <p className="text-[14px] text-muted">
            {branch.name} · {branch.phone} · {branch.email}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button icon={ChatCircleTextIcon} onClick={() => toast('In the live system this opens WhatsApp to the branch')}>
              WhatsApp us
            </Button>
            <Button onClick={() => toast('In the live system the client can ask for changes here')}>Ask for changes</Button>
          </div>
        </section>

        <p className={cx('px-4 text-center text-[12.5px] text-muted')}>Eastco CC t/a Eastco Decor Hire · {branch.address}</p>
      </main>
    </div>
  );
}

const Row = ({label, value}: {label: string; value: string}) => (
  <div className="flex justify-between">
    <dt className="text-muted">{label}</dt>
    <dd className="tabular">{value}</dd>
  </div>
);
