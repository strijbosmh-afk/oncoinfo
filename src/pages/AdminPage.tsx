import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useDrugs } from '@/hooks/useDrugs';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pill, Layers, FileText, Users } from 'lucide-react';
import { DRUG_CLASSES } from '@/types/drug';
import { UserManagement } from '@/components/admin/UserManagement';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { data: drugs, isLoading: drugsLoading } = useDrugs({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');

  // Calculate statistics
  const totalDrugs = drugs?.length || 0;
  const combinationDrugs = drugs?.filter(d => d.drug_class === 'Combinatietherapie').length || 0;
  const individualDrugs = totalDrugs - combinationDrugs;

  // Filter drugs
  const filteredDrugs = useMemo(() => {
    if (!drugs) return [];
    return drugs.filter(drug => {
      const matchesSearch = !searchQuery || 
        drug.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.brand_names?.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesClass = filterClass === 'all' || drug.drug_class === filterClass;
      return matchesSearch && matchesClass;
    });
  }, [drugs, searchQuery, filterClass]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Toegang Geweigerd</h1>
          <p className="text-muted-foreground">Je hebt admin-rechten nodig om deze pagina te bekijken.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-2">Beheerportaal</h1>
        <p className="text-muted-foreground mb-8">Beheer medicijnen en combinatieschema's</p>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totaal Medicijnen</p>
                  <p className="text-3xl font-bold">{totalDrugs}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Pill className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Combinatieschema's</p>
                  <p className="text-3xl font-bold">{combinationDrugs}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Layers className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Individuele Medicijnen</p>
                  <p className="text-3xl font-bold">{individualDrugs}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="drugs">Medicijnen ({totalDrugs})</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" />
              Gebruikers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Medicijnbibliotheek Overzicht</CardTitle>
                <CardDescription>
                  Beheer de medicijnen en combinatieschema's voor oncologie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  De medicijnbibliotheek bevat {totalDrugs} items, waarvan {combinationDrugs} combinatieschema's 
                  en {individualDrugs} individuele medicijnen.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drugs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Medicijnen Beheren</CardTitle>
                <CardDescription>Zoek en bekijk alle medicijnen in de bibliotheek</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input 
                    placeholder="Zoek medicijn..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Alle klassen" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Alle klassen</SelectItem>
                      {DRUG_CLASSES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {drugsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">{filteredDrugs.length} medicijnen gevonden</p>
                    {filteredDrugs.slice(0, 50).map(drug => (
                      <div key={drug.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {drug.drug_class === 'Combinatietherapie' ? (
                            <Layers className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Pill className="h-4 w-4 text-primary" />
                          )}
                          <div>
                            <p className="font-medium">{drug.generic_name}</p>
                            <p className="text-xs text-muted-foreground">{drug.drug_class}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {drug.disease_areas?.join(', ')}
                        </span>
                      </div>
                    ))}
                    {filteredDrugs.length > 50 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        En {filteredDrugs.length - 50} meer...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}