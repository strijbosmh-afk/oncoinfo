import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

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
  phone_number: string | null;
  linked_hospital_ids: string[];
}

async function callManageUsers(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: { action, ...params },
  });

  if (error) {
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
  const { t } = useTranslation();
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
        title: t('userMgmt.userCreated'),
        description: data?.email_sent
          ? t('userMgmt.userCreatedEmailSent')
          : data?.email_error
            ? t('userMgmt.userCreatedEmailFailed', { error: data.email_error })
            : t('userMgmt.userCreatedSuccess'),
      });
    },
    onError: (error: Error) => {
      toast({ title: t('userMgmt.createError'), description: error.message, variant: 'destructive' });
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
      toast({ title: t('userMgmt.userUpdated'), description: t('userMgmt.userUpdatedDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('userMgmt.updateError'), description: error.message, variant: 'destructive' });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callManageUsers('delete', { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast({ title: t('userMgmt.userDeleted'), description: t('userMgmt.userDeletedDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('userMgmt.deleteError'), description: error.message, variant: 'destructive' });
    },
  });

  const sendCredentials = useMutation({
    mutationFn: (params: { user_id: string; email: string; username?: string; password: string; login_url: string }) =>
      callManageUsers('send-credentials', params),
    onSuccess: () => {
      toast({ title: t('userMgmt.emailSent'), description: t('userMgmt.emailSentDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('userMgmt.sendError'), description: error.message, variant: 'destructive' });
    },
  });

  const resetPassword = useMutation({
    mutationFn: (userId: string) => callManageUsers('reset-password', { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast({ title: t('userMgmt.passwordReset'), description: t('userMgmt.passwordResetDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('userMgmt.passwordResetError'), description: error.message, variant: 'destructive' });
    },
  });

  const updateHospitals = useMutation({
    mutationFn: (params: { user_id: string; hospital_ids: string[] }) =>
      callManageUsers('update-hospitals', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      toast({ title: t('userMgmt.hospitalsUpdated'), description: t('userMgmt.hospitalsUpdatedDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('userMgmt.hospitalsUpdateError'), description: error.message, variant: 'destructive' });
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
    updateHospitals,
    refetch: usersQuery.refetch,
  };
}
