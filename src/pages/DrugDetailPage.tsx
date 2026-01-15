import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useDrug } from '@/hooks/useDrugs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Pill, 
  Loader2, 
  AlertTriangle, 
  Info, 
  Stethoscope,
  Clock,
  Shield,
  ExternalLink
} from 'lucide-react';

export default function DrugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: drug, isLoading, error } = useDrug(id || '');

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !drug) {
    return (
      <Layout>
        <div className="container py-12">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive">Medicijn niet gevonden.</p>
              <Link to="/drugs">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Terug naar overzicht
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/drugs">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar medicijnen
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <Pill className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{drug.generic_name}</h1>
            </div>
            {drug.brand_names.length > 0 && (
              <p className="text-lg text-muted-foreground">
                {drug.brand_names.join(', ')}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="default">{drug.drug_class}</Badge>
              {drug.administration_route && (
                <Badge variant="outline">{drug.administration_route}</Badge>
              )}
              {drug.is_on_zvz && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  ZVZ Vergoed
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="dosing">Dosering</TabsTrigger>
            <TabsTrigger value="side-effects">Bijwerkingen</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Mechanism of Action */}
              {drug.mechanism_of_action && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Werkingsmechanisme
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{drug.mechanism_of_action}</p>
                  </CardContent>
                </Card>
              )}

              {/* Indications */}
              {drug.approved_indications && drug.approved_indications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5" />
                      Goedgekeurde Indicaties
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {drug.approved_indications.map((indication, i) => (
                        <li key={i}>{indication}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Disease Areas */}
              {drug.disease_areas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ziektegebieden</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {drug.disease_areas.map((area) => (
                        <Badge key={area} variant="outline">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Common Regimens */}
              {drug.common_regimens && drug.common_regimens.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Veelgebruikte Schema's</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {drug.common_regimens.map((regimen, i) => (
                        <li key={i}>{regimen}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dosing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Doseringsinformatie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {drug.dosing_info ? (
                  <>
                    {drug.dosing_info.standard_dose && (
                      <div>
                        <h4 className="font-medium mb-1">Standaard Dosering</h4>
                        <p className="text-muted-foreground">{drug.dosing_info.standard_dose}</p>
                      </div>
                    )}
                    {drug.dosing_info.frequency && (
                      <div>
                        <h4 className="font-medium mb-1">Frequentie</h4>
                        <p className="text-muted-foreground">{drug.dosing_info.frequency}</p>
                      </div>
                    )}
                    {drug.dosing_info.duration && (
                      <div>
                        <h4 className="font-medium mb-1">Behandelduur</h4>
                        <p className="text-muted-foreground">{drug.dosing_info.duration}</p>
                      </div>
                    )}
                    {drug.dosing_info.dose_adjustments && drug.dosing_info.dose_adjustments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Dosisaanpassingen</h4>
                        <div className="space-y-2">
                          {drug.dosing_info.dose_adjustments.map((adj, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">{adj.condition}:</span>{' '}
                              <span className="text-muted-foreground">{adj.adjustment}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Geen doseringsinformatie beschikbaar.</p>
                )}

                {drug.cycle_length_days && (
                  <div>
                    <h4 className="font-medium mb-1">Cyclusduur</h4>
                    <p className="text-muted-foreground">{drug.cycle_length_days} dagen</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="side-effects" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {drug.side_effects?.common && drug.side_effects.common.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Veel Voorkomende Bijwerkingen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {drug.side_effects.common.map((effect, i) => (
                        <li key={i}>{effect}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {drug.side_effects?.serious && drug.side_effects.serious.length > 0 && (
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Ernstige Bijwerkingen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {drug.side_effects.serious.map((effect, i) => (
                        <li key={i}>{effect}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {drug.contraindications && drug.contraindications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Contra-indicaties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {drug.contraindications.map((contra, i) => (
                      <li key={i}>{contra}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {drug.drug_interactions && drug.drug_interactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Medicijninteracties</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {drug.drug_interactions.map((interaction, i) => (
                      <li key={i}>{interaction}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            {drug.monitoring_requirements && drug.monitoring_requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Vereisten</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {drug.monitoring_requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {drug.patient_counseling_points && drug.patient_counseling_points.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Patiëntvoorlichting</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {drug.patient_counseling_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {drug.reference_links && drug.reference_links.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Referenties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {drug.reference_links.map((link, i) => (
                      <li key={i}>
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {link}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}