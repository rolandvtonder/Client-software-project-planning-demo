import {ShieldCheckIcon} from '@phosphor-icons/react';
import {useState} from 'react';
import {Button, Card, CardHeader, Chip, Field, inputClass, PageHeader, toast} from '../components/ui';
import {formatRand, rand} from '../domain/money';
import {BRANCHES} from '../data/selectors';
import {actions, useStore} from '../data/store';

const ROLES = [
  {role: 'Owner', who: 'Elize', can: 'Everything, both branches, settings, users, approving refunds and write-offs', twoFactor: true},
  {role: 'Branch manager', who: '—', can: 'Everything for their branch; sees the other branch’s stock for transfers', twoFactor: true},
  {role: 'Office / sales', who: 'Carmen (PTA)', can: 'Clients, quotes, orders, invoices and payments for their branch', twoFactor: false},
  {role: 'Warehouse / driver', who: 'Sipho', can: 'Today’s picking lists, delivery and return notes, signatures — no prices', twoFactor: false},
  {role: 'Bookkeeper', who: '—', can: 'Read-only invoices, payments, reports and exports', twoFactor: true},
];

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const [f, setF] = useState(settings);
  const changed = JSON.stringify(f) !== JSON.stringify(settings);

  return (
    <>
      <PageHeader
        title="Settings"
        sub="Only the owner can change these. Every change is logged."
        actions={
          <Button variant="primary" disabled={!changed} onClick={() => (actions.saveSettings(f), toast('Settings saved'))}>
            Save settings
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
        <Card>
          <CardHeader title="Money rules" sub="Used on every quote, invoice and refund" />
          <div className="space-y-4 p-5">
            <label className="flex items-start gap-3 text-[14px]">
              <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-primary)]" checked={f.vatRegistered} onChange={(e) => setF({...f, vatRegistered: e.target.checked})} />
              <span>
                <span className="font-semibold">Eastco is VAT registered</span>
                <span className="block text-muted">Adds 15% VAT and prints “Tax Invoice”. (Still to confirm with Eastco.)</span>
              </span>
            </label>
            {f.vatRegistered && (
              <Field label="VAT number">
                {(p) => <input {...p} className={inputClass} value={f.vatNo} onChange={(e) => setF({...f, vatNo: e.target.value})} />}
              </Field>
            )}
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <Field label="Deposit (% of hire)" helper="Assumed — confirm how Eastco works it out.">
                {(p) => <input {...p} inputMode="numeric" className={inputClass} value={f.depositPct} onChange={(e) => setF({...f, depositPct: Number(e.target.value.replace(/\D/g, '')) || 0})} />}
              </Field>
              <Field label="Minimum deposit (R)">
                {(p) => <input {...p} inputMode="numeric" className={inputClass} value={f.depositMin / 100} onChange={(e) => setF({...f, depositMin: rand(Number(e.target.value.replace(/\D/g, '')) || 0)})} />}
              </Field>
              <Field label="Bank fee on EFT deposit refunds (%)" helper="From the hire terms: 10%.">
                {(p) => <input {...p} inputMode="numeric" className={inputClass} value={f.bankFeePct} onChange={(e) => setF({...f, bankFeePct: Number(e.target.value.replace(/\D/g, '')) || 0})} />}
              </Field>
              <Field label="Cancellation fee (%)" helper="From the hire terms: 10% on paid bookings.">
                {(p) => <input {...p} inputMode="numeric" className={inputClass} value={f.cancellationPct} onChange={(e) => setF({...f, cancellationPct: Number(e.target.value.replace(/\D/g, '')) || 0})} />}
              </Field>
              <Field label="Hold stock for accepted quotes (hours)">
                {(p) => <input {...p} inputMode="numeric" className={inputClass} value={f.softHoldHours} onChange={(e) => setF({...f, softHoldHours: Number(e.target.value.replace(/\D/g, '')) || 0})} />}
              </Field>
              <Field label="Quotes valid for (days)">
                {(p) => <input {...p} inputMode="numeric" className={inputClass} value={f.quoteValidDays} onChange={(e) => setF({...f, quoteValidDays: Number(e.target.value.replace(/\D/g, '')) || 0})} />}
              </Field>
            </div>
            <p className="text-[13px] text-muted">
              Example: a {formatRand(rand(10000), {decimals: false})} quote needs a deposit of {formatRand(Math.max(f.depositMin, Math.ceil((rand(10000) * f.depositPct) / 100 / 5000) * 5000), {decimals: false})}.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Branches" />
          <ul className="divide-y divide-line">
            {Object.values(BRANCHES).map((b) => (
              <li key={b.short} className="px-5 py-3 text-[14px]">
                <p className="font-semibold">
                  {b.name} <span className="code ml-1 text-[12px] text-muted">{b.short}</span>
                </p>
                <p className="text-muted">{b.address}</p>
                <p className="text-muted">
                  {b.phone} · {b.email}
                </p>
              </li>
            ))}
          </ul>
          <CardHeader title="Bank details on invoices" />
          <p className="px-5 py-3 text-[14px] text-muted">
            {settings.bank.holder} · {settings.bank.name} · {settings.bank.account} (demo placeholder — Eastco to supply)
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Users & what they can do" sub="Enforced by the database in the live system, not just hidden buttons" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead className="bg-sunken text-left text-[12px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-2 pl-5 font-semibold">Role</th>
                  <th className="py-2 font-semibold">Who (demo)</th>
                  <th className="py-2 font-semibold">Can</th>
                  <th className="py-2 pr-5 font-semibold">Sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ROLES.map((r) => (
                  <tr key={r.role}>
                    <td className="py-2.5 pl-5 font-semibold">{r.role}</td>
                    <td className="py-2.5">{r.who}</td>
                    <td className="py-2.5 text-muted">{r.can}</td>
                    <td className="py-2.5 pr-5">{r.twoFactor ? <Chip tone="ok" icon={ShieldCheckIcon}>2-step required</Chip> : <Chip tone="neutral" icon={false}>Password</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
