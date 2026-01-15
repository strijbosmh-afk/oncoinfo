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
import { Loader2, Plus, Search, Sparkles, Upload } from 'lucide-react';
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

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-2">Admin Portal</h1>
        <p className="text-muted-foreground mb-8">Manage trials and generate AI summaries</p>

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
                    <Sparkles className="h-5 w-5" />
                    AI Generation
                  </CardTitle>
                  <CardDescription>Generate structured summaries using AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" disabled className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Summary (Select trial first)
                  </Button>
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