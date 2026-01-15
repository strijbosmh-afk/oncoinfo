import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useTrial, useTrialArms, useTrialEndpoints, useTrialAISummaries } from '@/hooks/useTrials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ExternalLink, 
  Users, 
  Calendar, 
  FileText,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ForestPlot } from '@/components/charts/ForestPlot';
import { KaplanMeierPlot } from '@/components/charts/KaplanMeierPlot';
import { EndpointsTable } from '@/components/trials/EndpointsTable';

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
  const { data: arms } = useTrialArms(id!);
  const { data: endpoints } = useTrialEndpoints(id!);
  const { data: aiSummaries } = useTrialAISummaries(id!);

  const designSummary = aiSummaries?.find(s => s.summary_type === 'design');
  const strengthsWeaknesses = aiSummaries?.find(s => s.summary_type === 'strengths_weaknesses');

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

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="survival">Survival Data</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
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
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(designSummary.content, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    AI design summary not yet generated for this trial.
                  </p>
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
                    Export as PDF
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export as Text
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No survival endpoint data available for this trial.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            {strengthsWeaknesses ? (
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
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    AI analysis not yet generated for this trial.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}