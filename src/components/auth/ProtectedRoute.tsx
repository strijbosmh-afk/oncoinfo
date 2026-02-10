import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isApotheker, profile } = useAuth();
  const [passwordChanged, setPasswordChanged] = useState(false);

  const handlePasswordChanged = useCallback(() => {
    setPasswordChanged(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
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
}
