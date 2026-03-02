import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isApotheker, isSuperAdmin, profile, permissions } = useAuth();
  const { hospital, loading: hospitalLoading } = useHospital();
  const { t } = useTranslation();
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [showSuperAdminWarning, setShowSuperAdminWarning] = useState(false);

  const handlePasswordChanged = useCallback(() => {
    setPasswordChanged(true);
  }, []);

  // Show super admin warning once per session (skip for the primary admin account)
  useEffect(() => {
    if (isSuperAdmin && user && profile?.username !== 'admin') {
      const key = `sa_warning_shown_${user.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, 'true');
        setShowSuperAdminWarning(true);
      }
    }
  }, [isSuperAdmin, user, profile?.username]);

  if (loading || hospitalLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Enforce hospital isolation: user must belong to an active hospital (super_admins exempt)
  if (!isSuperAdmin) {
    if (!profile?.hospital_id || !hospital || !hospital.is_active) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-2xl font-bold mb-4">{t('auth.accessDenied')}</h1>
            <p className="text-muted-foreground">
              {t('auth.noHospitalLinked')}
            </p>
          </div>
        </div>
      );
    }
  }

  if (requireAdmin && !isAdmin && !isApotheker && !permissions?.can_add_treatments && !permissions?.can_modify_treatments && !permissions?.can_delete_treatments) {
    return <Navigate to="/home" replace />;
  }

  const needsPasswordChange = profile && !profile.password_changed && !passwordChanged;
  const isAccountExpired = needsPasswordChange && profile?.created_at
    ? (Date.now() - new Date(profile.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <>
      {showSuperAdminWarning && (
        <Dialog open={showSuperAdminWarning} onOpenChange={setShowSuperAdminWarning}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                </div>
                <DialogTitle className="text-lg">Super Admin Modus</DialogTitle>
              </div>
              <DialogDescription className="text-left space-y-2 pt-2">
                <p>U bent ingelogd als <strong>Super Admin</strong>. Dit geeft u toegang tot:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Alle ziekenhuizen en hun instellingen</li>
                  <li>Alle gebruikersaccounts en rollen</li>
                  <li>Alle behandelschema's en data</li>
                  <li>Systeembrede configuratie</li>
                </ul>
                <p className="text-sm font-medium text-destructive pt-1">
                  Wees voorzichtig — wijzigingen zijn direct van toepassing op alle tenants.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowSuperAdminWarning(false)} className="w-full">
                Ik begrijp het, doorgaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {needsPasswordChange && (
        <ChangePasswordDialog
          open={true}
          onSuccess={handlePasswordChanged}
          userId={user.id}
          isExpired={isAccountExpired}
        />
      )}
      {children}
    </>
  );
}
