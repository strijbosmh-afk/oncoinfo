import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Shield, Stethoscope, FlaskConical, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function getRoleBadge(isAdmin: boolean, isApotheker: boolean, isPhysician: boolean) {
  if (isPhysician) return { label: 'Arts', icon: Stethoscope, className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' };
  if (isApotheker) return { label: 'Apotheek', icon: FlaskConical, className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' };
  if (isAdmin) return { label: 'Admin', icon: Shield, className: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700' };
  return { label: 'Viewer', icon: Eye, className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' };
}

function RightsTooltipContent({ displayName, roleBadge, isAdmin, isApotheker, isPhysician, permissions }: {
  displayName: string;
  roleBadge: { label: string };
  isAdmin: boolean;
  isApotheker: boolean;
  isPhysician: boolean;
  permissions: { can_add_treatments?: boolean; can_modify_treatments?: boolean; can_delete_treatments?: boolean } | null;
}) {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-semibold">{displayName} – {roleBadge.label}</p>
      <div className="space-y-0.5">
        <p>Rechten:</p>
        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
          {isAdmin && <li>Volledige beheertoegang</li>}
          {isApotheker && <li>Medicijnbeheer</li>}
          {isPhysician && <li>Arts</li>}
          {permissions?.can_add_treatments && <li>Behandelingen toevoegen</li>}
          {permissions?.can_modify_treatments && <li>Behandelingen wijzigen</li>}
          {permissions?.can_delete_treatments && <li>Behandelingen verwijderen</li>}
          {!isAdmin && !isApotheker && !permissions?.can_add_treatments && !permissions?.can_modify_treatments && !permissions?.can_delete_treatments && (
            <li>Alleen lezen</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export function Header() {
  const { user, profile, permissions, isAdmin, isApotheker, signOut, loading } = useAuth();

  const isPhysician = permissions?.is_physician ?? false;
  const roleBadge = getRoleBadge(isAdmin, isApotheker, isPhysician);
  const RoleIcon = roleBadge.icon;

  const displayName = profile?.username || user?.email?.split('@')[0] || '';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4">
        {/* Left: branding + user info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Link to="/home" className="flex items-center gap-2 shrink-0">
            <span className="text-base font-bold text-primary sm:text-2xl">
              OncoInfo
              <span className="hidden xs:inline"> – RZ Tienen</span>
            </span>
          </Link>

          {user && displayName && (
            <>
              {/* Desktop: full name + badge with tooltip */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">|</span>
                <span className="text-sm font-medium text-foreground capitalize truncate max-w-[120px]">{displayName}</span>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className={`gap-1 text-xs cursor-default shrink-0 ${roleBadge.className}`}>
                        <RoleIcon className="h-3 w-3" />
                        {roleBadge.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <RightsTooltipContent
                        displayName={displayName}
                        roleBadge={roleBadge}
                        isAdmin={isAdmin}
                        isApotheker={isApotheker}
                        isPhysician={isPhysician}
                        permissions={permissions}
                      />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Mobile: compact badge only (name shown in dropdown) */}
              <div className="flex sm:hidden items-center gap-1.5 min-w-0">
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-xs font-medium text-foreground capitalize truncate max-w-[60px]">{displayName}</span>
                <Badge variant="outline" className={`gap-0.5 text-[10px] px-1.5 py-0 h-5 cursor-default shrink-0 ${roleBadge.className}`}>
                  <RoleIcon className="h-2.5 w-2.5" />
                  <span className="hidden xxs:inline">{roleBadge.label}</span>
                </Badge>
              </div>
            </>
          )}
        </div>

        {/* Right: nav */}
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          {user && (
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/drugs">Medicijnen</Link>
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="icon" asChild className="sm:hidden h-8 w-8">
              <Link to="/drugs" aria-label="Medicijnen">
                <FlaskConical className="h-4 w-4" />
              </Link>
            </Button>
          )}
          
          {loading ? (
            <div className="h-8 w-8 sm:h-9 sm:w-9 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  {(isAdmin || isApotheker) && (
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-primary" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                {/* User info with role badge in dropdown */}
                <div className="px-3 py-2 space-y-1.5">
                  <p className="text-sm font-medium capitalize">{displayName}</p>
                  <Badge variant="outline" className={`gap-1 text-xs ${roleBadge.className}`}>
                    <RoleIcon className="h-3 w-3" />
                    {roleBadge.label}
                  </Badge>
                  <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t mt-1.5">
                    <RightsTooltipContent
                      displayName={displayName}
                      roleBadge={roleBadge}
                      isAdmin={isAdmin}
                      isApotheker={isApotheker}
                      isPhysician={isPhysician}
                      permissions={permissions}
                    />
                  </div>
                </div>
                <DropdownMenuSeparator />
                {(isAdmin || isApotheker) && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        Beheerportaal
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="flex items-center gap-2 cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Inloggen</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
