import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useTrial, useTrialArms, useTrialEndpoints, useTrialAISummaries } from '@/hooks/useTrials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, 
  ExternalLink, 
  Users, 
  Calendar, 
  FileText,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Printer,
  FileDown,
  RefreshCw,
  Stethoscope,
  BookOpen
} from 'lucide-react';
import { ForestPlot } from '@/components/charts/ForestPlot';
import { KaplanMeierPlot } from '@/components/charts/KaplanMeierPlot';
import { EndpointsTable } from '@/components/trials/EndpointsTable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const diseaseColors: Record<string, string> = {
  'Prostate Cancer': 'bg-[hsl(199,89%,32%)]',
  'Bladder Cancer': 'bg-[hsl(174,62%,38%)]',
  'Renal Cell Carcinoma': 'bg-[hsl(25,95%,53%)]',
  'Testicular Cancer': 'bg-[hsl(262,83%,58%)]',
  'Penile Cancer': 'bg-[hsl(340,75%,55%)]'
};

export default function TrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: trial, isLoading } = useTrial(id!);
  const { data: arms, refetch: refetchArms } = useTrialArms(id!);
  const { data: endpoints, refetch: refetchEndpoints } = useTrialEndpoints(id!);
  const { data: aiSummaries, refetch: refetchSummaries } = useTrialAISummaries(id!);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSeedingData, setIsSeedingData] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<string>('');
  const [includeDosing, setIncludeDosing] = useState(true);
  const [includeSideEffects, setIncludeSideEffects] = useState(true);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  const designSummary = aiSummaries?.find(s => s.summary_type === 'design');
  const strengthsWeaknesses = aiSummaries?.find(s => s.summary_type === 'strengths_weaknesses');
  const laymanSummary = (strengthsWeaknesses?.content as any)?.layman_summary;
  const clinicalImplications = (strengthsWeaknesses?.content as any)?.clinical_implications;

  const handleGenerateAnalysis = async () => {
    if (!id) return;
    setIsGeneratingAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-analysis', {
        body: { trial_id: id }
      });
      if (error) throw error;
      
      await refetchSummaries();
      toast({ title: 'Analysis Generated', description: 'AI analysis has been created successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate analysis', variant: 'destructive' });
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const handleSeedTrialData = async () => {
    if (!id) return;
    setIsSeedingData(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-trial-data', {
        body: { trial_id: id }
      });
      if (error) throw error;
      
      if (data.skipped) {
        toast({ title: 'Already Has Data', description: 'This trial already has arms and endpoints data' });
      } else {
        await refetchArms();
        await refetchEndpoints();
        toast({ title: 'Data Generated', description: `Added ${data.arms_added} arms and ${data.endpoints_added} endpoints` });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate data', variant: 'destructive' });
    } finally {
      setIsSeedingData(false);
    }
  };

  const handleGeneratePatientPdf = async () => {
    if (!id) return;
    setIsGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-patient-pdf', {
        body: { 
          trial_id: id,
          drug_name: selectedDrug || undefined,
          include_dosing: includeDosing,
          include_side_effects: includeSideEffects
        }
      });
      if (error) throw error;
      
      // Open print dialog with generated HTML
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
      
      setPdfDialogOpen(false);
      toast({ title: 'PDF Generated', description: 'Patient information document is ready to print' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportLaymanSummary = () => {
    if (!laymanSummary || !trial) return;
    
    const content = `
${trial.acronym} - Patiëntensamenvatting
========================================

${laymanSummary}

---
Gebaseerd op: ${trial.title}
Gepubliceerd: ${trial.publication_year || 'Datum onbekend'}
${trial.journal ? `Tijdschrift: ${trial.journal}` : ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trial.acronym}_samenvatting.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exported', description: 'Layman summary downloaded' });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!trial) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Trial not found</h1>
          <p className="text-muted-foreground mb-6">
            The trial you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/trials">Browse Trials</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const hasEndpointsWithHR = endpoints?.some(e => e.hazard_ratio !== null && e.hazard_ratio !== undefined);
  const hasTimepoints = endpoints?.some(e => e.survival_timepoints && e.survival_timepoints.length > 0);
  const hasArmsOrEndpoints = (arms && arms.length > 0) || (endpoints && endpoints.length > 0);

  return (
    <Layout>
      <div className="container py-8">
        {/* Back button */}
        <Link 
          to="/trials" 
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to trials
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className={`h-2 w-24 rounded-full ${diseaseColors[trial.disease_area] || 'bg-primary'} mb-4`} />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{trial.acronym}</h1>
          <p className="text-lg text-muted-foreground mb-4">{trial.title}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge>{trial.disease_area}</Badge>
            {trial.phase && <Badge variant="secondary">{trial.phase}</Badge>}
            {trial.setting && <Badge variant="outline">{trial.setting}</Badge>}
            {trial.line_of_therapy && <Badge variant="outline">{trial.line_of_therapy}</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            {trial.sample_size && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                N={trial.sample_size.toLocaleString()}
              </span>
            )}
            {trial.publication_year && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {trial.publication_year}
              </span>
            )}
            {trial.journal && (
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {trial.journal}
              </span>
            )}
            {trial.doi && (
              <a
                href={`https://doi.org/${trial.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                DOI
              </a>
            )}
            {trial.pubmed_id && (
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${trial.pubmed_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                PubMed
              </a>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print Patiëntinformatie
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Patiëntinformatie Genereren
                  </DialogTitle>
                  <DialogDescription>
                    Genereer een informatiebrief in het Nederlands voor de patiënt over het voorgeschreven medicijn.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Selecteer medicijn</Label>
                    <Select value={selectedDrug} onValueChange={setSelectedDrug}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kies een medicijn..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {trial.drugs?.map(drug => (
                          <SelectItem key={drug} value={drug}>{drug}</SelectItem>
                        )) || <SelectItem value="">Geen medicijnen gevonden</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="dosing" 
                        checked={includeDosing} 
                        onCheckedChange={(checked) => setIncludeDosing(checked as boolean)} 
                      />
                      <Label htmlFor="dosing">Inclusief dosering en toediening</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sideEffects" 
                        checked={includeSideEffects} 
                        onCheckedChange={(checked) => setIncludeSideEffects(checked as boolean)} 
                      />
                      <Label htmlFor="sideEffects">Inclusief bijwerkingen</Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleGeneratePatientPdf} disabled={isGeneratingPdf}>
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Genereren...
                      </>
                    ) : (
                      <>
                        <Printer className="mr-2 h-4 w-4" />
                        Genereren & Printen
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {laymanSummary && (
              <Button variant="outline" className="gap-2" onClick={handleExportLaymanSummary}>
                <BookOpen className="h-4 w-4" />
                Export Samenvatting
              </Button>
            )}

            {!hasArmsOrEndpoints && (
              <Button variant="outline" className="gap-2" onClick={handleSeedTrialData} disabled={isSeedingData}>
                {isSeedingData ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Generate Arms & Endpoints
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="survival">Survival Data</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="patient">Patiënt Info</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>At a Glance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Disease</p>
                      <p className="font-medium">{trial.disease_area}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phase</p>
                      <p className="font-medium">{trial.phase || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Setting</p>
                      <p className="font-medium">{trial.setting || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Line of Therapy</p>
                      <p className="font-medium">{trial.line_of_therapy || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Randomization</p>
                      <p className="font-medium">{trial.randomization || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Blinding</p>
                      <p className="font-medium">{trial.blinding || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Primary Endpoint</p>
                    <p className="font-medium">{trial.primary_endpoint || 'Not specified'}</p>
                  </div>
                  
                  {trial.secondary_endpoints && trial.secondary_endpoints.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Secondary Endpoints</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {trial.secondary_endpoints.map((endpoint, i) => (
                          <li key={i}>{endpoint}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interventions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trial.intervention_classes && trial.intervention_classes.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Intervention Classes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {trial.intervention_classes.map((cls) => (
                          <Badge key={cls} variant="secondary">{cls}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {trial.drugs && trial.drugs.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Drugs</p>
                      <div className="flex flex-wrap gap-1.5">
                        {trial.drugs.map((drug) => (
                          <Badge key={drug} variant="outline">{drug}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {trial.biomarkers && trial.biomarkers.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Biomarkers</p>
                      <div className="flex flex-wrap gap-1.5">
                        {trial.biomarkers.map((marker) => (
                          <Badge key={marker} variant="outline">{marker}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {arms && arms.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Treatment Arms</p>
                        <div className="space-y-2">
                          {arms.map((arm) => (
                            <div key={arm.id} className="text-sm">
                              <p className="font-medium">{arm.name}</p>
                              {arm.description && (
                                <p className="text-muted-foreground">{arm.description}</p>
                              )}
                              {arm.sample_size && (
                                <p className="text-xs text-muted-foreground">n={arm.sample_size}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {trial.abstract && (
              <Card>
                <CardHeader>
                  <CardTitle>Abstract</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{trial.abstract}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-6">
            {designSummary ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI-Generated Design Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This summary was generated by AI based on the trial data. 
                    Review original sources for clinical decisions.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(designSummary.content as Record<string, any>).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="font-medium">
                          {Array.isArray(value) ? value.join(', ') : String(value || 'N/A')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    AI design summary not yet generated for this trial.
                  </p>
                  <Button onClick={handleGenerateAnalysis} disabled={isGeneratingAnalysis}>
                    {isGeneratingAnalysis ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate AI Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inclusion Criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  {trial.inclusion_criteria ? (
                    <div className="space-y-3">
                      {Object.entries(trial.inclusion_criteria).map(([category, items]) => (
                        <div key={category}>
                          <p className="text-sm font-medium capitalize mb-1">
                            {category.replace(/_/g, ' ')}
                          </p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                            {(items as string[])?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exclusion Criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  {trial.exclusion_criteria ? (
                    <div className="space-y-3">
                      {Object.entries(trial.exclusion_criteria).map(([category, items]) => (
                        <div key={category}>
                          <p className="text-sm font-medium capitalize mb-1">
                            {category.replace(/_/g, ' ')}
                          </p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                            {(items as string[])?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Results Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {trial.results_summary ? (
                  <div className="space-y-4">
                    {trial.results_summary.enrollment && (
                      <div>
                        <p className="text-sm font-medium mb-1">Enrollment</p>
                        <p className="text-sm">{trial.results_summary.enrollment} patients</p>
                      </div>
                    )}
                    {trial.results_summary.primary_outcome && (
                      <div>
                        <p className="text-sm font-medium mb-1">Primary Outcome</p>
                        <p className="text-sm">{trial.results_summary.primary_outcome}</p>
                      </div>
                    )}
                    {trial.results_summary.key_findings && (
                      <div>
                        <p className="text-sm font-medium mb-1">Key Findings</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {trial.results_summary.key_findings.map((finding, i) => (
                            <li key={i}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {trial.results_summary.conclusions && (
                      <div>
                        <p className="text-sm font-medium mb-1">Conclusions</p>
                        <p className="text-sm">{trial.results_summary.conclusions}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Results summary not available</p>
                )}
              </CardContent>
            </Card>

            {trial.safety_highlights && (
              <Card>
                <CardHeader>
                  <CardTitle>Safety Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{trial.safety_highlights}</p>
                </CardContent>
              </Card>
            )}

            {clinicalImplications && clinicalImplications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Clinical Implications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {clinicalImplications.map((implication: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {implication}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Survival Data Tab */}
          <TabsContent value="survival" className="space-y-6">
            {endpoints && endpoints.length > 0 ? (
              <>
                <EndpointsTable endpoints={endpoints} arms={arms || []} />
                
                {hasEndpointsWithHR && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Forest Plot - Hazard Ratios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ForestPlot endpoints={endpoints} />
                    </CardContent>
                  </Card>
                )}

                {hasTimepoints && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Reconstructed Kaplan-Meier Curves</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        These curves are reconstructed from reported survival rates at specific timepoints.
                        They may not exactly match the original publication.
                      </p>
                      <KaplanMeierPlot endpoints={endpoints} />
                    </CardContent>
                  </Card>
                )}

                {trial.original_km_plot_url && trial.is_open_access && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Original Publication Plot</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img 
                        src={trial.original_km_plot_url} 
                        alt="Original Kaplan-Meier plot from publication"
                        className="max-w-full rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Source: Original open-access publication
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export as CSV
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    No survival endpoint data available for this trial.
                  </p>
                  <Button onClick={handleSeedTrialData} disabled={isSeedingData}>
                    {isSeedingData ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Arms & Endpoints Data
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            {strengthsWeaknesses ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI-Generated Strengths & Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      This analysis was generated by AI based on the trial data and design.
                      Review with clinical judgment.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-3">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Strengths
                        </h4>
                        <ul className="space-y-2">
                          {((strengthsWeaknesses.content as any)?.strengths || []).map((strength: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-3">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          Weaknesses
                        </h4>
                        <ul className="space-y-2">
                          {((strengthsWeaknesses.content as any)?.weaknesses || []).map((weakness: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-amber-600 mt-1">•</span>
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(strengthsWeaknesses.content as any)?.overall_assessment && (
                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Overall Assessment</h4>
                        <p className="text-sm">{(strengthsWeaknesses.content as any).overall_assessment}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button variant="outline" onClick={handleGenerateAnalysis} disabled={isGeneratingAnalysis}>
                  {isGeneratingAnalysis ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Analysis
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    AI analysis not yet generated for this trial.
                  </p>
                  <Button onClick={handleGenerateAnalysis} disabled={isGeneratingAnalysis}>
                    {isGeneratingAnalysis ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Analysis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate AI Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Patient Info Tab */}
          <TabsContent value="patient" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Patiëntensamenvatting
                </CardTitle>
                <CardDescription>
                  Een begrijpelijke samenvatting van dit onderzoek voor patiënten
                </CardDescription>
              </CardHeader>
              <CardContent>
                {laymanSummary ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{laymanSummary}</p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" className="gap-2" onClick={handleExportLaymanSummary}>
                        <FileDown className="h-4 w-4" />
                        Download als tekst
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Geen patiëntensamenvatting beschikbaar. Genereer eerst een AI-analyse.
                    </p>
                    <Button onClick={handleGenerateAnalysis} disabled={isGeneratingAnalysis}>
                      {isGeneratingAnalysis ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Genereren...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Genereer Samenvatting
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-primary" />
                  Patiëntinformatie PDF
                </CardTitle>
                <CardDescription>
                  Genereer een informatiebrief over het voorgeschreven medicijn om mee te geven aan de patiënt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm">
                    Maak een informatiebrief in het Nederlands met details over het medicijn, 
                    onderzoeksresultaten, dosering en mogelijke bijwerkingen.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Selecteer medicijn</Label>
                      <Select value={selectedDrug} onValueChange={setSelectedDrug}>
                        <SelectTrigger>
                          <SelectValue placeholder="Kies een medicijn..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {trial.drugs?.map(drug => (
                            <SelectItem key={drug} value={drug}>{drug}</SelectItem>
                          )) || <SelectItem value="">Geen medicijnen</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="dosing2" 
                        checked={includeDosing} 
                        onCheckedChange={(checked) => setIncludeDosing(checked as boolean)} 
                      />
                      <Label htmlFor="dosing2">Dosering</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sideEffects2" 
                        checked={includeSideEffects} 
                        onCheckedChange={(checked) => setIncludeSideEffects(checked as boolean)} 
                      />
                      <Label htmlFor="sideEffects2">Bijwerkingen</Label>
                    </div>
                  </div>

                  <Button onClick={handleGeneratePatientPdf} disabled={isGeneratingPdf} className="gap-2">
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Genereren...
                      </>
                    ) : (
                      <>
                        <Printer className="mr-2 h-4 w-4" />
                        Genereer & Print PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
