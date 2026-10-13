/**
 * The small component kit, built on the MASTER design tokens. In the live build
 * these become themed shadcn/ui components; the look and rules stay the same.
 */

import {
  CheckCircleIcon,
  CircleIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  WarningCircleIcon,
  XCircleIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import {useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode} from 'react';
import {Link, type LinkProps} from 'react-router-dom';
import {formatRand} from '../domain/money';
import {STATUS, type Tone} from '../domain/lifecycle';
import type {Cents, JobStatus} from '../domain/types';
import {cx} from '../lib/cx';

// ---------------------------------------------------------------- buttons

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-deep active:bg-primary-ink shadow-sm',
  secondary: 'bg-surface text-ink border border-control/60 hover:border-control hover:bg-sunken/60',
  ghost: 'text-primary-deep hover:bg-mist/70',
  danger: 'bg-bad text-white hover:bg-[#8f1c13]',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[var(--radius-control)]',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-[var(--radius-control)] max-md:h-12 max-md:text-[15px]',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-[var(--radius-control)]',
  xl: 'h-14 px-6 text-[17px] gap-2.5 rounded-[var(--radius-card)] w-full',
};

const base =
  'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none transition-colors duration-[120ms] disabled:opacity-45 disabled:pointer-events-none';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {variant?: Variant; size?: Size; icon?: Icon; busy?: boolean};

export function Button({variant = 'secondary', size = 'md', icon: I, busy, children, className, disabled, ...rest}: BtnProps) {
  return (
    <button className={cx(base, variants[variant], sizes[size], className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? <Spinner /> : I && <I size={size === 'xl' ? 24 : 18} weight="regular" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({variant = 'secondary', size = 'md', icon: I, children, className, ...rest}: LinkProps & {variant?: Variant; size?: Size; icon?: Icon}) {
  return (
    <Link className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {I && <I size={size === 'xl' ? 24 : 18} aria-hidden />}
      {children}
    </Link>
  );
}

export function IconButton({icon: I, label, className, ...rest}: ButtonHTMLAttributes<HTMLButtonElement> & {icon: Icon; label: string}) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx('inline-flex size-10 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-sunken hover:text-ink max-md:size-11', className)}
      {...rest}
    >
      <I size={20} aria-hidden />
    </button>
  );
}

export const Spinner = () => (
  <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
);

// ---------------------------------------------------------------- status

const toneClass: Record<Tone, string> = {
  ok: 'bg-ok-tint text-ok',
  warn: 'bg-warn-tint text-warn',
  bad: 'bg-bad-tint text-bad',
  info: 'bg-info-tint text-info',
  neutral: 'bg-neutral-tint text-neutral',
};
const toneIcon: Record<Tone, Icon> = {ok: CheckCircleIcon, warn: WarningCircleIcon, bad: XCircleIcon, info: InfoIcon, neutral: CircleIcon};

/** Tint + icon + word. Never colour alone. */
export function Chip({tone, children, icon, className}: {tone: Tone; children: ReactNode; icon?: Icon | false; className?: string}) {
  const I = icon === false ? null : (icon ?? toneIcon[tone]);
  return (
    <span className={cx('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold', toneClass[tone], className)}>
      {I && <I size={14} weight="bold" aria-hidden />}
      {children}
    </span>
  );
}

export function StatusChip({status}: {status: JobStatus}) {
  const s = STATUS[status];
  return (
    <Chip tone={s.tone} className={status === 'cancelled' ? 'line-through' : undefined}>
      {s.label}
    </Chip>
  );
}

// ---------------------------------------------------------------- layout

export function Card({children, className, as: As = 'section'}: {children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'}) {
  return <As className={cx('rounded-[var(--radius-card)] border border-line bg-surface', className)}>{children}</As>;
}

export function CardHeader({title, action, sub}: {title: ReactNode; action?: ReactNode; sub?: ReactNode}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5 max-md:px-4">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold leading-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({title, sub, actions, back}: {title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: ReactNode}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 max-md:mb-4">
      <div className="min-w-0">
        {back}
        <h1 className="font-display text-[32px] leading-[1.1] font-semibold text-primary-ink max-md:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({icon: I, title, children, action}: {icon: Icon; title: string; children?: ReactNode; action?: ReactNode}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-sunken text-primary">
        <I size={28} aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[14px] text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatTile({label, value, delta, to}: {label: string; value: ReactNode; delta?: {text: string; tone: Tone}; to?: string}) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="tabular mt-1 text-[26px] leading-tight font-semibold text-ink max-md:text-[22px]">{value}</p>
      {delta && <p className={cx('mt-1 text-[13px] font-medium', delta.tone === 'ok' ? 'text-ok' : delta.tone === 'bad' ? 'text-bad' : 'text-muted')}>{delta.text}</p>}
    </>
  );
  const cls = 'block rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-shadow';
  return to ? (
    <Link to={to} className={cx(cls, 'hover:shadow-[var(--shadow-raise)]')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export const Money = ({cents, className}: {cents: Cents; className?: string}) => <span className={cx('tabular whitespace-nowrap', className)}>{formatRand(cents)}</span>;

// ---------------------------------------------------------------- forms

export function Field({
  label,
  helper,
  error,
  required,
  children,
  className,
}: {
  label: string;
  helper?: ReactNode;
  error?: string;
  required?: boolean;
  children: (props: {id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean}) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-err` : helper ? `${id}-help` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
        {required && (
          <span className="text-bad" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children({id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined})}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1 text-[13px] text-bad" role="alert">
          <XCircleIcon size={14} weight="bold" aria-hidden /> {error}
        </p>
      ) : (
        helper && (
          <p id={`${id}-help`} className="mt-1.5 text-[13px] text-muted">
            {helper}
          </p>
        )
      )}
    </div>
  );
}

export const inputClass =
  'block h-10 w-full rounded-[var(--radius-control)] border border-control/70 bg-surface px-3 text-[15px] text-ink placeholder:text-muted/80 hover:border-control focus:border-primary focus:outline-2 focus:outline-primary/30 aria-[invalid=true]:border-bad max-md:h-12 max-md:text-[16px]';

export function Segmented<T extends string>({value, onChange, options, label, size = 'md'}: {value: T; onChange: (v: T) => void; options: {value: T; label: string}[]; label: string; size?: 'sm' | 'md'}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[var(--radius-control)] border border-control/50 bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-[4px] px-3 font-semibold transition-colors',
            size === 'sm' ? 'h-7 text-[12.5px]' : 'h-9 text-[13.5px] max-md:h-10',
            value === o.value ? 'bg-primary-deep text-white' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function QtyStepper({value, onChange, max, label, size = 'md'}: {value: number; onChange: (n: number) => void; max?: number; label: string; size?: 'md' | 'xl'}) {
  const big = size === 'xl';
  const btn = cx(
    'inline-flex items-center justify-center text-primary-deep transition-colors hover:bg-mist disabled:opacity-40',
    big ? 'size-14' : 'size-9 max-md:size-11',
  );
  return (
    <div className={cx('inline-flex items-center overflow-hidden rounded-[var(--radius-control)] border border-control/60 bg-surface', big && 'rounded-[var(--radius-card)]')}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`Decrease ${label}, currently ${value}`}>
        <MinusIcon size={big ? 24 : 16} weight="bold" aria-hidden />
      </button>
      <input
        inputMode="numeric"
        aria-label={`${label} quantity`}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
          onChange(max !== undefined ? Math.min(n, max * 10) : n);
        }}
        onFocus={(e) => e.target.select()}
        className={cx('tabular border-x border-line bg-transparent text-center font-semibold outline-none focus:bg-mist/40', big ? 'h-14 w-20 text-[28px]' : 'h-9 w-14 text-[15px] max-md:h-11')}
      />
      <button type="button" className={btn} onClick={() => onChange(value + 1)} aria-label={`Increase ${label}, currently ${value}`}>
        <PlusIcon size={big ? 24 : 16} weight="bold" aria-hidden />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- dialog

/** Native <dialog>: focus trap, Esc and focus return come for free. Bottom sheet on phones. */
export function Dialog({open, onClose, title, children, footer, wide}: {open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dlg-title"
      className={cx(
        'm-auto max-h-[90dvh] w-[calc(100%-32px)] overflow-hidden rounded-[var(--radius-sheet)] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-raise)] backdrop:backdrop-blur-[1px]',
        wide ? 'max-w-3xl' : 'max-w-lg',
        'max-md:mb-0 max-md:w-full max-md:max-w-none max-md:rounded-b-none',
      )}
    >
      {open && (
        <div className="animate-rise flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <h2 id="dlg-title" className="text-[17px] font-semibold">
              {title}
            </h2>
            <IconButton icon={XIcon} label="Close" onClick={onClose} />
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="pb-safe flex flex-wrap justify-end gap-2 border-t border-line bg-sunken/50 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

// ---------------------------------------------------------------- toast

type ToastMsg = {id: number; text: string; undo?: () => void};
let toasts: ToastMsg[] = [];
const toastListeners = new Set<(t: ToastMsg[]) => void>();
let tid = 0;

export function toast(text: string, undo?: () => void) {
  const t = {id: ++tid, text, undo};
  toasts = [...toasts, t];
  toastListeners.forEach((l) => l(toasts));
  setTimeout(() => dismissToast(t.id), 4500);
}
function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  toastListeners.forEach((l) => l(toasts));
}

export function Toaster() {
  const [list, setList] = useState<ToastMsg[]>([]);
  useEffect(() => {
    toastListeners.add(setList);
    return () => {
      toastListeners.delete(setList);
    };
  }, []);
  return (
    <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[1100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
      {list.map((t) => (
        <div key={t.id} className="animate-rise pointer-events-auto flex items-center gap-3 rounded-[var(--radius-card)] bg-primary-ink px-4 py-3 text-[14px] text-white shadow-[var(--shadow-raise)]">
          <CheckCircleIcon size={18} weight="fill" className="text-aqua" aria-hidden />
          <span>{t.text}</span>
          {t.undo && (
            <button
              className="font-semibold text-gold-soft underline underline-offset-2"
              onClick={() => {
                t.undo!();
                dismissToast(t.id);
              }}
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
