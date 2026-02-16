import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ManagedUser {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  function: string | null;
  discipline: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  hospital_color: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: 'admin' | 'viewer' | 'apotheker' | 'super_admin';
  is_physician: boolean;
  can_add_treatments: boolean;
  can_delete_treatments: boolean;
  can_modify_treatments: boolean;
  dedicated_nurse_id: string | null;
  dedicated_nurse_name: string | null;
}

async function callManageUsers(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: { action, ...params },
  });

  if (error) {
    // Try to extract a meaningful error message
    const message = typeof error === 'object' && 'message' in error
      ? error.message
      : String(error);
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export function useUserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['managed-users'],
    queryFn: () => callManageUsers('list'),
    select: (data) => (data?.users ?? []) as ManagedUser[],
  });

  const createUser = useMutation({
    mutationFn: (params: {
      email: string;
      username: string;
      password: string;
      role: 'admin' | 'viewer';
      send_email: boolean;
      login_url?: string;
    }) => callManageUsers('create', params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast({
        title: 'Gebruiker aangemaakt',
        description: data?.email_sent
          ? 'Inloggegevens zijn per e-mail verstuurd.'
          : data?.email_error
            ? `Account aangemaakt, maar e-mail versturen is mislukt: ${data.email_error}`
            : 'Gebruiker is succesvol aangemaakt.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij aanmaken', description: error.message, variant: 'destructive' });
    },
  });

  const updateUser = useMutation({
    mutationFn: (params: {
      user_id: string;
      email?: string;
      username?: string;
      password?: string;
      role?: 'admin' | 'viewer';
    }) => callManageUsers('update', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast({ title: 'Gebruiker bijgewerkt', description: 'De wijzigingen zijn opgeslagen.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij bijwerken', description: error.message, variant: 'destructive' });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callManageUsers('delete', { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast({ title: 'Gebruiker verwijderd', description: 'Het account is verwijderd.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij verwijderen', description: error.message, variant: 'destructive' });
    },
  });

  const sendCredentials = useMutation({
    mutationFn: (params: { user_id: string; email: string; username?: string; password: string; login_url: string }) =>
      callManageUsers('send-credentials', params),
    onSuccess: () => {
      toast({ title: 'E-mail verstuurd', description: 'De inloggegevens zijn per e-mail verstuurd.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij versturen', description: error.message, variant: 'destructive' });
    },
  });

  const resetPassword = useMutation({
    mutationFn: (userId: string) => callManageUsers('reset-password', { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast({ title: 'Wachtwoord gereset', description: 'Een nieuw wachtwoord is per e-mail verstuurd. De gebruiker moet dit wijzigen bij de volgende login.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij wachtwoord reset', description: error.message, variant: 'destructive' });
    },
  });

  return {
    users: usersQuery.data,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    createUser,
    updateUser,
    deleteUser,
    sendCredentials,
    resetPassword,
    refetch: usersQuery.refetch,
  };
}
