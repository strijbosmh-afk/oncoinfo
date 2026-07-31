import { Link, NavLink, useLocation } from 'react-router-dom';
import { BookOpenText, ClipboardList, Pin, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';

const primaryItems = [
  { label: 'Infofolders', href: '/home', icon: BookOpenText },
  { label: 'Ontslagbriefsjablonen', href: '/discharge-templates', icon: ClipboardList, physicianOnly: true },
];

const shortcutItems = [
  { label: 'Favorieten', href: '/drugs?focus=favorites', icon: Star },
  { label: 'Snelkeuzes', href: '/drugs?focus=most-used', icon: Pin },
];

function SidebarLink({ item }: { item: { label: string; href: string; icon: React.ElementType } }) {
  const Icon = item.icon;
  const location = useLocation();
  const target = new URL(item.href, window.location.origin);
  const isShortcut = item.href.includes('#') || item.href.includes('focus=');
  const matchesInfofolders = item.label === 'Infofolders' && (location.pathname === '/home' || location.pathname.startsWith('/drugs'));
  const matchesModule = target.pathname === '/discharge-templates'
    ? location.pathname.startsWith(target.pathname)
    : location.pathname === target.pathname;
  const isActive = isShortcut
    ? location.pathname === target.pathname && location.search === target.search && location.hash === target.hash
    : (matchesInfofolders || matchesModule) && !location.search.includes('focus=') && location.hash !== '#shortcuts';
  return (
    <Link to={item.href} className={[
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive ? 'border-l-[3px] border-primary bg-primary/10 pl-[9px] text-primary' : 'border-l-[3px] border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    ].join(' ')}>
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppSidebar() {
  const { profile, permissions, isAdmin, isSuperAdmin } = useAuth();
  const { hospital } = useHospital();
  const canViewDischarge = isAdmin || isSuperAdmin || !!permissions?.is_physician;
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || 'Gebruiker';

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-20 items-center border-b px-5">
        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight text-primary">OncoInfo</div>
          {hospital?.name && <div className="mt-0.5 truncate text-sm font-medium text-muted-foreground">{hospital.name}</div>}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {primaryItems.filter(item => !item.physicianOnly || canViewDischarge).map(item => <SidebarLink key={item.label} item={item} />)}
        <div className="my-4 border-t" />
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Persoonlijk</div>
        {shortcutItems.map(shortcut => <SidebarLink key={shortcut.label} item={shortcut} />)}
        <div className="my-4 border-t" />
        <div className="px-3 py-2 text-xs text-muted-foreground">Ruimte voor toekomstige tools</div>
      </nav>

      <div className="border-t p-3">
        <NavLink to="/handleiding" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <BookOpenText className="h-4 w-4" /> Handleiding
        </NavLink>
        <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2">
          <div className="truncate text-sm font-semibold capitalize">{displayName}</div>
          <div className="truncate text-[11px] text-muted-foreground">{profile?.function || 'OncoInfo gebruiker'}</div>
        </div>
      </div>
    </aside>
  );
}

export function MobileModuleNav() {
  const { permissions, isAdmin, isSuperAdmin } = useAuth();
  const canViewDischarge = isAdmin || isSuperAdmin || !!permissions?.is_physician;
  return (
    <nav className="flex gap-2 overflow-x-auto border-b bg-card px-3 py-2 lg:hidden">
      {primaryItems.filter(item => !item.physicianOnly || canViewDischarge).map(item => {
        const Icon = item.icon;
        return (
          <NavLink key={item.label} to={item.href} className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${isActive ? 'border-primary bg-primary/10 text-primary' : 'bg-background text-muted-foreground'}`}>
            <Icon className="h-3.5 w-3.5" /> {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
