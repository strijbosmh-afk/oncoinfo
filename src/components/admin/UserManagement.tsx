import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserManagement, type ManagedUser } from '@/hooks/useUserManagement';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserDialog, type HospitalOption } from './UserDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, Mail, Shield, Eye, Building2, Filter, KeyRound, UserPlus, ChevronDown, ChevronRight } from 'lucide-react';

export function UserManagement() {
  const { t } = useTranslation();
  const { user: currentUser, isSuperAdmin } = useAuth();
  const { users, isLoading, createUser, updateUser, deleteUser, sendCredentials, resetPassword, updateHospitals } = useUserManagement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [preselectedHospital, setPreselectedHospital] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [credentialsUser, setCredentialsUser] = useState<ManagedUser | null>(null);
  const [credentialsPassword, setCredentialsPassword] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [allHospitals, setAllHospitals] = useState<HospitalOption[]>([]);
  const [openHospitals, setOpenHospitals] = useState<Set<string>>(new Set());

  // Fetch all active hospitals for the dialog dropdown
  useEffect(() => {
    supabase.from('hospitals_public' as any).select('id, name').order('name').then(({ data }) => {
      if (data) setAllHospitals(data.map((h: any) => ({ id: h.id, name: h.name })));
    });
  }, []);

  // Derive unique hospitals and functions for filter dropdowns
  const hospitals = useMemo(() => {
    if (!users) return [];
    const map = new Map<string, string>();
    users.forEach(u => {
      if (u.hospital_id && u.hospital_name) map.set(u.hospital_id, u.hospital_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  const functions = useMemo(() => {
    if (!users) return [];
    const set = new Set<string>();
    users.forEach(u => { if (u.function) set.add(u.function); });
    return Array.from(set).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q);
      const matchesHospital = hospitalFilter === 'all' || u.hospital_id === hospitalFilter;
      const matchesFunction = functionFilter === 'all' || u.function === functionFilter;
      return matchesSearch && matchesHospital && matchesFunction;
    });
  }, [users, searchQuery, hospitalFilter, functionFilter]);

  // Group filtered users by hospital, sorted alphabetically
  const groupedByHospital = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; color?: string; users: ManagedUser[] }>();
    filteredUsers.forEach((u) => {
      const key = u.hospital_id || '__none__';
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: u.hospital_name || 'Geen ziekenhuis',
          color: u.hospital_color || undefined,
          users: [],
        });
      }
      groups.get(key)!.users.push(u);
    });
    // Sort groups alphabetically by hospital name
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredUsers]);

  const toggleHospital = (id: string) => {
    setOpenHospitals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Default: only RZ Tienen is expanded
  useEffect(() => {
    const tienenGroup = groupedByHospital.find(g => g.name.toLowerCase().includes('tienen'));
    setOpenHospitals(new Set(tienenGroup ? [tienenGroup.id] : []));
  }, [groupedByHospital.length]);

  const handleCreate = (preselectedHospitalId?: string) => {
    setDialogMode('create');
    setSelectedUser(null);
    setPreselectedHospital(preselectedHospitalId || null);
    setDialogOpen(true);
  };

  const handleEdit = (user: ManagedUser) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDeleteClick = (user: ManagedUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUser.mutate(userToDelete.id);
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleSendCredentials = (user: ManagedUser) => {
    setCredentialsUser(user);
    setCredentialsPassword('');
    setCredentialsDialogOpen(true);
  };

  const handleSendCredentialsConfirm = () => {
    if (credentialsUser && credentialsPassword.trim()) {
      sendCredentials.mutate({
        user_id: credentialsUser.id,
        email: credentialsUser.email,
        username: credentialsUser.username || undefined,
        password: credentialsPassword.trim(),
        login_url: `${window.location.origin}`,
      });
      setCredentialsDialogOpen(false);
    }
  };

  const handleDialogSubmit = (data: Record<string, unknown>) => {
    if (dialogMode === 'create') {
      createUser.mutate(data as any, { onSuccess: () => setDialogOpen(false) });
    } else {
      updateUser.mutate(data as any, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('userMgmt.never');
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasActiveFilters = hospitalFilter !== 'all' || functionFilter !== 'all';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>{t('userMgmt.title')}</CardTitle>
              <CardDescription>
                {t('userMgmt.description')}
                {users && (
                  <Badge variant="outline" className="ml-2">
                    {filteredUsers.length}{filteredUsers.length !== users.length ? ` / ${users.length}` : ''} {t('userMgmt.users')}
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => handleCreate(hospitalFilter !== 'all' ? hospitalFilter : undefined)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('userMgmt.newUser')}
              </Button>
              {isSuperAdmin && hospitalFilter === 'all' && (
                <Select onValueChange={(id) => handleCreate(id)}>
                  <SelectTrigger className="w-auto gap-2 border-dashed">
                    <UserPlus className="h-4 w-4" />
                    <span>{t('userMgmt.addToHospital')}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {allHospitals.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <Input
              placeholder={t('userMgmt.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Filters - only for super admins */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
                  <SelectTrigger className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder={t('userMgmt.allHospitals')} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('userMgmt.allHospitals')}</SelectItem>
                    {hospitals.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={functionFilter} onValueChange={setFunctionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('userMgmt.allFunctions')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('userMgmt.allFunctions')}</SelectItem>
                    {functions.map(fn => (
                      <SelectItem key={fn} value={fn} className="capitalize">{fn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setHospitalFilter('all'); setFunctionFilter('all'); }}
                    className="text-xs"
                  >
                    {t('userMgmt.clearFilters')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByHospital.map((group) => (
                <Collapsible
                  key={group.id}
                  open={openHospitals.has(group.id)}
                  onOpenChange={() => toggleHospital(group.id)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    {openHospitals.has(group.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: group.color || 'hsl(var(--muted-foreground))' }} />
                    <span className="font-semibold text-sm">{group.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {group.users.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-1.5 ml-6 mt-1">
                      {group.users.map((user) => {
                        const isAdminRole = user.role === 'admin' || user.role === 'super_admin';
                        return (
                          <div
                            key={user.id}
                            className="flex items-center p-2.5 border rounded-lg gap-3"
                          >
                            {/* Avatar */}
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {isAdminRole ? (
                                <Shield className="h-4 w-4 text-primary" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>

                            {/* Name + badges */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium truncate">
                                  {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email}
                                </p>
                                {user.role === 'super_admin' && (
                                  <Badge className="text-[10px] py-0 px-1.5 bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0">
                                    Super Admin
                                  </Badge>
                                )}
                                {user.role === 'admin' && (
                                  <Badge className="text-[10px] py-0 px-1.5 flex-shrink-0">
                                    Admin
                                  </Badge>
                                )}
                                {user.role === 'apotheker' && (
                                  <Badge className="text-[10px] py-0 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0">
                                    Apotheker
                                  </Badge>
                                )}
                                {user.id === currentUser?.id && (
                                  <Badge variant="outline" className="text-[10px] py-0 flex-shrink-0">
                                    {t('userMgmt.you')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.username && <span className="font-medium">{user.username}</span>}
                                {user.username && ' · '}{user.email}
                              </p>
                              <p className="text-[11px] text-muted-foreground/70 truncate">
                                Laatste login: {formatDate(user.last_sign_in_at)}
                              </p>
                            </div>

                            {/* Function + discipline */}
                            <div className="hidden lg:flex w-[180px] justify-end flex-shrink-0">
                              {user.function ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <Badge variant="outline" className={`text-xs capitalize whitespace-nowrap ${
                                    user.function === 'arts' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' :
                                    user.function === 'verpleegkundige' ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700' :
                                    user.function === 'apotheker' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700' : ''
                                  }`}>
                                    {user.function}
                                  </Badge>
                                  {user.discipline && (
                                    <span className="text-[10px] text-muted-foreground capitalize">{user.discipline}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 flex-shrink-0 border-l pl-2 ml-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => { setResetUser(user); setResetDialogOpen(true); }}
                                    disabled={user.id === currentUser?.id}
                                    title={t('userMgmt.resetPassword')}
                                  >
                                    <KeyRound className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('userMgmt.resetPassword')}</TooltipContent>
                              </Tooltip>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSendCredentials(user)} title={t('userMgmt.sendCredentials')}>
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(user)} title={t('common.edit')}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(user)}
                                disabled={user.id === currentUser?.id}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {filteredUsers.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-8">{t('userMgmt.noUsers')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        user={selectedUser}
        onSubmit={handleDialogSubmit}
        onUpdateHospitals={(userId, hospitalIds) => updateHospitals.mutate({ user_id: userId, hospital_ids: hospitalIds })}
        isLoading={createUser.isPending || updateUser.isPending}
        callerIsSuperAdmin={isSuperAdmin}
        hospitals={allHospitals}
        preselectedHospitalId={preselectedHospital || undefined}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('userMgmt.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('userMgmt.deleteDesc', { email: userToDelete?.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send credentials dialog */}
      <AlertDialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('userMgmt.sendCredTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('userMgmt.sendCredDesc', { email: credentialsUser?.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder={t('userMgmt.newPassword')}
              value={credentialsPassword}
              onChange={(e) => setCredentialsPassword(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendCredentialsConfirm}
              disabled={!credentialsPassword.trim() || sendCredentials.isPending}
            >
              {sendCredentials.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('userMgmt.send')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password reset confirmation */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('userMgmt.resetTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('userMgmt.resetDesc', {
                name: `${resetUser?.first_name} ${resetUser?.last_name}`,
                username: resetUser?.username,
                email: resetUser?.email,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resetUser) resetPassword.mutate(resetUser.id);
                setResetDialogOpen(false);
              }}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('userMgmt.resetPassword')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
