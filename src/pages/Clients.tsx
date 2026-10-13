import {ArrowLeftIcon, BuildingsIcon, ChatCircleTextIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, MagnifyingGlassIcon, PhoneIcon, PlusIcon, UserIcon, UsersThreeIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {JobRow} from '../components/JobRow';
import {Button, Card, CardHeader, Chip, Dialog, EmptyState, Field, inputClass, LinkButton, Money, PageHeader, Segmented, StatTile, toast} from '../components/ui';
import {formatDate, today} from '../domain/dates';
import {isQuote} from '../domain/lifecycle';
import {formatRand} from '../domain/money';
import {balance, totals} from '../domain/totals';
import type {BranchId, Client, ClientTag} from '../domain/types';
import {BRANCHES, clientLabel} from '../data/selectors';
import {actions, newId, useStore} from '../data/store';
import {cx} from '../lib/cx';

const TAGS: ClientTag[] = ['Wedding planner', 'Venue', 'Corporate', 'Repeat', 'Private'];

export function Clients() {
  const {clients, jobs, settings} = useStore((s) => ({clients: s.clients, jobs: s.jobs, settings: s.settings}));
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<ClientTag | ''>('');
  const navigate = useNavigate();
  const creating = params.get('new') === '1';

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return clients
      .filter((c) => !tag || c.tags.includes(tag))
      .filter((c) => !t || [c.name, c.company, c.phone, c.email].some((v) => v?.toLowerCase().includes(t)))
      .map((c) => {
        const mine = jobs.filter((j) => j.clientId === c.id && !isQuote(j.status) && j.status !== 'cancelled');
        const spent = mine.reduce((n, j) => n + totals(j, settings).total, 0);
        const owing = mine.reduce((n, j) => n + balance(j, settings).hireDue * (j.status === 'closed' ? 1 : 0), 0);
        const last = mine.map((j) => j.eventDate).sort().pop();
        return {c, orders: mine.length, spent, owing, last};
      })
      .sort((a, b) => clientLabel(a.c).localeCompare(clientLabel(b.c)));
  }, [clients, jobs, settings, q, tag]);

  return (
    <>
      <PageHeader
        title="Clients"
        sub={`${clients.length} client profiles`}
        actions={
          <Button variant="primary" icon={PlusIcon} onClick={() => setParams({new: '1'})}>
            New client
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 max-md:px-4">
          <div className="relative min-w-60 flex-1">
            <MagnifyingGlassIcon size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input aria-label="Search clients" className={cx(inputClass, 'pl-9')} placeholder="Name, company, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
            {(['', ...TAGS] as const).map((t) => (
              <button
                key={t || 'all'}
                aria-pressed={tag === t}
                onClick={() => setTag(t)}
                className={cx('h-8 rounded-full px-3 text-[13px] font-semibold', tag === t ? 'bg-primary-deep text-white' : 'bg-sunken text-muted hover:text-ink')}
              >
                {t || 'All'}
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={UsersThreeIcon} title="No clients match." action={<Button onClick={() => (setQ(''), setTag(''))}>Clear filters</Button>} />
        ) : (
          <>
            <table className="w-full text-[14px] max-md:hidden">
              <thead className="sticky top-16 bg-sunken text-left text-[12px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-2.5 pl-5 font-semibold">Client</th>
                  <th className="py-2.5 font-semibold">Contact</th>
                  <th className="py-2.5 font-semibold">Tags</th>
                  <th className="py-2.5 text-right font-semibold">Orders</th>
                  <th className="py-2.5 text-right font-semibold">Total spent</th>
                  <th className="py-2.5 pr-5 text-right font-semibold">Last event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({c, orders, spent, owing, last}) => (
                  <tr key={c.id} className="h-14 cursor-pointer hover:bg-sunken/50" onClick={() => navigate(`/clients/${c.id}`)}>
                    <td className="pl-5">
                      <Link to={`/clients/${c.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                        {clientLabel(c)}
                      </Link>
                      {c.company && <span className="block text-[13px] text-muted">{c.name}</span>}
                    </td>
                    <td className="text-[13.5px]">
                      {c.phone}
                      <span className="block text-muted">{c.email}</span>
                    </td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <Chip key={t} tone="neutral" icon={false}>
                            {t}
                          </Chip>
                        ))}
                        {owing > 0 && <Chip tone="bad">Owes {formatRand(owing, {decimals: false})}</Chip>}
                      </span>
                    </td>
                    <td className="tabular text-right">{orders}</td>
                    <td className="text-right">
                      <Money cents={spent} />
                    </td>
                    <td className="pr-5 text-right text-[13.5px] text-muted">{last ? formatDate(last, {weekday: false}) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {rows.map(({c, orders, owing}) => (
                <li key={c.id}>
                  <Link to={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist text-primary-deep">{c.kind === 'company' ? <BuildingsIcon size={20} aria-hidden /> : <UserIcon size={20} aria-hidden />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{clientLabel(c)}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {c.phone} · {orders} orders
                      </span>
                    </span>
                    {owing > 0 && <Chip tone="bad">Owes</Chip>}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Dialog open={creating} onClose={() => setParams({})} title="New client">
        <ClientForm
          onSaved={(c) => {
            setParams({});
            toast(`${clientLabel(c)} added`);
            navigate(`/clients/${c.id}`);
          }}
          onCancel={() => setParams({})}
        />
      </Dialog>
    </>
  );
}

export function ClientForm({onSaved, onCancel, defaultBranch}: {onSaved: (c: Client) => void; onCancel: () => void; defaultBranch?: BranchId}) {
  const clients = useStore((s) => s.clients);
  const stateBranch = useStore((s) => s.branch);
  const [kind, setKind] = useState<Client['kind']>('person');
  const [f, setF] = useState({name: '', company: '', phone: '', email: '', vatNo: '', address: ''});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const digits = (s: string) => s.replace(/\D/g, '');
  const duplicate = f.phone.length >= 6 ? clients.find((c) => digits(c.phone) === digits(f.phone)) ?? (f.email ? clients.find((c) => c.email.toLowerCase() === f.email.toLowerCase()) : undefined) : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = 'Enter the contact person’s name.';
    if (kind === 'company' && !f.company.trim()) er.company = 'Enter the company name.';
    if (digits(f.phone).length < 10) er.phone = 'Enter a phone number like 082 123 4567.';
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'That email address doesn’t look right — check for typos.';
    if (!consent) er.consent = 'Tick to confirm the client agreed to us keeping their details.';
    setErrors(er);
    if (Object.keys(er).length) return;
    const c: Client = {
      id: newId('c'),
      kind,
      name: f.name.trim(),
      company: kind === 'company' ? f.company.trim() : undefined,
      phone: f.phone.trim(),
      email: f.email.trim(),
      vatNo: f.vatNo.trim() || undefined,
      tags: kind === 'company' ? ['Corporate'] : ['Private'],
      branch: defaultBranch ?? (stateBranch === 'all' ? 'pta' : stateBranch),
      addresses: f.address ? [{label: 'Main', line: f.address}] : [],
      createdAt: today(),
      consent: {at: today(), via: 'WhatsApp'},
    };
    actions.saveClient(c);
    onSaved(c);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Segmented
        label="Client type"
        value={kind}
        onChange={setKind}
        options={[
          {value: 'person', label: 'Person'},
          {value: 'company', label: 'Company'},
        ]}
      />
      {kind === 'company' && (
        <Field label="Company name" required error={errors.company}>
          {(p) => <input {...p} className={inputClass} autoComplete="organization" value={f.company} onChange={(e) => setF({...f, company: e.target.value})} />}
        </Field>
      )}
      <Field label={kind === 'company' ? 'Contact person' : 'Full name'} required error={errors.name}>
        {(p) => <input {...p} className={inputClass} autoComplete="name" value={f.name} onChange={(e) => setF({...f, name: e.target.value})} />}
      </Field>
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Field label="Phone (WhatsApp)" required error={errors.phone}>
          {(p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" className={inputClass} placeholder="082 123 4567" value={f.phone} onChange={(e) => setF({...f, phone: e.target.value})} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(p) => <input {...p} type="email" autoComplete="email" className={inputClass} value={f.email} onChange={(e) => setF({...f, email: e.target.value})} />}
        </Field>
      </div>
      {duplicate && (
        <p className="rounded-[var(--radius-control)] bg-warn-tint px-3 py-2 text-[14px] text-warn" role="status">
          Looks like <Link to={`/clients/${duplicate.id}`} className="font-semibold underline">{clientLabel(duplicate)}</Link> already has this {digits(duplicate.phone) === digits(f.phone) ? 'phone number' : 'email'}.
        </p>
      )}
      {kind === 'company' && (
        <Field label="VAT number" helper="Printed on tax invoices.">
          {(p) => <input {...p} className={inputClass} value={f.vatNo} onChange={(e) => setF({...f, vatNo: e.target.value})} />}
        </Field>
      )}
      <Field label="Address or usual venue">
        {(p) => <input {...p} className={inputClass} autoComplete="street-address" value={f.address} onChange={(e) => setF({...f, address: e.target.value})} />}
      </Field>
      <div>
        <label className="flex items-start gap-2 text-[14px]">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--color-primary)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>The client agreed that Eastco may keep these details to manage their bookings (POPIA).</span>
        </label>
        {errors.consent && <p className="mt-1 text-[13px] text-bad">{errors.consent}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save client
        </Button>
      </div>
    </form>
  );
}

export function ClientDetail() {
  const {id} = useParams();
  const client = useStore((s) => s.clients.find((c) => c.id === id), [id]);
  const {jobs, settings} = useStore((s) => ({jobs: s.jobs, settings: s.settings}));
  const [tab, setTab] = useState<'history' | 'money' | 'details'>('history');

  if (!client)
    return (
      <EmptyState icon={UsersThreeIcon} title="Client not found" action={<LinkButton to="/clients">Back to clients</LinkButton>}>
        It may have been removed in this demo.
      </EmptyState>
    );

  const mine = jobs.filter((j) => j.clientId === client.id).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const orders = mine.filter((j) => !isQuote(j.status) && j.status !== 'cancelled');
  const spent = orders.reduce((n, j) => n + totals(j, settings).total, 0);
  const depositsHeld = orders.filter((j) => j.status !== 'closed').reduce((n, j) => n + balance(j, settings).depositPaid, 0);
  const owing = orders.reduce((n, j) => n + balance(j, settings).hireDue * (j.status === 'closed' ? 1 : 0), 0);
  const damages = orders.flatMap((j) => j.charges);
  const waNumber = '27' + client.phone.replace(/\D/g, '').slice(1);

  return (
    <>
      <PageHeader
        back={
          <Link to="/clients" className="mb-2 inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
            <ArrowLeftIcon size={16} aria-hidden /> Clients
          </Link>
        }
        title={clientLabel(client)}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            {client.company && <span>{client.name} ·</span>}
            <span>Client since {formatDate(client.createdAt, {weekday: false})}</span>
            <span>· {BRANCHES[client.branch].short}</span>
            {client.tags.map((t) => (
              <Chip key={t} tone="neutral" icon={false}>
                {t}
              </Chip>
            ))}
          </span>
        }
        actions={
          <>
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-control/60 bg-surface px-4 text-[14px] font-semibold hover:bg-sunken/60">
              <ChatCircleTextIcon size={18} aria-hidden /> WhatsApp
            </a>
            <LinkButton to={`/quotes/new?client=${client.id}`} variant="primary" icon={PlusIcon}>
              New quote
            </LinkButton>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:gap-3">
        <StatTile label="Orders" value={orders.length} />
        <StatTile label="Total spent" value={formatRand(spent, {decimals: false})} />
        <StatTile label="Deposits held" value={formatRand(depositsHeld, {decimals: false})} />
        <StatTile label="Balance owing" value={formatRand(owing, {decimals: false})} delta={owing ? {text: 'Overdue', tone: 'bad'} : {text: 'Nothing owing', tone: 'ok'}} />
      </div>

      <div role="tablist" aria-label="Client sections" className="mb-4 flex gap-1 border-b border-line">
        {(
          [
            ['history', 'History'],
            ['money', 'Payments & damages'],
            ['details', 'Details & privacy'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('-mb-px h-11 border-b-2 px-4 text-[14.5px] font-semibold', tab === k ? 'border-primary text-primary-deep' : 'border-transparent text-muted hover:text-ink')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'history' && (
        <Card>
          {mine.length ? (
            <ul className="divide-y divide-line">
              {mine.map((j) => (
                <JobRow key={j.id} job={j} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={UsersThreeIcon} title="No quotes or orders yet." action={<LinkButton to="/quotes/new" variant="primary">Start a quote</LinkButton>} />
          )}
        </Card>
      )}

      {tab === 'money' && (
        <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
          <Card>
            <CardHeader title="Payments" />
            <ul className="divide-y divide-line text-[14px]">
              {orders.flatMap((j) => j.payments.map((p) => ({p, j}))).sort((a, b) => b.p.at.localeCompare(a.p.at)).map(({p, j}) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-28 text-muted">{formatDate(p.at, {weekday: false})}</span>
                  <span className="flex-1">
                    {p.kind === 'deposit' ? 'Deposit' : p.kind === 'refund' ? 'Deposit refund' : p.kind === 'charge' ? 'Damage charge' : 'Hire payment'} · {p.method}
                    <span className="block text-[12.5px] text-muted">{j.invoiceNo ?? j.quoteNo} · {j.eventName}</span>
                  </span>
                  <Money cents={p.kind === 'refund' ? -p.amount : p.amount} className="font-semibold" />
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Damages & losses" />
            {damages.length ? (
              <ul className="divide-y divide-line text-[14px]">
                {damages.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="flex-1">{d.label}</span>
                    <Chip tone={d.approved ? 'ok' : 'warn'}>{d.approved ? 'Charged' : 'To approve'}</Chip>
                    <Money cents={d.amount} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[14px] text-muted">No damages or losses — a careful client.</p>
            )}
          </Card>
        </div>
      )}

      {tab === 'details' && (
        <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
          <Card className="p-5">
            <dl className="grid grid-cols-[140px_1fr] gap-y-3 text-[14px]">
              <dt className="text-muted">Phone</dt>
              <dd className="flex items-center gap-2">
                <PhoneIcon size={16} aria-hidden /> <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="text-primary underline">{client.phone}</a>
              </dd>
              <dt className="text-muted">Email</dt>
              <dd className="flex items-center gap-2">
                <EnvelopeSimpleIcon size={16} aria-hidden /> {client.email}
              </dd>
              {client.vatNo && (
                <>
                  <dt className="text-muted">VAT number</dt>
                  <dd>{client.vatNo}</dd>
                </>
              )}
              <dt className="text-muted">Addresses</dt>
              <dd>{client.addresses.length ? client.addresses.map((a) => <span key={a.line} className="block">{a.label}: {a.line}</span>) : '—'}</dd>
              <dt className="text-muted">Notes</dt>
              <dd>{client.notes || '—'}</dd>
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 font-semibold">Privacy (POPIA)</h2>
            <p className="text-[14px] text-muted">
              Consent recorded {formatDate(client.consent.at, {weekday: false})} via {client.consent.via}. The client can ask for a copy of their data, or to be removed. Financial records are kept for SARS; personal details are wiped.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button icon={DownloadSimpleIcon} onClick={() => toast('In the live system this downloads the client’s data as a file')}>
                Export client data
              </Button>
              <Button variant="ghost" onClick={() => toast('In the live system this asks the owner to approve, then anonymises the client')}>
                Anonymise…
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
