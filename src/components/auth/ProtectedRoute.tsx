import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { Loader2 } from 'lucide-react';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin: _requireAdmin = false }: ProtectedRouteProps) {
  // TODO: TIJDELIJK UITGESCHAKELD — Login bypass voor development
  // Herstel de originele code hieronder om login weer te activeren.
  return <>{children}</>;

  /* ORIGINELE CODE — BEWAARD VOOR HERSTEL
  const { user, loading, isAdmin, isApotheker, isSuperAdmin, profile } = useAuth();
  const { hospital, loading: hospitalLoading } = useHospital();
  const [passwordChanged, setPasswordChanged] = useState(false);

  const handlePasswordChanged = useCallback(() => {
    setPasswordChanged(true);
  }, []);

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
            <h1 className="text-2xl font-bold mb-4">Toegang Geweigerd</h1>
            <p className="text-muted-foreground">
              Uw account is niet gekoppeld aan een actief ziekenhuis. Neem contact op met uw beheerder.
            </p>
          </div>
        </div>
      );
    }
  }

  if (requireAdmin && !isAdmin && !isApotheker) {
    return <Navigate to="/home" replace />;
  }

  const needsPasswordChange = profile && !profile.password_changed && !passwordChanged;

  return (
    <>
      {needsPasswordChange && (
        <ChangePasswordDialog
          open={true}
          onSuccess={handlePasswordChanged}
          userId={user.id}
        />
      )}
      {children}
    </>
  );
  */
}
