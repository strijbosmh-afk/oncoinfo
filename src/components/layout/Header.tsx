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

export function Header() {
  const { user, profile, permissions, isAdmin, isApotheker, signOut, loading } = useAuth();

  const isPhysician = permissions?.is_physician ?? false;
  const roleBadge = getRoleBadge(isAdmin, isApotheker, isPhysician);
  const RoleIcon = roleBadge.icon;

  const displayName = profile?.username || user?.email?.split('@')[0] || '';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/home" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary sm:text-2xl">
              OncoInfo – RZ Tienen
            </span>
          </Link>

          {user && displayName && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm font-medium text-foreground capitalize">{displayName}</span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`gap-1 text-xs cursor-default ${roleBadge.className}`}>
                      <RoleIcon className="h-3 w-3" />
                      {roleBadge.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
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
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        <nav className="flex items-center gap-2">
          {user && (
            <Button variant="ghost" asChild>
              <Link to="/drugs">Medicijnen</Link>
            </Button>
          )}
          
          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <User className="h-5 w-5" />
                  {(isAdmin || isApotheker) && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {displayName}
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
            <Button asChild>
              <Link to="/login">Inloggen</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
