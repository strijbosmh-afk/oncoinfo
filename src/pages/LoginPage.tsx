import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);
    try {
      // Look up email by username using the security definer function
      const { data: email, error: lookupError } = await supabase.rpc('get_email_by_username', {
        _username: username.trim(),
      });

      if (lookupError || !email) {
        toast({
          title: 'Inloggen mislukt',
          description: 'Gebruikersnaam of wachtwoord is onjuist.',
          variant: 'destructive',
        });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast({
          title: 'Inloggen mislukt',
          description: 'Gebruikersnaam of wachtwoord is onjuist.',
          variant: 'destructive',
        });
        return;
      }

      navigate('/home');
    } catch {
      toast({
        title: 'Fout',
        description: 'Er is een onverwachte fout opgetreden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container flex items-center justify-center py-16 min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold mx-auto mb-4">
              OI
            </div>
            <CardTitle className="text-2xl">Welkom bij OncoInfo</CardTitle>
            <CardDescription>
              Log in om toegang te krijgen tot de medicijnbibliotheek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Gebruikersnaam</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Uw gebruikersnaam"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Inloggen
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/home" className="text-sm text-muted-foreground hover:text-primary">
                Verder bladeren als gast →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
