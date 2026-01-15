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
  Loader2,
  Printer,
  FileDown,
  Stethoscope,
  BookOpen,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ForestPlot } from '@/components/charts/ForestPlot';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const diseaseColors: Record<string, string> = {
  'Prostate Cancer': 'bg-[hsl(199,89%,32%)]',
  'Bladder Cancer': 'bg-[hsl(174,62%,38%)]',
  'Renal Cell Carcinoma': 'bg-[hsl(25,95%,53%)]',
  'Testicular Cancer': 'bg-[hsl(262,83%,58%)]',
  'Penile Cancer': 'bg-[hsl(340,75%,55%)]'
};

const diseaseLabels: Record<string, string> = {
  'Prostate Cancer': 'Prostaatkanker',
  'Bladder Cancer': 'Blaaskanker',
  'Renal Cell Carcinoma': 'Niercelcarcinoom',
  'Testicular Cancer': 'Testiskanker',
  'Penile Cancer': 'Peniskanker'
};

export default function TrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: trial, isLoading } = useTrial(id!);
  const { data: arms } = useTrialArms(id!);
  const { data: endpoints } = useTrialEndpoints(id!);
  const { data: aiSummaries } = useTrialAISummaries(id!);
  const { toast } = useToast();

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<string>('');
  const [includeDosing, setIncludeDosing] = useState(true);
  const [includeSideEffects, setIncludeSideEffects] = useState(true);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  const laymanSummary = (aiSummaries?.find(s => s.summary_type === 'strengths_weaknesses')?.content as any)?.layman_summary;


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
      toast({ title: 'PDF Gegenereerd', description: 'Patiëntinformatie is klaar om te printen' });
    } catch (error: any) {
      toast({ title: 'Fout', description: error.message || 'PDF genereren mislukt', variant: 'destructive' });
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
          <h1 className="text-2xl font-bold mb-4">Studie niet gevonden</h1>
          <p className="text-muted-foreground mb-6">
            De studie die je zoekt bestaat niet of is verwijderd.
          </p>
          <Button asChild>
            <Link to="/trials">Bekijk Studies</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const hasEndpointsWithHR = endpoints?.some(e => e.hazard_ratio !== null && e.hazard_ratio !== undefined);

  return (
    <Layout>
      <div className="container py-8">
        {/* Terug knop */}
        <Link 
          to="/trials" 
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Terug naar studies
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className={`h-2 w-24 rounded-full ${diseaseColors[trial.disease_area] || 'bg-primary'} mb-4`} />
          <div className="flex items-center gap-3 mb-2">
            {trial.primary_endpoint_met !== null && trial.primary_endpoint_met !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                      trial.primary_endpoint_met ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {trial.primary_endpoint_met ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <XCircle className="h-6 w-6" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{trial.primary_endpoint_met ? 'Primair eindpunt behaald' : 'Primair eindpunt niet behaald'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <h1 className="text-3xl md:text-4xl font-bold">{trial.acronym}</h1>
          </div>
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

          </div>
        </div>

        {/* Navigatie Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="design">Opzet</TabsTrigger>
            <TabsTrigger value="results">Resultaten</TabsTrigger>
            <TabsTrigger value="uitkomst">Uitkomst</TabsTrigger>
            <TabsTrigger value="patient">Patiënt Info</TabsTrigger>
          </TabsList>

          {/* Overzicht Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>In één oogopslag</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Ziekte</p>
                      <p className="font-medium">{diseaseLabels[trial.disease_area] || trial.disease_area}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fase</p>
                      <p className="font-medium">{trial.phase || 'Niet gespecificeerd'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Setting</p>
                      <p className="font-medium">{trial.setting || 'Niet gespecificeerd'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Therapielijn</p>
                      <p className="font-medium">{trial.line_of_therapy || 'Niet gespecificeerd'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Randomisatie</p>
                      <p className="font-medium">{trial.randomization || 'Niet gespecificeerd'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Blindering</p>
                      <p className="font-medium">{trial.blinding || 'Niet gespecificeerd'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Primair Eindpunt</p>
                    <p className="font-medium">{trial.primary_endpoint || 'Niet gespecificeerd'}</p>
                  </div>
                  
                  {trial.secondary_endpoints && trial.secondary_endpoints.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Secundaire Eindpunten</p>
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
                  <CardTitle>Interventies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trial.intervention_classes && trial.intervention_classes.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Interventie Klassen</p>
                      <div className="flex flex-wrap gap-1.5">
                        {trial.intervention_classes.map((cls) => (
                          <Badge key={cls} variant="secondary">{cls}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {trial.drugs && trial.drugs.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Medicijnen</p>
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
                        <p className="text-sm text-muted-foreground mb-2">Behandelarmen</p>
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
                  <CardTitle>Samenvatting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{trial.abstract}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Opzet Tab */}
          <TabsContent value="design" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Studie Opzet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fase</p>
                    <p className="font-medium">{trial.phase || 'Niet gespecificeerd'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type Opzet</p>
                    <p className="font-medium">{trial.design_type || 'Niet gespecificeerd'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Randomisatie</p>
                    <p className="font-medium">{trial.randomization || 'Niet gespecificeerd'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Blindering</p>
                    <p className="font-medium">{trial.blinding || 'Niet gespecificeerd'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Steekproefgrootte</p>
                    <p className="font-medium">{trial.sample_size ? `N=${trial.sample_size.toLocaleString()}` : 'Niet gespecificeerd'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Setting</p>
                    <p className="font-medium">{trial.setting || 'Niet gespecificeerd'}</p>
                  </div>
                </div>
                
                {trial.primary_endpoint && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Primair Eindpunt</p>
                    <p className="font-medium">{trial.primary_endpoint}</p>
                  </div>
                )}
                
                {trial.secondary_endpoints && trial.secondary_endpoints.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Secundaire Eindpunten</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {trial.secondary_endpoints.map((ep, i) => (
                        <li key={i}>{ep}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inclusiecriteria</CardTitle>
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
                    <p className="text-sm text-muted-foreground">Niet beschikbaar</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exclusiecriteria</CardTitle>
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
                    <p className="text-sm text-muted-foreground">Niet beschikbaar</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Resultaten Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resultaten Samenvatting</CardTitle>
                {trial.results_summary?.source && (
                  <CardDescription>
                    Bron: {trial.results_summary.source}
                    {trial.results_summary.nct_id && (
                      <a 
                        href={`https://clinicaltrials.gov/study/${trial.results_summary.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-primary hover:underline"
                      >
                        Bekijk op ClinicalTrials.gov
                      </a>
                    )}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {trial.results_summary ? (
                  <div className="space-y-6">
                    {/* Primair Eindpunt Resultaat */}
                    {(trial.results_summary.hazard_ratio || trial.results_summary.p_value) && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Primair Eindpunt Analyse</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {trial.results_summary.hazard_ratio && (
                            <div>
                              <p className="text-xs text-muted-foreground">Hazard Ratio</p>
                              <p className="text-lg font-bold">
                                {trial.results_summary.hazard_ratio.value?.toFixed(2)}
                              </p>
                              {trial.results_summary.hazard_ratio.ci_lower && trial.results_summary.hazard_ratio.ci_upper && (
                                <p className="text-xs text-muted-foreground">
                                  95% BI: {trial.results_summary.hazard_ratio.ci_lower?.toFixed(2)} - {trial.results_summary.hazard_ratio.ci_upper?.toFixed(2)}
                                </p>
                              )}
                            </div>
                          )}
                          {trial.results_summary.p_value && (
                            <div>
                              <p className="text-xs text-muted-foreground">P-waarde</p>
                              <p className="text-lg font-bold">
                                {trial.results_summary.p_value < 0.001 ? '<0.001' : trial.results_summary.p_value.toFixed(3)}
                              </p>
                            </div>
                          )}
                          {trial.results_summary.median_os_months && (
                            <div>
                              <p className="text-xs text-muted-foreground">Mediane OS</p>
                              <p className="text-lg font-bold">{trial.results_summary.median_os_months} mnd</p>
                            </div>
                          )}
                          {trial.results_summary.median_pfs_months && (
                            <div>
                              <p className="text-xs text-muted-foreground">Mediane PFS</p>
                              <p className="text-lg font-bold">{trial.results_summary.median_pfs_months} mnd</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {trial.results_summary.enrollment && (
                      <div>
                        <p className="text-sm font-medium mb-1">Inclusie</p>
                        <p className="text-sm">{trial.results_summary.enrollment} patiënten</p>
                      </div>
                    )}

                    {trial.results_summary.primary_outcome && (
                      <div>
                        <p className="text-sm font-medium mb-1">Primaire Uitkomst</p>
                        <p className="text-sm">{trial.results_summary.primary_outcome}</p>
                      </div>
                    )}

                    {trial.results_summary.key_findings && trial.results_summary.key_findings.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Belangrijkste Bevindingen</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {trial.results_summary.key_findings.map((finding: string, i: number) => (
                            <li key={i}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {trial.results_summary.conclusions && (
                      <div>
                        <p className="text-sm font-medium mb-1">Conclusies</p>
                        <p className="text-sm">{trial.results_summary.conclusions}</p>
                      </div>
                    )}

                    {/* Primaire Eindpunten van CTGov */}
                    {trial.results_summary.primary_endpoints && trial.results_summary.primary_endpoints.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Primaire Eindpunten</p>
                        <div className="space-y-3">
                          {trial.results_summary.primary_endpoints.map((ep: any, i: number) => (
                            <div key={i} className="p-3 border rounded-lg">
                              <p className="font-medium text-sm">{ep.name}</p>
                              {ep.time_frame && (
                                <p className="text-xs text-muted-foreground">Tijdsframe: {ep.time_frame}</p>
                              )}
                              <div className="flex flex-wrap gap-4 mt-2">
                                {ep.value && (
                                  <span className="text-sm">
                                    <span className="text-muted-foreground">Waarde:</span> {ep.value} {ep.unit || ''}
                                  </span>
                                )}
                                {ep.hr && (
                                  <span className="text-sm">
                                    <span className="text-muted-foreground">HR:</span> {ep.hr.toFixed(2)}
                                    {ep.hr_ci_lower && ep.hr_ci_upper && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        (95% BI: {ep.hr_ci_lower.toFixed(2)}-{ep.hr_ci_upper.toFixed(2)})
                                      </span>
                                    )}
                                  </span>
                                )}
                                {ep.p_value && (
                                  <span className="text-sm">
                                    <span className="text-muted-foreground">p:</span> {ep.p_value < 0.001 ? '<0.001' : ep.p_value.toFixed(3)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Secundaire Eindpunten van CTGov */}
                    {trial.results_summary.secondary_endpoints && trial.results_summary.secondary_endpoints.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Secundaire Eindpunten</p>
                        <div className="space-y-2">
                          {trial.results_summary.secondary_endpoints.slice(0, 5).map((ep: any, i: number) => (
                            <div key={i} className="p-2 border rounded text-sm">
                              <span className="font-medium">{ep.name}</span>
                              {ep.value && <span className="ml-2 text-muted-foreground">Waarde: {ep.value}</span>}
                              {ep.hr && <span className="ml-2 text-muted-foreground">HR: {ep.hr.toFixed(2)}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Resultaten data nog niet beschikbaar.</p>
                    {trial.pubmed_id && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${trial.pubmed_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Bekijk op PubMed
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {trial.safety_highlights && (
              <Card>
                <CardHeader>
                  <CardTitle>Veiligheid Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{trial.safety_highlights}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Uitkomst Tab - Effectieve uitkomst van de studie */}
          <TabsContent value="uitkomst" className="space-y-6">
            {/* Primair Eindpunt Uitkomst */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {trial.primary_endpoint_met !== null && trial.primary_endpoint_met !== undefined && (
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      trial.primary_endpoint_met ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {trial.primary_endpoint_met ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                  )}
                  Primair Eindpunt
                </CardTitle>
                <CardDescription>
                  {trial.primary_endpoint || 'Niet gespecificeerd'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${
                  trial.primary_endpoint_met === true ? 'bg-green-50 border border-green-200' :
                  trial.primary_endpoint_met === false ? 'bg-red-50 border border-red-200' :
                  'bg-muted'
                }`}>
                  <p className="font-semibold text-lg">
                    {trial.primary_endpoint_met === true ? 'Primair eindpunt behaald' :
                     trial.primary_endpoint_met === false ? 'Primair eindpunt niet behaald' :
                     'Uitkomst onbekend'}
                  </p>
                  {trial.results_summary?.conclusions && (
                    <p className="mt-2 text-sm">{trial.results_summary.conclusions}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Kernresultaten */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trial.results_summary?.hazard_ratio && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Hazard Ratio</p>
                    <p className="text-3xl font-bold text-primary">
                      {trial.results_summary.hazard_ratio.value?.toFixed(2)}
                    </p>
                    {trial.results_summary.hazard_ratio.ci_lower && trial.results_summary.hazard_ratio.ci_upper && (
                      <p className="text-sm text-muted-foreground">
                        95% BI: {trial.results_summary.hazard_ratio.ci_lower.toFixed(2)} - {trial.results_summary.hazard_ratio.ci_upper.toFixed(2)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              {trial.results_summary?.p_value && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">P-waarde</p>
                    <p className="text-3xl font-bold text-primary">
                      {trial.results_summary.p_value < 0.001 ? '<0.001' : trial.results_summary.p_value.toFixed(4)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {trial.results_summary.p_value < 0.05 ? 'Statistisch significant' : 'Niet significant'}
                    </p>
                  </CardContent>
                </Card>
              )}
              {trial.results_summary?.median_os_months && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Mediane OS</p>
                    <p className="text-3xl font-bold text-primary">{trial.results_summary.median_os_months}</p>
                    <p className="text-sm text-muted-foreground">maanden</p>
                  </CardContent>
                </Card>
              )}
              {trial.results_summary?.median_pfs_months && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Mediane PFS</p>
                    <p className="text-3xl font-bold text-primary">{trial.results_summary.median_pfs_months}</p>
                    <p className="text-sm text-muted-foreground">maanden</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Belangrijkste Bevindingen */}
            {trial.results_summary?.key_findings && trial.results_summary.key_findings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Belangrijkste Bevindingen</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {trial.results_summary.key_findings.map((finding: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Primaire Uitkomst */}
            {trial.results_summary?.primary_outcome && (
              <Card>
                <CardHeader>
                  <CardTitle>Primaire Uitkomst</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{trial.results_summary.primary_outcome}</p>
                </CardContent>
              </Card>
            )}

            {/* Forest Plot als er HR data is */}
            {endpoints && endpoints.length > 0 && hasEndpointsWithHR && (
              <Card>
                <CardHeader>
                  <CardTitle>Forest Plot</CardTitle>
                  <CardDescription>Visuele weergave van hazard ratios</CardDescription>
                </CardHeader>
                <CardContent>
                  <ForestPlot endpoints={endpoints} />
                </CardContent>
              </Card>
            )}

            {/* Bron */}
            {trial.results_summary?.nct_id && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Databron</p>
                      <p className="font-medium">ClinicalTrials.gov</p>
                    </div>
                    <a 
                      href={`https://clinicaltrials.gov/study/${trial.results_summary.nct_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Bekijk studie
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fallback als geen uitkomstdata beschikbaar */}
            {!trial.results_summary && !trial.primary_endpoint_met && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">Geen uitkomstdata beschikbaar voor deze studie.</p>
                  {trial.pubmed_id && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${trial.pubmed_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Bekijk op PubMed
                    </a>
                  )}
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
                    <p className="text-muted-foreground">
                      Geen patiëntensamenvatting beschikbaar.
                    </p>
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
