import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

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

      // Mark password as changed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed: true } as any)
          .eq('user_id', user.id);
      }

      setDone(true);
      toast({
        title: t('resetPassword.changed'),
        description: t('resetPassword.changedDesc'),
      });

      // Sign out and redirect to login after 2s
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/', { replace: true });
      }, 2000);
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message || t('resetPassword.changeError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <Layout>
        <div className="container flex items-center justify-center py-12 min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {t('resetPassword.invalidLink')}
              </p>
              <Button className="w-full mt-4" onClick={() => navigate('/', { replace: true })}>
                {t('resetPassword.backToLogin')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (done) {
    return (
      <Layout>
        <div className="container flex items-center justify-center py-12 min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <Check className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('resetPassword.changed')}</h2>
              <p className="text-muted-foreground">{t('resetPassword.redirecting')}</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container flex items-center justify-center py-12 min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('resetPassword.title')}</CardTitle>
            <CardDescription>
              {t('resetPassword.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  className="h-11"
                />
              </div>

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
                  className="h-11"
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-sm text-destructive">{t('changePassword.mismatch')}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11" disabled={!canSubmit}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('changePassword.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
