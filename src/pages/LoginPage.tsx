import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate('/home');
    } catch {
      // Error handled in hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(email, password);
      // Auto login after signup since auto-confirm is enabled
      await signIn(email, password);
      navigate('/home');
    } catch {
      // Error handled in hook
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
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Inloggen</TabsTrigger>
                <TabsTrigger value="signup">Registreren</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-mail</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="uw@email.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Wachtwoord</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Inloggen
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="uw@email.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Wachtwoord</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Account Aanmaken
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

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
