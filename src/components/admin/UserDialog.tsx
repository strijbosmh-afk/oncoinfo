import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  user?: {
    id: string;
    email: string;
    username?: string;
    first_name?: string | null;
    last_name?: string | null;
    function?: string | null;
    role: 'admin' | 'viewer' | 'apotheker';
    is_physician?: boolean;
    can_add_treatments?: boolean;
    can_delete_treatments?: boolean;
    can_modify_treatments?: boolean;
  } | null;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

export function UserDialog({ open, onOpenChange, mode, user, onSubmit, isLoading }: UserDialogProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userFunction, setUserFunction] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer' | 'apotheker'>('viewer');
  const [sendEmail, setSendEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canModify, setCanModify] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        setEmail(user.email);
        setUsername(user.username || '');
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setUserFunction(user.function || '');
        setRole(user.role);
        setPassword('');
        setShowPassword(false);
        setCanAdd(user.can_add_treatments ?? false);
        setCanDelete(user.can_delete_treatments ?? false);
        setCanModify(user.can_modify_treatments ?? false);
      } else {
        setEmail('');
        setUsername('');
        setFirstName('');
        setLastName('');
        setUserFunction('');
        setPassword(generatePassword());
        setRole('viewer');
        setSendEmail(true);
        setShowPassword(true);
        setCanAdd(false);
        setCanDelete(false);
        setCanModify(false);
      }
      setAttempted(false);
    }
  }, [open, mode, user]);

  // Default: verpleegkundige gets no permissions (only on create or when changing function)
  useEffect(() => {
    if (userFunction === 'verpleegkundige' && mode === 'create') {
      setCanAdd(false);
      setCanDelete(false);
      setCanModify(false);
    }
  }, [userFunction, mode]);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    toast({ title: 'Gekopieerd', description: 'Wachtwoord is naar het klembord gekopieerd.' });
  };

  const handleSubmit = () => {
    setAttempted(true);
    if (!email.trim() || !username.trim() || !firstName.trim() || !lastName.trim() || !userFunction) return;

    if (mode === 'create') {
      if (!password.trim()) return;
      onSubmit({
        email: email.trim(),
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        function: userFunction,
        password: password.trim(),
        role,
        send_email: sendEmail,
        login_url: `${window.location.origin}`,
        can_add_treatments: canAdd,
        can_delete_treatments: canDelete,
        can_modify_treatments: canModify,
      });
    } else {
      const changes: Record<string, unknown> = { user_id: user!.id };
      if (email.trim() !== user!.email) changes.email = email.trim();
      if (username.trim() !== (user!.username || '')) changes.username = username.trim();
      if (password.trim()) changes.password = password.trim();
      if (role !== user!.role) changes.role = role;
      changes.first_name = firstName.trim();
      changes.last_name = lastName.trim();
      changes.function = userFunction;
      changes.can_add_treatments = canAdd;
      changes.can_delete_treatments = canDelete;
      changes.can_modify_treatments = canModify;

      onSubmit(changes);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nieuwe gebruiker aanmaken' : 'Gebruiker bewerken'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="user-firstname">Voornaam *</Label>
              <Input
                id="user-firstname"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="bijv. Jan"
                required
                className={attempted && !firstName.trim() ? 'border-destructive' : ''}
              />
              {attempted && !firstName.trim() && (
                <p className="text-xs text-destructive">Voornaam is verplicht</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-lastname">Naam *</Label>
              <Input
                id="user-lastname"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="bijv. Jansen"
                required
                className={attempted && !lastName.trim() ? 'border-destructive' : ''}
              />
              {attempted && !lastName.trim() && (
                <p className="text-xs text-destructive">Naam is verplicht</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-function">Functie *</Label>
            <Select value={userFunction} onValueChange={setUserFunction}>
              <SelectTrigger className={attempted && !userFunction ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecteer functie" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="arts">Arts</SelectItem>
                <SelectItem value="apotheek">Apotheek</SelectItem>
                <SelectItem value="verpleegkundige">Verpleegkundige</SelectItem>
                <SelectItem value="overige">Overige</SelectItem>
              </SelectContent>
            </Select>
            {attempted && !userFunction && (
              <p className="text-xs text-destructive">Functie is verplicht</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-username">Gebruikersnaam</Label>
            <Input
              id="user-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="bijv. jansen"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">E-mailadres</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@voorbeeld.be"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              {mode === 'create' ? 'Wachtwoord' : 'Nieuw wachtwoord (optioneel)'}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'edit' ? 'Laat leeg om niet te wijzigen' : ''}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={handleCopyPassword} title="Kopieer wachtwoord">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {mode === 'create' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPassword(generatePassword())}
                className="text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Genereer nieuw wachtwoord
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'viewer' | 'apotheker')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="viewer">Viewer — alleen lezen</SelectItem>
                <SelectItem value="apotheker">Apotheker — apotheek toegang</SelectItem>
                <SelectItem value="admin">Admin — volledig beheer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Rechten</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="can-add"
                checked={canAdd}
                onCheckedChange={(checked) => setCanAdd(checked as boolean)}
              />
              <Label htmlFor="can-add" className="text-sm font-normal cursor-pointer">
                Kan behandelingen toevoegen
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="can-modify"
                checked={canModify}
                onCheckedChange={(checked) => setCanModify(checked as boolean)}
              />
              <Label htmlFor="can-modify" className="text-sm font-normal cursor-pointer">
                Kan behandelingen wijzigen
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="can-delete"
                checked={canDelete}
                onCheckedChange={(checked) => setCanDelete(checked as boolean)}
              />
              <Label htmlFor="can-delete" className="text-sm font-normal cursor-pointer">
                Kan behandelingen verwijderen
              </Label>
            </div>
          </div>

          {mode === 'create' && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="send-email"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="send-email" className="text-sm font-normal cursor-pointer">
                Inloggegevens per e-mail versturen
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !email.trim() || !username.trim() || !firstName.trim() || !lastName.trim() || !userFunction || (mode === 'create' && !password.trim())}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === 'create' ? 'Aanmaken' : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
