import { useState, useMemo } from 'react';
import { useUserManagement, type ManagedUser } from '@/hooks/useUserManagement';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserDialog } from './UserDialog';
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
import { Loader2, Plus, Pencil, Trash2, Mail, Shield, Eye, Building2, Filter } from 'lucide-react';

export function UserManagement() {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const { users, isLoading, createUser, updateUser, deleteUser, sendCredentials } = useUserManagement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [credentialsUser, setCredentialsUser] = useState<ManagedUser | null>(null);
  const [credentialsPassword, setCredentialsPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [functionFilter, setFunctionFilter] = useState<string>('all');

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

  const handleCreate = () => {
    setDialogMode('create');
    setSelectedUser(null);
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
    if (!dateString) return 'Nooit';
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
              <CardTitle>Gebruikersbeheer</CardTitle>
              <CardDescription>
                Beheer accounts en rollen
                {users && (
                  <Badge variant="outline" className="ml-2">
                    {filteredUsers.length}{filteredUsers.length !== users.length ? ` / ${users.length}` : ''} gebruikers
                  </Badge>
                )}
              </CardDescription>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe gebruiker
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <Input
              placeholder="Zoek op naam of e-mail..."
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
                      <SelectValue placeholder="Alle ziekenhuizen" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle ziekenhuizen</SelectItem>
                    {hospitals.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={functionFilter} onValueChange={setFunctionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Alle functies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle functies</SelectItem>
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
                    Filters wissen
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
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {user.role === 'admin' || user.role === 'super_admin' ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email}
                        </p>
                        <Badge
                          variant={user.role === 'admin' || user.role === 'super_admin' ? 'default' : user.role === 'apotheker' ? 'default' : 'secondary'}
                          className={`text-xs flex-shrink-0 ${user.role === 'apotheker' ? 'bg-emerald-600 hover:bg-emerald-700' : ''} ${user.role === 'super_admin' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                        >
                          {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : user.role === 'apotheker' ? 'Apotheker' : 'Viewer'}
                        </Badge>
                        {user.function && (
                          <Badge variant="outline" className="text-xs flex-shrink-0 gap-1 capitalize">
                            {user.function}
                          </Badge>
                        )}
                        {isSuperAdmin && user.hospital_name && (
                          <Badge variant="outline" className="text-xs flex-shrink-0 gap-1 text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {user.hospital_name}
                          </Badge>
                        )}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            Jij
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {user.username && <span className="font-medium">{user.username}</span>}
                        {user.username && ' · '}{user.email} · Laatst ingelogd: {formatDate(user.last_sign_in_at)}
                      </p>
                      {(user.can_add_treatments || user.can_modify_treatments || user.can_delete_treatments) && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {user.can_add_treatments && <Badge variant="outline" className="text-[10px] py-0">+toevoegen</Badge>}
                          {user.can_modify_treatments && <Badge variant="outline" className="text-[10px] py-0">✎wijzigen</Badge>}
                          {user.can_delete_treatments && <Badge variant="outline" className="text-[10px] py-0">×verwijderen</Badge>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleSendCredentials(user)} title="Inloggegevens versturen">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} title="Bewerken">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(user)}
                      disabled={user.id === currentUser?.id}
                      title="Verwijderen"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-8">Geen gebruikers gevonden</p>
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
        isLoading={createUser.isPending || updateUser.isPending}
        callerIsSuperAdmin={isSuperAdmin}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gebruiker verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u <strong>{userToDelete?.email}</strong> wilt verwijderen?
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send credentials dialog */}
      <AlertDialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inloggegevens versturen</AlertDialogTitle>
            <AlertDialogDescription>
              Voer een (nieuw) wachtwoord in voor <strong>{credentialsUser?.email}</strong>.
              Het wachtwoord wordt bijgewerkt en per e-mail verstuurd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Nieuw wachtwoord"
              value={credentialsPassword}
              onChange={(e) => setCredentialsPassword(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendCredentialsConfirm}
              disabled={!credentialsPassword.trim() || sendCredentials.isPending}
            >
              {sendCredentials.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Versturen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
