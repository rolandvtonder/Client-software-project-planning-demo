import {
  ArrowLeftIcon,
  CameraIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  CheckIcon,
  DropIcon,
  LinkIcon,
  MapTrifoldIcon,
  PhoneIcon,
  QuestionIcon,
  SealCheckIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {SignaturePadField, type SignatureHandle} from '../../components/SignaturePadField';
import {Button, Chip, QtyStepper, toast} from '../../components/ui';
import {formatDate, today} from '../../domain/dates';
import {formatRand} from '../../domain/money';
import type {Charge, Item, Job, ReturnState, Signature} from '../../domain/types';
import {clientLabel} from '../../data/selectors';
import {actions, newId, useStore} from '../../data/store';
import {DEMO_USERS} from '../../data/seed';
import {cx} from '../../lib/cx';
import {DriverShell} from './DriverShell';

const SHORT_REASONS = ['Not packed', 'Damaged — not handed over', 'Client didn’t want it', 'Other'];

async function sha256(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Array.from(text).reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 7).toString(16);
  }
}

export function DriverJob() {
  const {id} = useParams();
  const [params] = useSearchParams();
  const job = useStore((s) => s.jobs.find((j) => j.id === id), [id]);
  const items = useStore((s) => s.items);
  const client = useStore((s) => s.clients.find((c) => c.id === job?.clientId), [job?.clientId]);

  if (!job)
    return (
      <DriverShell>
        <p className="rounded-[var(--radius-card)] bg-white p-6 text-center">
          Job not found. <Link to="/driver" className="font-semibold text-primary underline">Back to today</Link>
        </p>
      </DriverShell>
    );

  const returning = params.get('mode') === 'return' || ['returned', 'issues', 'closed'].includes(job.status);
  return returning ? <ReturnFlow job={job} items={items} clientName={client?.name ?? ''} /> : <DeliveryFlow job={job} items={items} clientName={client?.name ?? ''} clientLabelText={clientLabel(client)} phone={client?.phone ?? ''} />;
}

function JobHeader({job, title, step, steps}: {job: Job; title: string; step: number; steps: string[]}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <Link to="/driver" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sunken text-primary-deep" aria-label="Back to today’s runs">
          <ArrowLeftIcon size={24} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] text-muted">
            {job.eventName} · {job.invoiceNo ?? job.quoteNo}
          </p>
          <h1 className="truncate text-[20px] font-semibold">{title}</h1>
        </div>
      </div>
      <ol className="mt-3 flex gap-1" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((s, i) => (
          <li key={s} className={cx('h-1.5 flex-1 rounded-full', i < step ? 'bg-primary' : i === step ? 'bg-gold' : 'bg-line')} title={s} />
        ))}
      </ol>
    </header>
  );
}

/* ================================================================ delivery */

function DeliveryFlow({job, items, clientName, clientLabelText, phone}: {job: Job; items: Item[]; clientName: string; clientLabelText: string; phone: string}) {
  const navigate = useNavigate();
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const signed = !!job.deliveryNote;
  const [step, setStep] = useState(signed ? 3 : 0);
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(job.lines.map((l) => [l.itemId + (l.source ?? ''), l.qty])));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [signedBy, setSignedBy] = useState(clientName);
  const [role, setRole] = useState<Signature['role']>('Client');
  const [agree, setAgree] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const pad = useRef<SignatureHandle>(null);
  const onPadChange = useCallback((e: boolean) => setEmpty(e), []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const keys = job.lines.map((l) => l.itemId + (l.source ?? ''));
  const doneCount = keys.filter((k) => checked[k]).length;
  const totalItems = Object.values(counts).reduce((n, c) => n + c, 0);
  const short = job.lines.filter((l) => (counts[l.itemId + (l.source ?? '')] ?? l.qty) < l.qty);
  const missingReason = short.some((l) => !reasons[l.itemId + (l.source ?? '')]);
  const waNumber = '27' + phone.replace(/\D/g, '').slice(1);

  const save = async () => {
    if (pad.current?.isEmpty() || !signedBy.trim() || !agree) return;
    setSaving(true);
    const signedAt = new Date().toISOString();
    const number = job.deliveryNote?.number ?? actions.nextNumber('DN');
    const countsByItem: Record<string, number> = {};
    job.lines.forEach((l) => (countsByItem[l.itemId] = (countsByItem[l.itemId] ?? 0) + (counts[l.itemId + (l.source ?? '')] ?? l.qty)));
    const hash = await sha256(JSON.stringify({job: job.id, number, counts: countsByItem, signedBy, signedAt}));
    actions.updateJob(
      job.id,
      {
        status: 'on_hire',
        deliveryNote: {number, counts: countsByItem, shortReasons: reasons, signature: {signedBy: signedBy.trim(), role, signedAt, image: pad.current!.toDataURL(), hash}},
      },
      `${job.fulfilment === 'delivery' ? 'Delivered' : 'Handed over at the counter'} — ${number} signed by ${signedBy.trim()} (${role})${short.length ? `, ${short.length} lines short` : ''}${photos.length ? `, ${photos.length} setup photos` : ''}`,
    );
    setSaving(false);
    setStep(3);
  };

  if (step === 3) {
    return (
      <DriverShell hideNav>
        <div className="flex flex-col items-center pt-10 text-center">
          <span className="animate-rise flex size-24 items-center justify-center rounded-full bg-ok-tint text-ok">
            <SealCheckIcon size={64} weight="fill" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-[32px] font-semibold text-primary-ink">Signed & done</h1>
          <p className="mt-2 max-w-sm text-[18px]">
            Delivery note <strong className="code">{job.deliveryNote?.number}</strong> was sent to {job.deliveryNote?.signature.signedBy.split(' ')[0] ?? clientName.split(' ')[0]} by WhatsApp.
          </p>
          <p className="mt-1 text-[15px] text-muted">(Demo — nothing was really sent.)</p>
          <div className="mt-8 grid w-full gap-3">
            <Button size="xl" variant="primary" onClick={() => navigate('/driver')}>
              Back to today’s runs
            </Button>
            <Button size="xl" onClick={() => navigate(`/doc/delivery/${job.id}`)}>
              View delivery note
            </Button>
            <Button size="xl" variant="ghost" icon={ChatCircleTextIcon} onClick={() => toast('Delivery note sent again')}>
              Resend to client
            </Button>
          </div>
        </div>
      </DriverShell>
    );
  }

  const steps = ['Job', 'Count', 'Sign'];

  return (
    <DriverShell hideNav header={<JobHeader job={job} step={step} steps={steps} title={step === 0 ? clientLabelText : step === 1 ? 'Count with the client' : 'Client signs'} />}>
      {step === 0 && (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-line bg-white p-4">
            <p className="text-[15px] text-muted">{job.fulfilment === 'delivery' ? `Delivery · ${formatDate(job.outDate)}, ${job.deliveryWindow}` : `Counter hand-over · ${formatDate(job.outDate)}`}</p>
            <p className="mt-1 text-[20px] font-semibold">{clientName}</p>
            <p className="text-[17px]">{job.venue}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-control/60 font-semibold text-primary-deep">
                <PhoneIcon size={24} aria-hidden /> Call
              </a>
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-control/60 font-semibold text-primary-deep">
                <ChatCircleTextIcon size={24} aria-hidden /> WhatsApp
              </a>
            </div>
            {job.fulfilment === 'delivery' && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.venue)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-14 items-center justify-center gap-2 rounded-[var(--radius-card)] bg-sunken font-semibold text-primary-deep"
              >
                <MapTrifoldIcon size={24} aria-hidden /> Navigate
              </a>
            )}
          </div>
          {job.notes && (
            <div className="flex gap-3 rounded-[var(--radius-card)] border border-gold/50 bg-[#fdf7ec] p-4">
              <WarningIcon size={24} className="shrink-0 text-gold-deep" aria-hidden />
              <p className="text-[17px]">{job.notes}</p>
            </div>
          )}
          <div className="rounded-[var(--radius-card)] border border-line bg-white p-4">
            <p className="text-[17px]">
              <strong className="tabular">{job.lines.length}</strong> lines · <strong className="tabular">{job.lines.reduce((n, l) => n + l.qty, 0)}</strong> items to hand over
            </p>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          <p className="sticky top-[104px] z-10 -mx-4 mb-3 bg-[#f4f1ea]/95 px-4 py-2 text-[17px] font-semibold backdrop-blur" role="status" aria-live="polite">
            <span className="tabular">{doneCount}</span> of <span className="tabular">{keys.length}</span> lines checked
          </p>
          <ul className="space-y-3">
            {job.lines.map((l) => {
              const k = l.itemId + (l.source ?? '');
              const item = itemsById.get(l.itemId)!;
              const n = counts[k] ?? l.qty;
              const isShort = n < l.qty;
              return (
                <li key={k} className={cx('rounded-[var(--radius-card)] border bg-white p-4 transition-colors', checked[k] ? 'border-primary/40 bg-mist/50' : 'border-line')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="code text-[15px] text-primary-deep">{item.code}</p>
                      <p className="text-[18px] leading-snug font-semibold">{item.name}</p>
                      <p className="text-[15px] text-muted">
                        Ordered <span className="tabular font-semibold text-ink">{l.qty}</span>
                      </p>
                    </div>
                    {checked[k] && <CheckCircleIcon size={32} weight="fill" className="shrink-0 text-primary" aria-label="Checked" />}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <QtyStepper size="xl" value={n} onChange={(v) => setCounts((prev) => ({...prev, [k]: v}))} label={item.name} />
                    <button
                      onClick={() => setChecked((prev) => ({...prev, [k]: !prev[k]}))}
                      aria-pressed={!!checked[k]}
                      className={cx('flex h-14 flex-1 items-center justify-center gap-2 rounded-[var(--radius-card)] text-[17px] font-semibold', checked[k] ? 'bg-primary text-white' : 'border-2 border-primary text-primary-deep')}
                    >
                      <CheckIcon size={24} weight="bold" aria-hidden /> {checked[k] ? 'Checked' : 'Confirm'}
                    </button>
                  </div>
                  {isShort && (
                    <div className="mt-3">
                      <Chip tone="warn">Short {l.qty - n}</Chip>
                      <label className="mt-2 block text-[15px] font-medium" htmlFor={`r-${k}`}>
                        Why is it short?
                      </label>
                      <select id={`r-${k}`} value={reasons[k] ?? ''} onChange={(e) => setReasons((prev) => ({...prev, [k]: e.target.value}))} className="mt-1 h-14 w-full rounded-[var(--radius-card)] border-2 border-control/60 bg-white px-3 text-[17px]">
                        <option value="">Choose a reason…</option>
                        {SHORT_REASONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="rounded-[var(--radius-card)] bg-white p-4 text-[17px]">
            <strong className="tabular">{job.lines.length}</strong> lines · <strong className="tabular">{totalItems}</strong> items{short.length ? ` · ${short.length} short` : ''}
          </p>

          <div>
            <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-control/60 bg-white text-[17px] font-semibold text-primary-deep">
              <CameraIcon size={24} aria-hidden /> Add setup photo (optional)
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhotos((p) => [...p, URL.createObjectURL(f)]);
                }}
              />
            </label>
            {photos.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {photos.map((p) => (
                  <img key={p} src={p} alt="Setup photo" className="size-20 shrink-0 rounded-[var(--radius-control)] object-cover" />
                ))}
              </div>
            )}
          </div>

          <SignaturePadField ref={pad} onChange={onPadChange} />
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => pad.current?.clear()}>
              Clear signature
            </Button>
          </div>

          <div>
            <label htmlFor="signed-by" className="mb-1 block text-[16px] font-medium">
              Signed by <span className="text-bad">*</span>
            </label>
            <input id="signed-by" autoComplete="name" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} className="h-14 w-full rounded-[var(--radius-card)] border-2 border-control/60 bg-white px-4 text-[18px]" />
          </div>
          <fieldset>
            <legend className="mb-1 text-[16px] font-medium">They are the</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['Client', 'Venue staff', 'Planner'] as const).map((r) => (
                <button key={r} onClick={() => setRole(r)} aria-pressed={role === r} className={cx('h-14 rounded-[var(--radius-card)] text-[16px] font-semibold', role === r ? 'bg-primary-deep text-white' : 'border-2 border-control/50 bg-white')}>
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-3 rounded-[var(--radius-card)] bg-white p-4 text-[17px]">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-6 shrink-0 accent-[var(--color-primary)]" />
            <span>I received the items and quantities listed, in good condition, under Eastco’s hire terms.</span>
          </label>
          <button className="flex w-full items-center justify-center gap-2 py-2 text-[16px] font-semibold text-primary underline" onClick={() => toast('A signing link was sent to the client by WhatsApp (demo)')}>
            <LinkIcon size={20} aria-hidden /> Client can’t sign here? Send a signing link
          </button>
        </div>
      )}

      {/* pinned primary action */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 py-3">
        <div className="mx-auto flex max-w-xl gap-3">
          {step > 0 && (
            <Button size="xl" className="w-auto shrink-0 px-5" onClick={() => setStep(step - 1)} aria-label="Previous step">
              <ArrowLeftIcon size={24} aria-hidden />
            </Button>
          )}
          {step === 0 && (
            <Button
              size="xl"
              variant="primary"
              onClick={() => {
                if (job.status !== 'out_for_delivery') actions.updateJob(job.id, {status: 'out_for_delivery'}, `${DEMO_USERS.driver.split(' ')[0]} started the ${job.fulfilment === 'delivery' ? 'delivery' : 'hand-over'}`);
                setStep(1);
              }}
            >
              {job.fulfilment === 'delivery' ? 'Arrived — start counting' : 'Start counting'}
            </Button>
          )}
          {step === 1 && (
            <Button size="xl" variant="primary" disabled={doneCount < keys.length || missingReason} onClick={() => setStep(2)}>
              {doneCount < keys.length ? `Check ${keys.length - doneCount} more` : missingReason ? 'Give a reason for short lines' : 'All counted — sign'}
            </Button>
          )}
          {step === 2 && (
            <Button size="xl" variant="primary" busy={saving} disabled={empty || !signedBy.trim() || !agree} onClick={save}>
              {empty ? 'Waiting for signature' : !agree ? 'Tick the confirmation' : 'Save signature'}
            </Button>
          )}
        </div>
      </div>
    </DriverShell>
  );
}

/* ================================================================ return */

const STATES: {value: ReturnState; label: string; icon: typeof CheckIcon; on: string}[] = [
  {value: 'ok', label: 'OK', icon: CheckIcon, on: 'bg-ok text-white'},
  {value: 'short', label: 'Short', icon: QuestionIcon, on: 'bg-bad text-white'},
  {value: 'damaged', label: 'Damaged', icon: XCircleIcon, on: 'bg-bad text-white'},
  {value: 'dirty', label: 'Dirty', icon: DropIcon, on: 'bg-warn text-white'},
];

function ReturnFlow({job, items, clientName}: {job: Job; items: Item[]; clientName: string}) {
  const navigate = useNavigate();
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const finished = !!job.returnNote;
  const [step, setStep] = useState(finished ? 2 : 0);
  const [lines, setLines] = useState<Record<string, {state: ReturnState; qty: number}>>(() => Object.fromEntries(job.lines.map((l) => [l.itemId, {state: 'ok', qty: 0}])));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [clientPresent, setClientPresent] = useState(true);
  const [empty, setEmpty] = useState(true);
  const pad = useRef<SignatureHandle>(null);
  const onPadChange = useCallback((e: boolean) => setEmpty(e), []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  const uniqueLines = [...new Map(job.lines.map((l) => [l.itemId, l])).values()];
  const qtyOf = (itemId: string) => job.lines.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0);
  const issues = Object.entries(lines).filter(([, v]) => v.state !== 'ok' && v.qty > 0);
  const doneCount = uniqueLines.filter((l) => touched[l.itemId]).length;

  const finish = () => {
    const charges: Charge[] = issues.map(([itemId, v]) => {
      const item = itemsById.get(itemId)!;
      const each = v.state === 'dirty' ? Math.max(item.cleaningFee, 2000) : item.replacementCost;
      const why = v.state === 'short' ? 'missing (replacement)' : v.state === 'damaged' ? 'damaged (replacement)' : 'dirty (cleaning fee)';
      return {id: newId('ch'), label: `${v.qty} × ${item.name}, ${why}`, amount: each * v.qty, approved: false};
    });
    const lateDays = Math.max(0, Math.round((new Date(today()).getTime() - new Date(job.backDate).getTime()) / 86400000));
    const number = actions.nextNumber('RN');
    const signature: Signature | undefined =
      clientPresent && !pad.current?.isEmpty() ? {signedBy: clientName, role: 'Client', signedAt: new Date().toISOString(), image: pad.current!.toDataURL(), hash: ''} : undefined;
    actions.updateJob(
      job.id,
      {
        status: charges.length ? 'issues' : 'returned',
        returnNote: {number, lines, signature, checkedAt: new Date().toISOString()},
        charges: [...job.charges, ...charges],
      },
      `Collected and counted — ${number}${charges.length ? `: ${charges.length} issues, charges suggested for approval` : ', everything OK'}${lateDays ? ` · ${lateDays} days late` : ''}${clientPresent ? '' : ' · client not present, Eastco’s count is final'}`,
    );
    setStep(2);
  };

  if (step === 2) {
    const j = job.returnNote ? job : undefined;
    const n = j?.charges.filter((c) => !c.approved).length ?? issues.length;
    return (
      <DriverShell hideNav>
        <div className="flex flex-col items-center pt-10 text-center">
          <span className={cx('animate-rise flex size-24 items-center justify-center rounded-full', n ? 'bg-warn-tint text-warn' : 'bg-ok-tint text-ok')}>
            {n ? <WarningIcon size={60} weight="fill" aria-hidden /> : <SealCheckIcon size={64} weight="fill" aria-hidden />}
          </span>
          <h1 className="mt-5 font-display text-[32px] font-semibold text-primary-ink">Return checked</h1>
          <p className="mt-2 max-w-sm text-[18px]">{n ? `${n} ${n === 1 ? 'issue was' : 'issues were'} sent to the office to approve charges against the deposit.` : 'Everything came back fine. The office can refund the deposit.'}</p>
          <div className="mt-8 grid w-full gap-3">
            <Button size="xl" variant="primary" onClick={() => navigate('/driver')}>
              Back to today’s runs
            </Button>
            <Button size="xl" onClick={() => navigate(`/doc/return/${job.id}`)}>
              View return note
            </Button>
          </div>
        </div>
      </DriverShell>
    );
  }

  return (
    <DriverShell hideNav header={<JobHeader job={job} step={step} steps={['Count back', 'Sign']} title={step === 0 ? 'Count everything back' : 'Confirm the return'} />}>
      {step === 0 && (
        <>
          <p className="sticky top-[104px] z-10 -mx-4 mb-3 bg-[#f4f1ea]/95 px-4 py-2 text-[17px] font-semibold backdrop-blur" role="status" aria-live="polite">
            <span className="tabular">{doneCount}</span> of <span className="tabular">{uniqueLines.length}</span> lines checked
          </p>
          <ul className="space-y-3">
            {uniqueLines.map((l) => {
              const item = itemsById.get(l.itemId)!;
              const v = lines[l.itemId];
              const total = qtyOf(l.itemId);
              return (
                <li key={l.itemId} className="rounded-[var(--radius-card)] border border-line bg-white p-4">
                  <p className="code text-[15px] text-primary-deep">{item.code}</p>
                  <p className="text-[18px] leading-snug font-semibold">{item.name}</p>
                  <p className="text-[15px] text-muted">
                    Went out <span className="tabular font-semibold text-ink">{job.deliveryNote?.counts[l.itemId] ?? total}</span>
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label={`${item.name} condition`}>
                    {STATES.map((s) => (
                      <button
                        key={s.value}
                        role="radio"
                        aria-checked={touched[l.itemId] && v.state === s.value}
                        onClick={() => {
                          setLines((prev) => ({...prev, [l.itemId]: {state: s.value, qty: s.value === 'ok' ? 0 : Math.max(1, prev[l.itemId].qty)}}));
                          setTouched((prev) => ({...prev, [l.itemId]: true}));
                        }}
                        className={cx(
                          'flex h-16 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-card)] text-[14px] font-semibold',
                          touched[l.itemId] && v.state === s.value ? s.on : 'border-2 border-control/40 bg-white text-ink',
                        )}
                      >
                        <s.icon size={22} weight="bold" aria-hidden />
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {touched[l.itemId] && v.state !== 'ok' && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[16px] font-medium">How many {v.state}?</span>
                      <QtyStepper size="xl" value={v.qty} onChange={(n) => setLines((prev) => ({...prev, [l.itemId]: {...prev[l.itemId], qty: Math.min(n, total)}}))} label={`${item.name} ${v.state}`} />
                      {v.state !== 'short' && (
                        <label className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-control/60 text-[16px] font-semibold text-primary-deep">
                          <CameraIcon size={22} aria-hidden /> Photo of the {v.state === 'dirty' ? 'stain' : 'damage'}
                          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={() => toast('Photo attached')} />
                        </label>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] bg-white p-4">
            {issues.length ? (
              <>
                <p className="text-[17px] font-semibold">{issues.length} issues found</p>
                <ul className="mt-2 space-y-1 text-[16px]">
                  {issues.map(([itemId, v]) => (
                    <li key={itemId} className="flex items-center justify-between gap-2">
                      <span>
                        {v.qty} × {itemsById.get(itemId)!.name}
                      </span>
                      <Chip tone={v.state === 'dirty' ? 'warn' : 'bad'}>{v.state}</Chip>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[14px] text-muted">The office approves the charges (no prices shown here). Lost or damaged items are charged at replacement cost; dirty items get a cleaning fee.</p>
              </>
            ) : (
              <p className="flex items-center gap-2 text-[17px] font-semibold text-ok">
                <CheckCircleIcon size={24} weight="fill" aria-hidden /> Everything is back and fine.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setClientPresent(true)} aria-pressed={clientPresent} className={cx('h-14 rounded-[var(--radius-card)] text-[16px] font-semibold', clientPresent ? 'bg-primary-deep text-white' : 'border-2 border-control/50 bg-white')}>
              Client is here
            </button>
            <button onClick={() => setClientPresent(false)} aria-pressed={!clientPresent} className={cx('h-14 rounded-[var(--radius-card)] text-[16px] font-semibold', !clientPresent ? 'bg-primary-deep text-white' : 'border-2 border-control/50 bg-white')}>
              Client not here
            </button>
          </div>
          {clientPresent ? (
            <>
              <SignaturePadField ref={pad} onChange={onPadChange} />
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => pad.current?.clear()}>
                  Clear signature
                </Button>
              </div>
            </>
          ) : (
            <p className="rounded-[var(--radius-card)] bg-warn-tint p-4 text-[16px] text-warn">Per the hire terms, if items aren’t checked with the client, Eastco’s count is final. The client gets a copy of the return note.</p>
          )}
          {issues.length > 0 && <p className="text-center text-[14px] text-muted">Estimated charges are worked out in the office — e.g. replacement cost {formatRand(itemsById.get(issues[0][0])!.replacementCost)} each for the first item.</p>}
        </div>
      )}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 py-3">
        <div className="mx-auto flex max-w-xl gap-3">
          {step > 0 && (
            <Button size="xl" className="w-auto shrink-0 px-5" onClick={() => setStep(step - 1)} aria-label="Previous step">
              <ArrowLeftIcon size={24} aria-hidden />
            </Button>
          )}
          {step === 0 ? (
            <Button size="xl" variant="primary" disabled={doneCount < uniqueLines.length} onClick={() => setStep(1)}>
              {doneCount < uniqueLines.length ? `Check ${uniqueLines.length - doneCount} more` : 'Next — confirm'}
            </Button>
          ) : (
            <Button size="xl" variant="primary" disabled={clientPresent && empty} onClick={finish}>
              {clientPresent && empty ? 'Waiting for signature' : 'Finish return check'}
            </Button>
          )}
        </div>
      </div>
    </DriverShell>
  );
}
