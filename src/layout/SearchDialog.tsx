import {ClipboardTextIcon, MagnifyingGlassIcon, PackageIcon, UserIcon} from '@phosphor-icons/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {StatusChip} from '../components/ui';
import {formatShort} from '../domain/dates';
import {clientLabel, clientMap} from '../data/selectors';
import {useStore} from '../data/store';
import {cx} from '../lib/cx';

type Hit = {key: string; to: string; icon: typeof UserIcon; title: string; sub: string; extra?: React.ReactNode};

export function SearchDialog({open, onClose}: {open: boolean; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const {jobs, clients, items} = useStore((s) => ({jobs: s.jobs, clients: s.clients, items: s.items}));
  const cmap = useStore(clientMap);

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) {
      d.showModal();
      setQ('');
      setActive(0);
      setTimeout(() => input.current?.focus(), 0);
    }
    if (!open && d.open) d.close();
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const m = (s?: string) => !!s && s.toLowerCase().includes(t);
    const out: Hit[] = [];
    for (const c of clients) if (m(c.name) || m(c.company) || m(c.phone.replace(/\s/g, '')) || m(c.phone) || m(c.email)) out.push({key: c.id, to: `/clients/${c.id}`, icon: UserIcon, title: clientLabel(c), sub: `${c.company ? c.name + ' · ' : ''}${c.phone}`});
    for (const j of [...jobs].reverse())
      if (m(j.quoteNo) || m(j.invoiceNo) || m(j.eventName) || m(j.deliveryNote?.number) || m(clientLabel(cmap.get(j.clientId))))
        out.push({key: j.id, to: `/jobs/${j.id}`, icon: ClipboardTextIcon, title: `${j.eventName}`, sub: `${j.invoiceNo ?? j.quoteNo} · ${clientLabel(cmap.get(j.clientId))} · ${formatShort(j.eventDate)}`, extra: <StatusChip status={j.status} />});
    for (const i of items) if (m(i.code) || m(i.name)) out.push({key: i.id, to: `/equipment?item=${i.id}`, icon: PackageIcon, title: `${i.code} · ${i.name}`, sub: `${i.category} · PTA ${i.stock.pta} · KDP ${i.stock.kdp}`});
    return out.slice(0, 12);
  }, [q, jobs, clients, items, cmap]);

  const go = (h: Hit) => {
    onClose();
    navigate(h.to);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Search"
      className="mx-auto mt-[10vh] w-[calc(100%-32px)] max-w-xl overflow-hidden rounded-[var(--radius-sheet)] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-raise)]"
    >
      <div className="flex items-center gap-2 border-b border-line px-4">
        <MagnifyingGlassIcon size={20} className="text-muted" aria-hidden />
        <input
          ref={input}
          value={q}
          onChange={(e) => (setQ(e.target.value), setActive(0))}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, hits.length - 1)));
            if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
            if (e.key === 'Enter' && hits[active]) go(hits[active]);
          }}
          placeholder="Name, phone, Q-/INV- number, item code…"
          aria-label="Search"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="search-results"
          className="h-14 flex-1 bg-transparent text-[16px] outline-none"
        />
      </div>
      <ul id="search-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
        {q && hits.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-muted">Nothing found for “{q}”. Try a phone number, a quote number or an item code like TAB04.</li>}
        {!q && <li className="px-3 py-4 text-[14px] text-muted">Try “Sarah”, “Q-”, “CHA10” or “082”.</li>}
        {hits.map((h, i) => (
          <li key={h.key + h.to} role="option" aria-selected={i === active}>
            <button
              onClick={() => go(h)}
              onMouseEnter={() => setActive(i)}
              className={cx('flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left', i === active && 'bg-mist/70')}
            >
              <h.icon size={20} className="shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{h.title}</span>
                <span className="block truncate text-[13px] text-muted">{h.sub}</span>
              </span>
              {h.extra}
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
