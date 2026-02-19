import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  isExpired?: boolean;
}

export function ChangePasswordDialog({ open, onSuccess, userId, isExpired = false }: ChangePasswordDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const PASSWORD_RULES = [
    { label: t('changePassword.ruleLength'), test: (p: string) => p.length >= 8 },
    { label: t('changePassword.ruleUppercase'), test: (p: string) => /[A-Z]/.test(p) },
    { label: t('changePassword.ruleSpecial'), test: (p: string) => /[0-9\W_]/.test(p) },
  ];

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
        title: t('changePassword.success'),
        description: t('changePassword.successDesc'),
      });
      onSuccess();
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message || t('changePassword.error'),
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
          <DialogTitle>{isExpired ? 'Wachtwoord verlopen' : t('changePassword.title')}</DialogTitle>
          <DialogDescription>
            {isExpired
              ? 'Uw account is meer dan 3 dagen oud en het wachtwoord is nog nooit gewijzigd. Stel hieronder een nieuw wachtwoord in om verder te gaan.'
              : t('changePassword.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('changePassword.newPassword')}</Label>
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
            <Label htmlFor="confirm-password">{t('changePassword.confirmPassword')}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-sm text-destructive">{t('changePassword.mismatch')}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('changePassword.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}