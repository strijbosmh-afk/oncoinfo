import { useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useDrug } from '@/hooks/useDrugs';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { PatientFolderEditor } from '@/components/drugs/PatientFolderEditor';
import { 
  ArrowLeft, 
  Pill, 
  Loader2, 
  AlertTriangle, 
  Info, 
  Stethoscope,
  Clock,
  Shield,
  ExternalLink,
  Star,
  FileText,
  Settings2,
  Printer
} from 'lucide-react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const PHYSICIANS = ['Dr. M. Strijbos', 'Dr. A. Caeyman'] as const;
const NURSES = ['Mireille Pycke'] as const;

export default function DrugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: drug, isLoading, error } = useDrug(id || '');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [includeDosing, setIncludeDosing] = useState(true);
  const [includeSideEffects, setIncludeSideEffects] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Staff selection state
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [selectedPhysician, setSelectedPhysician] = useState<string>(PHYSICIANS[0]);
  const [nurseSelection, setNurseSelection] = useState<string>(NURSES[0]);
  const [customNurse, setCustomNurse] = useState('');
  const [isNurseCustom, setIsNurseCustom] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'nl' | 'fr'>('nl');

  const fetchPatientInfo = useCallback(async (physicianName?: string, nurseName?: string, language: 'nl' | 'fr' = 'nl') => {
    if (!drug) return;
    
    setIsGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-drug-patient-info', {
        body: { 
          drug_id: drug.id, 
          include_dosing: includeDosing, 
          include_side_effects: includeSideEffects,
          physician_name: physicianName || '',
          nurse_name: nurseName || '',
          language
        }
      });

      if (error) throw error;
      setPreviewHtml(data.html);
    } catch (err) {
      console.error('Error generating patient info:', err);
      toast.error('Fout bij genereren patiëntenfolder');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [drug, includeDosing, includeSideEffects]);

  const handleOpenStaffDialog = () => {
    setIsStaffDialogOpen(true);
  };

  const handleConfirmStaff = async () => {
    setIsStaffDialogOpen(false);
    const nurseName = isNurseCustom ? customNurse.trim() : nurseSelection;
    await fetchPatientInfo(selectedPhysician, nurseName, selectedLanguage);
    setIsPreviewOpen(true);
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewHtml || !drug) return;
    
    setIsDownloading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      
      // Parse the full HTML to extract both styles and body content
      const parser = new DOMParser();
      const doc = parser.parseFromString(previewHtml, 'text/html');
      
      if (!doc.body) {
        throw new Error('Could not parse HTML content');
      }
      
      // Create a container with an iframe to render the full HTML with styles
      const tempIframe = document.createElement('iframe');
      tempIframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 210mm; height: auto; border: none;';
      document.body.appendChild(tempIframe);
      
      const iframeDoc = tempIframe.contentDocument || tempIframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');
      
      // Write the complete HTML (with styles) into the iframe
      iframeDoc.open();
      iframeDoc.write(previewHtml);
      iframeDoc.close();
      
      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const iframeBody = iframeDoc.body;
      
      // Convert the fully styled content to canvas
      const canvas = await html2canvas(iframeBody, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: iframeBody.scrollWidth,
        windowHeight: iframeBody.scrollHeight,
      });
      
      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Handle multi-page PDFs if content is longer than one page
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`patienteninfo-${drug.generic_name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      
      document.body.removeChild(tempIframe);
      toast.success('PDF gedownload');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error('Fout bij downloaden PDF');
    } finally {
      setIsDownloading(false);
    }
  };

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

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-2">
              <Pill className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{drug.generic_name}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFavorite(drug.id)}
              className="shrink-0"
              aria-label={isFavorite(drug.id) ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  isFavorite(drug.id)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground hover:text-yellow-400'
                }`}
              />
            </Button>
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
                RIZIV Terugbetaald
              </Badge>
            )}
            {drug.unit_price !== null && drug.unit_price !== undefined && (
              <Badge variant="outline" className="font-mono">
                €{drug.unit_price.toFixed(2)}{drug.price_unit ? `/${drug.price_unit}` : ''}
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList>
              <TabsTrigger value="overview">Overzicht</TabsTrigger>
              <TabsTrigger value="dosing">Dosering</TabsTrigger>
              <TabsTrigger value="side-effects">Bijwerkingen</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Folder opties</p>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeDosing}
                        onCheckedChange={(checked) => setIncludeDosing(checked as boolean)}
                      />
                      Dosering opnemen
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeSideEffects}
                        onCheckedChange={(checked) => setIncludeSideEffects(checked as boolean)}
                      />
                      Bijwerkingen opnemen
                    </label>
                  </div>
                </PopoverContent>
              </Popover>
              <Button 
                onClick={handleOpenStaffDialog} 
                disabled={isGeneratingPdf}
                variant="outline"
                className="gap-2"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Patiëntenfolder
              </Button>
            </div>
          </div>

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
              {(drug.side_effects?.common || drug.side_effects?.veel_voorkomend) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Veel Voorkomende Bijwerkingen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(drug.side_effects.common || drug.side_effects.veel_voorkomend)?.map((effect: string, i: number) => (
                        <li key={i}>{effect}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {(drug.side_effects?.serious || drug.side_effects?.ernstig) && (
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Ernstige Bijwerkingen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(drug.side_effects.serious || drug.side_effects.ernstig)?.map((effect: string, i: number) => (
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
               <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
                <CardHeader>
                   <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                     <AlertTriangle className="h-5 w-5" />
                     Medicijninteracties
                   </CardTitle>
                </CardHeader>
                 <CardContent className="space-y-3">
                   <div className="flex items-start gap-2 p-3 bg-orange-100/80 dark:bg-orange-900/30 rounded-md border border-orange-200 dark:border-orange-800">
                     <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                     <p className="text-sm text-orange-800 dark:text-orange-300">
                       <strong>Let op:</strong> Controleer altijd op interacties met huidige medicatie van de patiënt.
                     </p>
                   </div>
                   <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    {drug.drug_interactions.map((interaction, i) => (
                       <li key={i} className="leading-relaxed">{interaction}</li>
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

        {/* Staff Selection Dialog */}
        <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Patiëntenfolder genereren
              </DialogTitle>
              <p className="text-sm text-muted-foreground pt-1">
                Selecteer de behandelende arts, verpleegkundige en de gewenste taal voor de folder.
              </p>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6 py-2">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Arts</Label>
                <RadioGroup value={selectedPhysician} onValueChange={setSelectedPhysician}>
                  {PHYSICIANS.map((doc) => (
                    <div key={doc} className="flex items-center gap-2">
                      <RadioGroupItem value={doc} id={`doc-${doc}`} />
                      <Label htmlFor={`doc-${doc}`} className="font-normal cursor-pointer">{doc}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Verpleegkundige</Label>
                <RadioGroup 
                  value={isNurseCustom ? '__custom__' : nurseSelection} 
                  onValueChange={(val) => {
                    if (val === '__custom__') {
                      setIsNurseCustom(true);
                    } else {
                      setIsNurseCustom(false);
                      setNurseSelection(val);
                    }
                  }}
                >
                  {NURSES.map((nurse) => (
                    <div key={nurse} className="flex items-center gap-2">
                      <RadioGroupItem value={nurse} id={`nurse-${nurse}`} />
                      <Label htmlFor={`nurse-${nurse}`} className="font-normal cursor-pointer">{nurse}</Label>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="__custom__" id="nurse-custom" />
                    <Label htmlFor="nurse-custom" className="font-normal cursor-pointer">Andere</Label>
                  </div>
                </RadioGroup>
                {isNurseCustom && (
                  <Input
                    placeholder="Naam verpleegkundige"
                    value={customNurse}
                    onChange={(e) => setCustomNurse(e.target.value)}
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Taal van de folder</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedLanguage === 'nl' ? 'default' : 'outline'}
                  onClick={() => setSelectedLanguage('nl')}
                  className="flex-1 gap-2"
                >
                  <span className="text-base leading-none">🇧🇪</span>
                  Nederlands
                </Button>
                <Button
                  type="button"
                  variant={selectedLanguage === 'fr' ? 'default' : 'outline'}
                  onClick={() => setSelectedLanguage('fr')}
                  className="flex-1 gap-2"
                >
                  <span className="text-base leading-none">🇫🇷</span>
                  Frans
                </Button>
              </div>
            </div>
            
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsStaffDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleConfirmStaff} 
                disabled={isGeneratingPdf || (isNurseCustom && !customNurse.trim())}
                className="gap-2"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-base leading-none">{selectedLanguage === 'nl' ? '🇧🇪' : '🇫🇷'}</span>
                )}
                Genereer folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Patient Info Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Patiëntenfolder - {drug.generic_name}
              </DialogTitle>
            </DialogHeader>
            
            {user ? (
              <PatientFolderEditor 
                drug={drug}
                previewHtml={previewHtml}
                iframeRef={iframeRef}
                onRefreshPreview={fetchPatientInfo}
              />
            ) : (
              <div className="flex-1 overflow-auto bg-muted rounded-md" style={{ maxHeight: '70vh' }}>
                {previewHtml && (
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHtml}
                    className="w-full border-0"
                    title="Patiëntenfolder preview"
                    style={{ minHeight: '600px', height: '100%' }}
                  />
                )}
              </div>
            )}
            
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Sluiten
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadPdf} 
                disabled={isDownloading}
                className="gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Afdrukken
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}