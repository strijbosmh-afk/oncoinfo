import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';

interface ChangePasswordDialogProps {
  open: boolean;
  onSuccess: () => void;
  userId: string;
}

const PASSWORD_RULES = [
  { label: 'Minimaal 8 tekens', test: (p: string) => p.length >= 8 },
  { label: 'Minimaal 1 hoofdletter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Minimaal 1 cijfer of speciaal teken', test: (p: string) => /[0-9\W_]/.test(p) },
];

export function ChangePasswordDialog({ open, onSuccess, userId }: ChangePasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allRulesPassed && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Mark password as changed in profile
      await supabase
        .from('profiles')
        .update({ password_changed: true } as any)
        .eq('user_id', userId);

      toast({
        title: 'Wachtwoord gewijzigd',
        description: 'Uw wachtwoord is succesvol bijgewerkt.',
      });
      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Fout',
        description: err.message || 'Kon wachtwoord niet wijzigen.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Wijzig uw wachtwoord</DialogTitle>
          <DialogDescription>
            U logt voor het eerst in. Kies een nieuw wachtwoord dat voldoet aan onderstaande eisen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nieuw wachtwoord</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>

          {/* Password rules checklist */}
          <ul className="space-y-1 text-sm">
            {PASSWORD_RULES.map((rule) => {
              const passed = rule.test(password);
              return (
                <li key={rule.label} className="flex items-center gap-2">
                  {passed ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={passed ? 'text-primary' : 'text-muted-foreground'}>
                    {rule.label}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Bevestig wachtwoord</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-sm text-destructive">Wachtwoorden komen niet overeen.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Wachtwoord opslaan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
