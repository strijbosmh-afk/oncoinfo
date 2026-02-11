import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/home', { replace: true });
      }
    });

    // Fetch active hospitals
    supabase
      .from('hospitals')
      .select('id, name, slug, logo_url')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) {
          setHospitals(data);
          if (data.length === 1) setHospitalId(data[0].id);
        }
      });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !hospitalId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('login-with-username', {
        body: { username: username.trim(), password, hospital_id: hospitalId },
      });

      if (error || data?.error) {
        toast({
          title: 'Inloggen mislukt',
          description: data?.error || 'Gebruikersnaam of wachtwoord is onjuist.',
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
            <CardTitle className="text-2xl">Welkom bij OncoInfo</CardTitle>
            <CardDescription>
              Log in om toegang te krijgen tot de medicijnbibliotheek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hospital">Ziekenhuis</Label>
                <Select value={hospitalId} onValueChange={setHospitalId}>
                  <SelectTrigger id="hospital">
                    <SelectValue placeholder="Kies uw ziekenhuis" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Button type="submit" className="w-full" disabled={isLoading || !hospitalId}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Inloggen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
