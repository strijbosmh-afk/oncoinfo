// Re-export from AuthContext so all existing imports of '@/hooks/useAuth' continue to work.
export { useAuth, AuthProvider } from '@/contexts/AuthContext';
export type { UserPermissions, UserHospital } from '@/contexts/AuthContext';
