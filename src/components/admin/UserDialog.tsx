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
  user?: { id: string; email: string; role: 'admin' | 'viewer' } | null;
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
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [sendEmail, setSendEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        setEmail(user.email);
        setRole(user.role);
        setPassword('');
        setShowPassword(false);
      } else {
        setEmail('');
        setPassword(generatePassword());
        setRole('viewer');
        setSendEmail(true);
        setShowPassword(true);
      }
    }
  }, [open, mode, user]);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    toast({ title: 'Gekopieerd', description: 'Wachtwoord is naar het klembord gekopieerd.' });
  };

  const handleSubmit = () => {
    if (!email.trim()) return;

    if (mode === 'create') {
      if (!password.trim()) return;
      onSubmit({
        email: email.trim(),
        password: password.trim(),
        role,
        send_email: sendEmail,
        login_url: `${window.location.origin}/login`,
      });
    } else {
      const changes: Record<string, unknown> = { user_id: user!.id };
      if (email.trim() !== user!.email) changes.email = email.trim();
      if (password.trim()) changes.password = password.trim();
      if (role !== user!.role) changes.role = role;

      // Only submit if there are actual changes
      if (Object.keys(changes).length <= 1) {
        onOpenChange(false);
        return;
      }
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
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'viewer')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="viewer">Viewer — alleen lezen</SelectItem>
                <SelectItem value="admin">Admin — volledig beheer</SelectItem>
              </SelectContent>
            </Select>
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
            disabled={isLoading || !email.trim() || (mode === 'create' && !password.trim())}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === 'create' ? 'Aanmaken' : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
