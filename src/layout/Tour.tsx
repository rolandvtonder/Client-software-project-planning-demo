/**
 * "Start here" guided tour for people trying the demo without anyone beside
 * them: a welcome dialog on first visit, then a small card that walks through
 * the best parts — quote with stock check, the client's view, confirming,
 * signing on a phone, the monthly report — and takes you to each screen.
 */

import {ArrowLeftIcon, ArrowRightIcon, CaretUpIcon, CompassIcon, XIcon} from '@phosphor-icons/react';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {Button, Dialog} from '../components/ui';
import {actions, getState, type Role} from '../data/store';
import {cx} from '../lib/cx';

type TourState = {active: boolean; step: number; jobId?: string; minimised: boolean};

const KEY = 'eastco-hire-demo-tour';
const SEEN = 'eastco-hire-demo-tour-seen';

function load(): TourState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as TourState;
  } catch {
    /* storage blocked */
  }
  return {active: false, step: 0, minimised: false};
}

let state = load();
const listeners = new Set<() => void>();
function set(p: Partial<TourState>) {
  state = {...state, ...p};
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const tour = {
  get: () => state,
  start: () => set({active: true, step: 0, jobId: undefined, minimised: false}),
  stop: () => set({active: false}),
  /** Called when a quote is sent during the tour, so later steps use that quote. */
  rememberJob: (jobId: string) => state.active && set({jobId}),
};

function useTour() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state,
  );
}

/** The quote the tour follows: the one sent during the tour, else a demo quote waiting on a reply. */
function quoteId(t: TourState): string {
  const s = getState();
  if (t.jobId && s.jobs.some((j) => j.id === t.jobId)) return t.jobId;
  const waiting = s.jobs.filter((j) => j.status === 'quote_sent');
  return (waiting.find((j) => j.branch === 'pta') ?? waiting[0] ?? s.jobs[s.jobs.length - 1]).id;
}

type Step = {title: string; hint: string; to: (t: TourState) => string; role?: Role};

const STEPS: Step[] = [
  {
    title: 'Make a quote',
    hint: 'We’ve started a wedding quote on a busy weekend. See the red “Short”? Only 10 chairs are free at Pretoria. Tap “borrow” to take the rest from Krugersdorp, then press Send quote.',
    to: () => '/quotes/new?tour=1',
    role: 'owner',
  },
  {
    title: 'Your client’s view',
    hint: 'This is the page your client opens from the WhatsApp link — your logo, photos, prices and terms. They tick, sign with a finger and accept. Try it.',
    to: (t) => `/q/${quoteId(t)}`,
  },
  {
    title: 'Confirm the booking',
    hint: 'Back in the office: press the big “Next step” button to record the deposit. The booking is confirmed, the stock reserved and the tax invoice issued — open it under Documents.',
    to: (t) => `/jobs/${quoteId(t)}`,
    role: 'owner',
  },
  {
    title: 'Deliver & sign on a phone',
    hint: 'This is the driver’s phone. Open Nomsa’s baby shower, count each line with the client, and let them sign with a finger. The signed delivery note goes to the client.',
    to: () => '/driver',
    role: 'driver',
  },
  {
    title: 'Monthly report',
    hint: 'All orders for the month with totals, charts and a download for Excel. That’s the tour — click around anything else you like.',
    to: () => '/reports',
    role: 'owner',
  },
];

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return true;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN, '1');
  } catch {
    /* ignore */
  }
}

/** Welcome dialog, shown once per browser (and from the ribbon's Tour button). */
export function TourIntro() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const t = useTour();
  useEffect(() => {
    if (!seen() && !t.active && !location.hash.startsWith('#/q/')) setOpen(true);
    const h = () => setOpen(true);
    window.addEventListener('eastco-tour-intro', h);
    return () => window.removeEventListener('eastco-tour-intro', h);
  }, [t.active]);

  const close = () => {
    markSeen();
    setOpen(false);
  };
  const begin = () => {
    close();
    tour.start();
    actions.setRole('owner');
    navigate(STEPS[0].to(tour.get()));
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Welcome to your Eastco Hire Manager preview"
      footer={
        <>
          <Button onClick={close}>I’ll look around myself</Button>
          <Button variant="primary" icon={CompassIcon} onClick={begin}>
            Start the 3-minute tour
          </Button>
        </>
      }
    >
      <p className="text-[15px]">This is a working preview of your new system. The clients are made up, but the equipment, codes and prices are from your September catalogues. Nothing is sent to anyone, so click anything.</p>
      <ol className="mt-4 space-y-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-center gap-3 text-[15px]">
            <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-mist font-semibold text-primary-deep">{i + 1}</span>
            {s.title}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[13px] text-muted">You can start the tour again any time from “Tour” in the gold bar at the top.</p>
    </Dialog>
  );
}

/** The floating step card. */
export function TourBar() {
  const t = useTour();
  const navigate = useNavigate();
  const {pathname} = useLocation();
  const [more, setMore] = useState(false);
  useEffect(() => {
    setMore(false);
  }, [t.step]);
  if (!t.active) return null;
  // Phones: sit above the bottom bar, except on the client page, which has none.
  const bottom = pathname.startsWith('/q/') ? 'bottom-3' : 'bottom-[92px]';
  const step = STEPS[t.step];
  const go = (i: number) => {
    if (i >= STEPS.length) {
      tour.stop();
      return;
    }
    set({step: i, minimised: false});
    const s = STEPS[i];
    if (s.role) actions.setRole(s.role);
    navigate(s.to({...t, step: i}));
  };

  if (t.minimised)
    return (
      <button
        onClick={() => set({minimised: false})}
        className={`no-print fixed ${bottom} left-3 z-[1050] inline-flex h-11 items-center gap-2 rounded-full bg-primary-ink px-4 text-[14px] font-semibold text-white shadow-[var(--shadow-raise)] lg:bottom-6 lg:left-[272px]`}
      >
        <CompassIcon size={18} aria-hidden /> Tour · {t.step + 1} of {STEPS.length}
        <CaretUpIcon size={14} weight="bold" aria-hidden />
      </button>
    );

  return (
    <aside
      aria-label="Guided tour"
      className={`no-print animate-rise fixed inset-x-2 ${bottom} z-[1050] rounded-[var(--radius-sheet)] border border-primary/30 bg-primary-ink p-3 text-white sm:p-4 shadow-[var(--shadow-raise)] sm:inset-x-auto sm:left-3 sm:w-[380px] lg:bottom-6 lg:left-[272px]`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-semibold tracking-[0.12em] text-gold-soft uppercase">
          Tour · step {t.step + 1} of {STEPS.length}
        </p>
        <div className="-mt-1 -mr-1 flex">
          <button onClick={() => set({minimised: true})} className="rounded px-2 text-[13px] font-semibold text-white/80 hover:text-white">
            Hide
          </button>
          <button onClick={() => tour.stop()} aria-label="End the tour" className="flex size-8 items-center justify-center rounded text-white/80 hover:text-white">
            <XIcon size={18} aria-hidden />
          </button>
        </div>
      </div>
      <h2 className="mt-0.5 font-display text-[19px] leading-tight font-semibold sm:mt-1 sm:text-[22px]">{step.title}</h2>
      <p className={cx('mt-1 text-[13.5px] leading-relaxed text-white/90 sm:mt-1.5 sm:text-[14px]', !more && 'max-sm:line-clamp-2')}>{step.hint}</p>
      {!more && (
        <button onClick={() => setMore(true)} className="text-[13px] font-semibold text-aqua underline underline-offset-2 sm:hidden">
          Read more
        </button>
      )}
      <div className="mt-3 flex items-center gap-1.5 max-sm:hidden" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s.title} className={cx('h-1.5 flex-1 rounded-full', i < t.step ? 'bg-aqua' : i === t.step ? 'bg-gold' : 'bg-white/20')} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
        <button onClick={() => go(t.step)} className="text-[13px] font-semibold text-aqua underline underline-offset-2">
          Take me there
        </button>
        <div className="flex gap-2">
          {t.step > 0 && (
            <button onClick={() => go(t.step - 1)} aria-label="Previous step" className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-white/10 hover:bg-white/20">
              <ArrowLeftIcon size={18} aria-hidden />
            </button>
          )}
          <button onClick={() => go(t.step + 1)} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-gold-soft px-4 text-[14px] font-semibold text-primary-ink hover:bg-white">
            {t.step === STEPS.length - 1 ? 'Finish' : 'Next'} <ArrowRightIcon size={16} weight="bold" aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}

export const openTourIntro = () => window.dispatchEvent(new Event('eastco-tour-intro'));
