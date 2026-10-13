import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  CompassIcon,
  ChartBarIcon,
  ClipboardTextIcon,
  DotsThreeOutlineIcon,
  FileTextIcon,
  GearSixIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  SignOutIcon,
  TruckIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react';
import {useEffect, useState, type ReactNode} from 'react';
import {Link, NavLink, useLocation, useNavigate} from 'react-router-dom';
import {Button, Dialog, LinkButton, Segmented, toast} from '../components/ui';
import {actions, useStore, type Role} from '../data/store';
import {DEMO_USERS} from '../data/seed';
import {cx} from '../lib/cx';
import {isQuote} from '../domain/lifecycle';
import {SearchDialog} from './SearchDialog';
import {openTourIntro} from './Tour';

type NavItem = {to: string; label: string; icon: Icon; end?: boolean};

const NAV: NavItem[] = [
  {to: '/', label: 'Dashboard', icon: HouseIcon, end: true},
  {to: '/quotes', label: 'Quotes', icon: FileTextIcon},
  {to: '/jobs', label: 'Orders', icon: ClipboardTextIcon},
  {to: '/calendar', label: 'Calendar', icon: CalendarBlankIcon},
  {to: '/clients', label: 'Clients', icon: UsersThreeIcon},
  {to: '/equipment', label: 'Equipment', icon: PackageIcon},
  {to: '/invoices', label: 'Invoices', icon: ReceiptIcon},
  {to: '/reports', label: 'Reports', icon: ChartBarIcon},
];

export function Logo({className}: {className?: string}) {
  return <img src="brand/eastco-logo.png" alt="Eastco Decor Hire" width={40} height={40} className={cx('rounded-full bg-white', className)} />;
}

export function DemoRibbon() {
  const [confirm, setConfirm] = useState(false);
  const role = useStore((s) => s.role);
  const navigate = useNavigate();
  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-gold-soft px-4 py-1.5 text-[12.5px] text-primary-ink">
      <span>
        <strong className="tracking-[0.12em]">DEMO</strong> — made-up clients, real catalogue items. Nothing here is sent to anyone.
      </span>
      <label className="flex items-center gap-1.5">
        <span className="font-medium">View as</span>
        <select
          value={role}
          onChange={(e) => {
            const r = e.target.value as Role;
            actions.setRole(r);
            navigate(r === 'driver' ? '/driver' : '/');
          }}
          className="h-7 rounded border border-control/50 bg-white/70 px-1.5 text-[12.5px] font-semibold"
        >
          <option value="owner">{DEMO_USERS.owner}</option>
          <option value="office">{DEMO_USERS.office}</option>
          <option value="driver">{DEMO_USERS.driver} — phone</option>
        </select>
      </label>
      <button className="inline-flex items-center gap-1 font-semibold underline underline-offset-2" onClick={openTourIntro}>
        <CompassIcon size={14} weight="bold" aria-hidden /> Tour
      </button>
      <button className="inline-flex items-center gap-1 font-semibold underline underline-offset-2" onClick={() => setConfirm(true)}>
        <ArrowCounterClockwiseIcon size={14} weight="bold" aria-hidden /> Reset demo
      </button>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset the demo?"
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Keep my changes</Button>
            <Button
              variant="primary"
              onClick={() => {
                actions.reset();
                setConfirm(false);
                toast('Demo data restored');
              }}
            >
              Reset demo data
            </Button>
          </>
        }
      >
        <p>Every quote, client and signature you added in this browser goes back to the original demo data.</p>
      </Dialog>
    </div>
  );
}

function Sidebar() {
  const role = useStore((s) => s.role);
  const {pathname} = useLocation();
  const jobId = pathname.match(/^\/jobs\/([^/]+)/)?.[1];
  const viewingQuote = useStore((s) => {
    const j = jobId ? s.jobs.find((x) => x.id === jobId) : undefined;
    return !!j && isQuote(j.status);
  }, [jobId]);
  const active = (to: string, isActive: boolean) => (to === '/jobs' ? isActive && !viewingQuote : to === '/quotes' ? isActive || viewingQuote : isActive);
  return (
    <aside className="no-print sticky top-0 flex h-dvh w-[248px] shrink-0 flex-col bg-primary-deep text-white max-lg:hidden">
      <Link to="/" className="flex items-center gap-3 px-5 pt-5 pb-6">
        <Logo />
        <span className="leading-tight">
          <span className="block font-display text-[21px] font-semibold">Eastco</span>
          <span className="block text-[11px] tracking-[0.14em] text-aqua uppercase">Hire Manager</span>
        </span>
      </Link>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({isActive}) =>
                  cx(
                    'relative flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[14.5px] font-medium transition-colors',
                    active(n.to, isActive) ? 'bg-primary-ink text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-gold' : 'text-white/80 hover:bg-white/8 hover:text-white',
                  )
                }
              >
                {({isActive}) => (
                  <>
                    <n.icon size={20} weight={active(n.to, isActive) ? 'fill' : 'regular'} aria-hidden />
                    {n.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="my-3 border-t border-white/10" />
        <NavLink
          to="/driver"
          className="flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[14.5px] font-medium text-white/80 hover:bg-white/8 hover:text-white"
          onClick={() => actions.setRole('driver')}
        >
          <TruckIcon size={20} aria-hidden /> Driver mode
        </NavLink>
        <NavLink
          to="/settings"
          className={({isActive}) => cx('flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[14.5px] font-medium', isActive ? 'bg-primary-ink text-white' : 'text-white/80 hover:bg-white/8 hover:text-white')}
        >
          <GearSixIcon size={20} aria-hidden /> Settings
        </NavLink>
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[13px]">
        <p className="font-semibold">{DEMO_USERS[role]}</p>
        <button className="mt-2 inline-flex items-center gap-1.5 text-white/70 hover:text-white" onClick={() => toast('In the live system this signs you out')}>
          <SignOutIcon size={16} aria-hidden /> Sign out
        </button>
      </div>
    </aside>
  );
}

function TopBar({onSearch}: {onSearch: () => void}) {
  const branch = useStore((s) => s.branch);
  return (
    <div className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/95 px-8 backdrop-blur max-lg:px-4 max-md:h-14">
      <Link to="/" className="flex items-center gap-2 lg:hidden" aria-label="Eastco Hire Manager — home">
        <Logo className="size-9" />
      </Link>
      <button
        onClick={onSearch}
        aria-label="Search clients, orders, invoices and items"
        className="flex h-10 min-w-0 max-w-md flex-1 items-center gap-2 rounded-[var(--radius-control)] border border-control/50 bg-surface px-3 text-left text-[14px] text-muted hover:border-control max-md:h-10"
      >
        <MagnifyingGlassIcon size={18} aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          <span className="max-sm:hidden">Find a client, order, invoice or item…</span>
          <span className="sm:hidden">Search…</span>
        </span>
        <kbd className="rounded border border-line bg-sunken px-1.5 text-[11px] font-semibold max-md:hidden">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="text-[13px] font-medium text-muted max-md:hidden">Branch</span>
        <Segmented
          label="Branch"
          size="sm"
          value={branch}
          onChange={actions.setBranch}
          options={[
            {value: 'pta', label: 'PTA'},
            {value: 'kdp', label: 'KDP'},
            {value: 'all', label: 'Both'},
          ]}
        />
        <LinkButton to="/quotes/new" variant="primary" icon={PlusIcon} className="max-md:hidden">
          New quote
        </LinkButton>
      </div>
    </div>
  );
}

function BottomNav() {
  const [more, setMore] = useState(false);
  const [newSheet, setNewSheet] = useState(false);
  const navigate = useNavigate();
  const tab = (to: string, label: string, I: Icon, end?: boolean) => (
    <NavLink to={to} end={end} className={({isActive}) => cx('flex flex-1 flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold', isActive ? 'text-primary-deep' : 'text-muted')}>
      {({isActive}) => (
        <>
          <I size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden />
          {label}
        </>
      )}
    </NavLink>
  );
  return (
    <>
      <nav aria-label="Main" className="no-print pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface lg:hidden">
        <div className="flex h-16">
          {tab('/', 'Home', HouseIcon, true)}
          {tab('/jobs', 'Orders', ClipboardTextIcon)}
          <button onClick={() => setNewSheet(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold text-primary-deep" aria-label="New">
            <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-[var(--shadow-raise)] ring-4 ring-bg">
              <PlusIcon size={24} weight="bold" aria-hidden />
            </span>
            New
          </button>
          {tab('/calendar', 'Calendar', CalendarBlankIcon)}
          <button onClick={() => setMore(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold text-muted">
            <DotsThreeOutlineIcon size={24} aria-hidden />
            More
          </button>
        </div>
      </nav>
      <Dialog open={newSheet} onClose={() => setNewSheet(false)} title="Create new">
        <div className="grid gap-2">
          {[
            {label: 'New quote', icon: FileTextIcon, to: '/quotes/new'},
            {label: 'New client', icon: UsersThreeIcon, to: '/clients?new=1'},
          ].map((o) => (
            <Button key={o.to} size="lg" icon={o.icon} className="justify-start" onClick={() => (setNewSheet(false), navigate(o.to))}>
              {o.label}
            </Button>
          ))}
        </div>
      </Dialog>
      <Dialog open={more} onClose={() => setMore(false)} title="More">
        <div className="grid gap-2">
          {[...NAV.filter((n) => !['/', '/jobs', '/calendar'].includes(n.to)), {to: '/driver', label: 'Driver mode', icon: TruckIcon}, {to: '/settings', label: 'Settings', icon: GearSixIcon}].map((n) => (
            <Button
              key={n.to}
              size="lg"
              icon={n.icon}
              className="justify-start"
              onClick={() => {
                setMore(false);
                if (n.to === '/driver') actions.setRole('driver');
                navigate(n.to);
              }}
            >
              {n.label}
            </Button>
          ))}
        </div>
      </Dialog>
    </>
  );
}

export function AppShell({children}: {children: ReactNode}) {
  const [search, setSearch] = useState(false);
  const {pathname} = useLocation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({preventScroll: true});
  }, [pathname]);

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoRibbon />
        <TopBar onSearch={() => setSearch(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-8 py-7 outline-none max-lg:px-6 max-md:px-4 max-md:py-5 max-lg:pb-28">
          {children}
        </main>
      </div>
      <BottomNav />
      <SearchDialog open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
