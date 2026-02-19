import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertTriangle, LogIn, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const languageFlags: { code: string; label: string; flag: string }[] = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loggedOutByInactivity, setLoggedOutByInactivity] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const flag = sessionStorage.getItem('logged_out_inactivity');
    if (flag) {
      setLoggedOutByInactivity(true);
      sessionStorage.removeItem('logged_out_inactivity');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/home', { replace: true });
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('login-with-username', {
        body: { username: username.trim(), password },
      });

      if (error || data?.error) {
        toast({
          title: t('auth.loginFailed'),
          description: data?.error || t('auth.loginFailedDescription'),
          variant: 'destructive',
        });
        return;
      }

      const { session } = data;
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      navigate('/home');
    } catch {
      toast({
        title: t('common.error'),
        description: t('auth.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormComplete = username.trim() && password.trim();

  return (
    <Layout>
      <div className="container flex items-center justify-center py-12 sm:py-16 min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-4">
            {/* Language selector at top — always accessible */}
            <div className="flex items-center justify-center gap-1 mb-4">
              <TooltipProvider delayDuration={200}>
                {languageFlags.map((lang) => (
                  <Tooltip key={lang.code}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => { i18n.changeLanguage(lang.code); localStorage.setItem('user-chose-language', 'true'); }}
                        className={`text-xl px-1.5 py-1 rounded-md transition-all ${
                          i18n.language === lang.code
                            ? 'bg-primary/10 ring-1 ring-primary/30 scale-110'
                            : 'opacity-50 hover:opacity-80 hover:bg-muted'
                        }`}
                        aria-label={lang.label}
                      >
                        {lang.flag}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {lang.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
            <CardTitle className="text-2xl">{t('auth.welcome')}</CardTitle>
            <CardDescription>
              {t('auth.loginDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loggedOutByInactivity && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    U bent automatisch uitgelogd wegens inactiviteit. Log opnieuw in om verder te gaan.
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={t('auth.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11"
                  />
                </div>
              </div>

              {/* Primary CTA — prominent, full width */}
              <Button 
                type="submit" 
                className="w-full h-11 text-base gap-2" 
                disabled={isLoading || !isFormComplete}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {t('auth.login')}
              </Button>
            </form>

            {/* Disclaimer — bottom, less prominent */}
            <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t('footer.disclaimerFull')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
