import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useTrials, useCreateTrial } from '@/hooks/useTrials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, Sparkles, Upload, RefreshCw, Database, BookOpen, BarChart3, FileText, TrendingUp } from 'lucide-react';
import { DISEASE_AREAS, PHASES, SETTINGS, INTERVENTION_CLASSES } from '@/types/trial';
import { supabase } from '@/integrations/supabase/client';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { data: trials, isLoading: trialsLoading } = useTrials();
  const createTrial = useCreateTrial();
  const { toast } = useToast();
  
  const [pubmedId, setPubmedId] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isUpdatingTrials, setIsUpdatingTrials] = useState(false);
  const [isFetchingResults, setIsFetchingResults] = useState(false);
  const [isRefreshingCTGov, setIsRefreshingCTGov] = useState(false);
  const [isGeneratingBulkAI, setIsGeneratingBulkAI] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [updateDiseaseArea, setUpdateDiseaseArea] = useState<string>('');
  
  const [formData, setFormData] = useState({
    acronym: '',
    title: '',
    disease_area: '',
    phase: '',
    setting: '',
    sample_size: '',
    primary_endpoint: '',
    pubmed_id: '',
    doi: '',
    journal: '',
    publication_year: '',
    abstract: ''
  });

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
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </Layout>
    );
  }

  const handleFetchPubMed = async () => {
    if (!pubmedId.trim()) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-pubmed', {
        body: { pubmedId: pubmedId.trim() }
      });
      if (error) throw error;
      
      setFormData(prev => ({
        ...prev,
        title: data.title || '',
        abstract: data.abstract || '',
        journal: data.journal || '',
        publication_year: data.year?.toString() || '',
        pubmed_id: pubmedId.trim(),
        doi: data.doi || ''
      }));
      
      toast({ title: 'PubMed data fetched', description: 'Review and complete the form' });
    } catch (error) {
      toast({ title: 'Failed to fetch', description: 'Could not retrieve PubMed data', variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTrial.mutateAsync({
        acronym: formData.acronym,
        title: formData.title,
        disease_area: formData.disease_area,
        phase: formData.phase || undefined,
        setting: formData.setting || undefined,
        sample_size: formData.sample_size ? parseInt(formData.sample_size) : undefined,
        primary_endpoint: formData.primary_endpoint || undefined,
        pubmed_id: formData.pubmed_id || undefined,
        doi: formData.doi || undefined,
        journal: formData.journal || undefined,
        publication_year: formData.publication_year ? parseInt(formData.publication_year) : undefined,
        abstract: formData.abstract || undefined
      });
      
      toast({ title: 'Trial created', description: 'The trial has been added successfully' });
      setFormData({ acronym: '', title: '', disease_area: '', phase: '', setting: '', sample_size: '', primary_endpoint: '', pubmed_id: '', doi: '', journal: '', publication_year: '', abstract: '' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create trial', variant: 'destructive' });
    }
  };

  const handleUpdateTrials = async () => {
    setIsUpdatingTrials(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-trials', {
        body: { 
          disease_area: updateDiseaseArea || undefined,
          year_from: 2015 
        }
      });
      
      if (error) throw error;
      
      toast({ 
        title: 'Trials Updated', 
        description: data.message || `Added ${data.added} new trials`
      });
    } catch (error: any) {
      toast({ 
        title: 'Update Failed', 
        description: error.message || 'Failed to update trials', 
        variant: 'destructive' 
      });
    } finally {
      setIsUpdatingTrials(false);
    }
  };

  const handleFetchResults = async (forceRefresh = false) => {
    setIsFetchingResults(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-trial-results', {
        body: { force_refresh: forceRefresh }
      });
      
      if (error) throw error;
      
      toast({ 
        title: 'Resultaten Opgehaald', 
        description: `${data.processed} trials verwerkt. Arms: ${data.results?.reduce((a: number, r: any) => a + r.arms_added, 0) || 0}, Endpoints: ${data.results?.reduce((a: number, r: any) => a + r.endpoints_added, 0) || 0}`
      });
    } catch (error: any) {
      toast({ 
        title: 'Ophalen Mislukt', 
        description: error.message || 'Kon resultaten niet ophalen', 
        variant: 'destructive' 
      });
    } finally {
      setIsFetchingResults(false);
    }
  };

  const handleRefreshCTGovResults = async (onlyMissing = true) => {
    setIsRefreshingCTGov(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-trial-results', {
        body: { 
          only_missing: onlyMissing,
          refresh_all: !onlyMissing
        }
      });
      
      if (error) throw error;
      
      const updated = data.updated || 0;
      const total = data.total || 0;
      
      toast({ 
        title: 'CTGov Resultaten', 
        description: `${updated} van ${total} trials bijgewerkt met CTGov data`
      });
    } catch (error: any) {
      toast({ 
        title: 'Update Mislukt', 
        description: error.message || 'Kon CTGov resultaten niet ophalen', 
        variant: 'destructive' 
      });
    } finally {
      setIsRefreshingCTGov(false);
    }
  };

  const handleBulkGenerateAI = async () => {
    if (!trials || trials.length === 0) {
      toast({ title: 'Geen Trials', description: 'Er zijn geen trials om te analyseren', variant: 'destructive' });
      return;
    }

    setIsGeneratingBulkAI(true);
    setBulkProgress({ current: 0, total: trials.length });
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < trials.length; i++) {
      const trial = trials[i];
      setBulkProgress({ current: i + 1, total: trials.length });
      
      try {
        const { error } = await supabase.functions.invoke('generate-analysis', {
          body: { trial_id: trial.id }
        });
        
        if (error) {
          console.error(`Error generating analysis for ${trial.acronym}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error generating analysis for ${trial.acronym}:`, error);
        errorCount++;
      }

      // Small delay to avoid rate limiting
      if (i < trials.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGeneratingBulkAI(false);
    setBulkProgress({ current: 0, total: 0 });
    
    toast({ 
      title: 'Bulk Analyse Voltooid', 
      description: `${successCount} analyses gegenereerd${errorCount > 0 ? `, ${errorCount} fouten` : ''}`
    });
  };

  // Calculate statistics
  const totalTrials = trials?.length || 0;
  const publishedTrials = trials?.filter(t => t.doi || t.pubmed_id).length || 0;
  const trialsWithResults = trials?.filter(t => t.results_summary).length || 0;
  const trialsWithBoth = trials?.filter(t => (t.doi || t.pubmed_id) && t.results_summary).length || 0;

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-2">Admin Portal</h1>
        <p className="text-muted-foreground mb-8">Manage trials and generate AI summaries</p>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totaal Trials</p>
                  <p className="text-3xl font-bold">{totalTrials}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gepubliceerd</p>
                  <p className="text-3xl font-bold">{publishedTrials}</p>
                  <p className="text-xs text-muted-foreground">{totalTrials > 0 ? Math.round((publishedTrials / totalTrials) * 100) : 0}% van totaal</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Met Resultaten</p>
                  <p className="text-3xl font-bold">{trialsWithResults}</p>
                  <p className="text-xs text-muted-foreground">{totalTrials > 0 ? Math.round((trialsWithResults / totalTrials) * 100) : 0}% van totaal</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compleet</p>
                  <p className="text-3xl font-bold">{trialsWithBoth}</p>
                  <p className="text-xs text-muted-foreground">Gepubliceerd + resultaten</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="add">
          <TabsList>
            <TabsTrigger value="add">Add Trial</TabsTrigger>
            <TabsTrigger value="manage">Manage Trials ({trials?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Import from PubMed
                  </CardTitle>
                  <CardDescription>Enter a PubMed ID to auto-fill trial metadata</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="e.g., 31157964" value={pubmedId} onChange={(e) => setPubmedId(e.target.value)} />
                    <Button onClick={handleFetchPubMed} disabled={isFetching}>
                      {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Fetch
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Auto-Update Trials
                  </CardTitle>
                  <CardDescription>Fetch latest GU oncology trials using AI (2015-present)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Filter by Disease Area (optional)</Label>
                    <Select value={updateDiseaseArea} onValueChange={setUpdateDiseaseArea}>
                      <SelectTrigger>
                        <SelectValue placeholder="All disease areas" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="">All disease areas</SelectItem>
                        {DISEASE_AREAS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleUpdateTrials} disabled={isUpdatingTrials} className="w-full">
                    {isUpdatingTrials ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching for new trials...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Fetch Latest Trials
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Resultaten & Design Ophalen
                  </CardTitle>
                  <CardDescription>Haal resultaten, design summaries, arms en endpoints op uit PubMed abstracts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button onClick={() => handleFetchResults(false)} disabled={isFetchingResults} className="flex-1">
                      {isFetchingResults ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Ophalen...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" />
                          Nieuwe Trials
                        </>
                      )}
                    </Button>
                    <Button onClick={() => handleFetchResults(true)} disabled={isFetchingResults} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Alles Herladen
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Haalt feitelijke gegevens op uit PubMed abstracts en genereert design summaries. "Alles Herladen" vervangt bestaande data.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    CTGov Resultaten Ophalen
                  </CardTitle>
                  <CardDescription>Zoek en koppel trials aan ClinicalTrials.gov en haal resultaten op</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button onClick={() => handleRefreshCTGovResults(true)} disabled={isRefreshingCTGov} className="flex-1">
                      {isRefreshingCTGov ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Zoeken...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" />
                          Trials Zonder Resultaten
                        </>
                      )}
                    </Button>
                    <Button onClick={() => handleRefreshCTGovResults(false)} disabled={isRefreshingCTGov} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Alles Vernieuwen
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Zoekt automatisch naar overeenkomende CTGov studies met verbeterde validatie en haalt resultaten op.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Bulk AI Analyse
                  </CardTitle>
                  <CardDescription>Genereer automatisch AI-analyses voor alle trials</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleBulkGenerateAI} disabled={isGeneratingBulkAI || !trials?.length} className="w-full">
                    {isGeneratingBulkAI ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyseren... ({bulkProgress.current}/{bulkProgress.total})
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Genereer Alle AI Analyses
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Genereert voor elke trial een uitgebreide analyse met sterke/zwakke punten, klinische implicaties en lekensamenvatting. Dit kan enkele minuten duren.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Trial Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acronym">Acronym *</Label>
                      <Input id="acronym" value={formData.acronym} onChange={(e) => setFormData(p => ({ ...p, acronym: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disease">Disease Area *</Label>
                      <Select value={formData.disease_area} onValueChange={(v) => setFormData(p => ({ ...p, disease_area: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select disease" /></SelectTrigger>
                        <SelectContent className="bg-popover">{DISEASE_AREAS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input id="title" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phase">Phase</Label>
                      <Select value={formData.phase} onValueChange={(v) => setFormData(p => ({ ...p, phase: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                        <SelectContent className="bg-popover">{PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setting">Setting</Label>
                      <Select value={formData.setting} onValueChange={(v) => setFormData(p => ({ ...p, setting: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select setting" /></SelectTrigger>
                        <SelectContent className="bg-popover">{SETTINGS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sample_size">Sample Size</Label>
                      <Input id="sample_size" type="number" value={formData.sample_size} onChange={(e) => setFormData(p => ({ ...p, sample_size: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Publication Year</Label>
                      <Input id="year" type="number" value={formData.publication_year} onChange={(e) => setFormData(p => ({ ...p, publication_year: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="journal">Journal</Label>
                      <Input id="journal" value={formData.journal} onChange={(e) => setFormData(p => ({ ...p, journal: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endpoint">Primary Endpoint</Label>
                      <Input id="endpoint" value={formData.primary_endpoint} onChange={(e) => setFormData(p => ({ ...p, primary_endpoint: e.target.value }))} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="abstract">Abstract</Label>
                      <Textarea id="abstract" rows={4} value={formData.abstract} onChange={(e) => setFormData(p => ({ ...p, abstract: e.target.value }))} />
                    </div>
                  </div>
                  <Button type="submit" disabled={createTrial.isPending}>
                    {createTrial.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Plus className="mr-2 h-4 w-4" />
                    Add Trial
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {trialsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : trials && trials.length > 0 ? (
                  <div className="space-y-2">
                    {trials.map(trial => (
                      <div key={trial.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{trial.acronym}</p>
                          <p className="text-sm text-muted-foreground">{trial.disease_area} • {trial.publication_year}</p>
                        </div>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No trials yet. Add your first trial above.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}