import {CheckSquareIcon, ListChecksIcon, QrCodeIcon, WifiSlashIcon} from '@phosphor-icons/react';
import {useEffect, useState, type ReactNode} from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {toast} from '../../components/ui';
import {DemoRibbon} from '../../layout/AppShell';
import {cx} from '../../lib/cx';

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * Driver mode follows pages/driver-mode.md: always light, 18px text, 56px
 * targets, no prices anywhere, and its own three-tab bottom bar.
 */
export function DriverShell({children, header, hideNav}: {children: ReactNode; header?: ReactNode; hideNav?: boolean}) {
  const online = useOnline();
  return (
    <div className="min-h-dvh bg-[#f4f1ea] text-[18px]">
      <DemoRibbon />
      {!online && (
        <p className="flex items-center justify-center gap-2 bg-warn-tint px-4 py-2 text-[15px] font-semibold text-warn" role="status">
          <WifiSlashIcon size={20} aria-hidden /> You’re offline. Signatures are saved and will upload when you’re back.
        </p>
      )}
      <div className="mx-auto max-w-xl">
        {header}
        <main className={cx('px-4 pt-4', hideNav ? 'pb-32' : 'pb-28')}>{children}</main>
      </div>
      {!hideNav && (
        <nav aria-label="Driver" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white">
          <div className="mx-auto flex h-[72px] max-w-xl">
            <Tab to="/driver" icon={ListChecksIcon} label="Today" />
            <button className="flex flex-1 flex-col items-center justify-center gap-1 text-[13px] font-semibold text-muted" onClick={() => toast('Scanning QR labels on stock comes in phase 3')}>
              <QrCodeIcon size={28} aria-hidden /> Scan
            </button>
            <Tab to="/driver?done=1" icon={CheckSquareIcon} label="Done" />
          </div>
        </nav>
      )}
    </div>
  );
}

function Tab({to, icon: I, label}: {to: string; icon: typeof ListChecksIcon; label: string}) {
  const {search, pathname} = useLocation();
  const done = to.includes('done');
  const isDone = search.includes('done=1');
  if (pathname !== '/driver') return <NavLink to={to} className="flex flex-1 flex-col items-center justify-center gap-1 text-[13px] font-semibold text-muted"><I size={28} aria-hidden />{label}</NavLink>;
  const active = done ? isDone : !isDone;
  return (
    <NavLink to={to} className={cx('flex flex-1 flex-col items-center justify-center gap-1 text-[13px] font-semibold', active ? 'text-primary-deep' : 'text-muted')}>
      <I size={28} weight={active ? 'fill' : 'regular'} aria-hidden />
      {label}
    </NavLink>
  );
}
