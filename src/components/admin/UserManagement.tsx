import { useState } from 'react';
import { useUserManagement, type ManagedUser } from '@/hooks/useUserManagement';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Loader2, Plus, Pencil, Trash2, Mail, Shield, Eye } from 'lucide-react';

export function UserManagement() {
  const { user: currentUser } = useAuth();
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

  const filteredUsers = users?.filter((u) =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

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
        password: credentialsPassword.trim(),
        login_url: `${window.location.origin}/login`,
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Gebruikersbeheer</CardTitle>
              <CardDescription>Beheer accounts en rollen</CardDescription>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe gebruiker
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Zoek op e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

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
                      {user.role === 'admin' ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{user.email}</p>
                        <Badge
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className="text-xs flex-shrink-0"
                        >
                          {user.role === 'admin' ? 'Admin' : 'Viewer'}
                        </Badge>
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            Jij
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Laatst ingelogd: {formatDate(user.last_sign_in_at)}
                      </p>
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
