import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Shield, Stethoscope, FlaskConical, Eye, Languages, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { useTranslation } from 'react-i18next';
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

function getRoleBadge(isAdmin: boolean, isApotheker: boolean, userFunction: string | null, t: (key: string) => string) {
  if (userFunction === 'arts') return { label: t('roles.arts'), icon: Stethoscope, className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' };
  if (userFunction === 'apotheek' || isApotheker) return { label: t('roles.apotheker'), icon: FlaskConical, className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' };
  if (isAdmin) return { label: t('roles.admin'), icon: Shield, className: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700' };
  if (userFunction === 'verpleegkundige') return { label: t('roles.verpleegkundige'), icon: User, className: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700' };
  return { label: t('roles.viewer'), icon: Eye, className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' };
}

function RightsTooltipContent({ displayName, roleBadge, isAdmin, isApotheker, userFunction, permissions, t }: {
  displayName: string;
  roleBadge: { label: string };
  isAdmin: boolean;
  isApotheker: boolean;
  userFunction: string | null;
  permissions: { can_add_treatments?: boolean; can_modify_treatments?: boolean; can_delete_treatments?: boolean } | null;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-semibold">{displayName} – {roleBadge.label}</p>
      <div className="space-y-0.5">
        <p>{t('header.rights')}:</p>
        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
          {isAdmin && <li>{t('header.fullAccess')}</li>}
          {isApotheker && <li>{t('header.drugManagement')}</li>}
          {userFunction && <li>{t('header.function')}: {userFunction}</li>}
          {permissions?.can_add_treatments && <li>{t('header.addTreatments')}</li>}
          {permissions?.can_modify_treatments && <li>{t('header.modifyTreatments')}</li>}
          {permissions?.can_delete_treatments && <li>{t('header.deleteTreatments')}</li>}
          {!isAdmin && !isApotheker && !permissions?.can_add_treatments && !permissions?.can_modify_treatments && !permissions?.can_delete_treatments && (
            <li>{t('header.readOnly')}</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export function Header() {
  const { user, profile, permissions, isAdmin, isApotheker, isSuperAdmin, signOut, loading } = useAuth();
  const { hospital } = useHospital();
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'nl', label: 'Nederlands' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'English' },
  ];

  const userFunction = profile?.function ?? null;
  const roleBadge = getRoleBadge(isAdmin, isApotheker, userFunction, t);
  const RoleIcon = roleBadge.icon;

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || user?.email?.split('@')[0] || '';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container relative flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4">
        {/* Left: branding */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/home" className="flex items-center gap-2 shrink-0">
            {hospital?.logo_url && (
              <img src={hospital.logo_url} alt={hospital.name} className="h-7 sm:h-8 w-auto" />
            )}
            <span className="text-base font-bold text-primary sm:text-2xl">
              OncoInfo
              {hospital && <span className="hidden xs:inline"> – {hospital.name}</span>}
              {!hospital && <span className="hidden xs:inline"> – RZ Tienen</span>}
            </span>
          </Link>
        </div>

        {/* Center: user name + role — absolute for true center */}
        {user && displayName && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
            <div className="hidden sm:flex items-center gap-2.5">
              <span className="text-base font-semibold text-foreground capitalize truncate max-w-[200px]">{displayName}</span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`gap-1 text-sm cursor-default shrink-0 ${roleBadge.className}`}>
                      <RoleIcon className="h-3.5 w-3.5" />
                      {roleBadge.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <RightsTooltipContent
                      displayName={displayName}
                      roleBadge={roleBadge}
                      isAdmin={isAdmin}
                      isApotheker={isApotheker}
                      userFunction={userFunction}
                      permissions={permissions}
                      t={t}
                    />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex sm:hidden items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-foreground capitalize truncate max-w-[100px]">{displayName}</span>
              <Badge variant="outline" className={`gap-0.5 text-[10px] px-1.5 py-0 h-5 cursor-default shrink-0 ${roleBadge.className}`}>
                <RoleIcon className="h-2.5 w-2.5" />
                <span className="hidden xxs:inline">{roleBadge.label}</span>
              </Badge>
            </div>
          </div>
        )}

        {/* Right: nav */}
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          {user && (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex gap-1.5">
                <Link to="/handleiding">
                  <BookOpen className="h-4 w-4" />
                  {t('nav.manual')}
                </Link>
              </Button>
              {(isAdmin || isApotheker) && (
                <Button variant="outline" size="sm" asChild className="hidden md:inline-flex gap-1.5">
                  <Link to="/admin">
                    <Shield className="h-4 w-4" />
                    {t('nav.admin')}
                  </Link>
                </Button>
              )}
            </>
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
                      userFunction={userFunction}
                      permissions={permissions}
                      t={t}
                    />
                  </div>
                </div>
                <DropdownMenuSeparator />
                {(isAdmin || isApotheker) && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        {t('nav.admin')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/handleiding" className="flex items-center gap-2 cursor-pointer">
                    <BookOpen className="h-4 w-4" />
                    {t('nav.manual')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isSuperAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-3 py-1.5">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Languages className="h-3 w-3" />
                        {t('header.language', 'Taal')}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {languages.map((lang) => (
                          <Button
                            key={lang.code}
                            variant={i18n.language === lang.code ? 'default' : 'outline'}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => { i18n.changeLanguage(lang.code); localStorage.setItem('user-chose-language', 'true'); }}
                          >
                            {lang.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="flex items-center gap-2 cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">{t('auth.login')}</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}