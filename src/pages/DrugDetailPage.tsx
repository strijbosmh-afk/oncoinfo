import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useDrug } from '@/hooks/useDrugs';
import { useTranslatedDrug } from '@/hooks/useTranslatedDrug';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { useHospital } from '@/contexts/HospitalContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { PatientFolderEditor } from '@/components/drugs/PatientFolderEditor';
import { generateStaticPreviewHtml } from '@/components/drugs/PatientFolderPreviewStatic';
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
  Printer,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface HospitalDoctor {
  id: string;
  name: string;
  staff_type: string;
  specialization: string | null;
}

interface PremedicatieItem {
  name: string;
  route: 'PO' | 'SC';
  timing: string;
}

export default function DrugDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: drug, isLoading, error } = useDrug(id || '');
  const { translatedDrug: td, isTranslating } = useTranslatedDrug(drug);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user, profile, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { hospital } = useHospital();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [includeDosing, setIncludeDosing] = useState(true);
  const [includeSideEffects, setIncludeSideEffects] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Hospital staff from database
  const [hospitalDoctors, setHospitalDoctors] = useState<HospitalDoctor[]>([]);
  const [hospitalNurses, setHospitalNurses] = useState<HospitalDoctor[]>([]);

  useEffect(() => {
    if (!hospital?.id) return;

    const fetchStaff = async () => {
      // Fetch from hospital_doctors table
      const { data: hdData } = await supabase
        .from('hospital_doctors')
        .select('id, name, staff_type, specialization')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .order('display_order');

      const doctors: HospitalDoctor[] = (hdData || []).filter(d => d.staff_type === 'doctor' || d.staff_type === 'arts');
      const nurses: HospitalDoctor[] = (hdData || []).filter(d => d.staff_type === 'nurse' || d.staff_type === 'pharmacist' || d.staff_type === 'verpleegkundige' || d.staff_type === 'apotheker');

      // Also fetch physicians from profiles (function = 'arts') as fallback/supplement
      const { data: profileDoctors } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, function')
        .eq('hospital_id', hospital.id);

      if (profileDoctors) {
        const existingNames = new Set(doctors.map(d => d.name.toLowerCase()));
        profileDoctors
          .filter(p => p.function === 'arts' && p.first_name && p.last_name)
          .forEach(p => {
            const fullName = `${p.first_name} ${p.last_name}`;
            if (!existingNames.has(fullName.toLowerCase())) {
              doctors.push({
                id: p.user_id,
                name: fullName,
                staff_type: 'arts',
                specialization: null,
              });
              existingNames.add(fullName.toLowerCase());
            }
          });

        // Also add pharmacists and nurses from profiles
        const nurseExistingNames = new Set(nurses.map(n => n.name.toLowerCase()));
        profileDoctors
          .filter(p => (p.function === 'apotheker' || p.function === 'verpleegkundige') && p.first_name && p.last_name)
          .forEach(p => {
            const fullName = `${p.first_name} ${p.last_name}`;
            if (!nurseExistingNames.has(fullName.toLowerCase())) {
              nurses.push({
                id: p.user_id,
                name: fullName,
                staff_type: p.function || 'verpleegkundige',
                specialization: null,
              });
              nurseExistingNames.add(fullName.toLowerCase());
            }
          });
      }

      setHospitalDoctors(doctors);
      setHospitalNurses(nurses);
    };

    fetchStaff();
  }, [hospital?.id]);

  // Staff selection state
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const loggedInFullName = profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : '';
  const isLoggedInNurse = profile?.function === 'verpleegkundige' || profile?.function === 'apotheker';
  const [selectedPhysician, setSelectedPhysician] = useState<string>('');
  const [nurseSelection, setNurseSelection] = useState<string>('');
  const [customNurse, setCustomNurse] = useState('');
  const [isNurseCustom, setIsNurseCustom] = useState(false);
  const billingCountry = hospital?.billing_country || '';
  const isMultiLang = ['BE'].includes(billingCountry);
  const isDACH = ['DE', 'AT', 'CH'].includes(billingCountry);
  const defaultFolderLang = hospital?.default_language === 'fr' ? 'fr' : hospital?.default_language === 'de' ? 'de' : hospital?.default_language === 'en' ? 'en' : 'nl';
  const [selectedLanguage, setSelectedLanguage] = useState<'nl' | 'fr' | 'de' | 'en'>(defaultFolderLang);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [customPhone, setCustomPhone] = useState('');
  const [folderMode, setFolderMode] = useState<'compact' | 'uitgebreid'>('compact');
  const [includePremedicatie, setIncludePremedicatie] = useState(false);
  const [hasUnsavedEditorChanges, setHasUnsavedEditorChanges] = useState(false);
  const [selectedPremedicatie, setSelectedPremedicatie] = useState<PremedicatieItem[]>([]);
  const [showAddPremedicatie, setShowAddPremedicatie] = useState(false);
  const [newPremName, setNewPremName] = useState('');
  const [newPremRoute, setNewPremRoute] = useState<'PO' | 'SC'>('PO');
  const [newPremTiming, setNewPremTiming] = useState('');


  const defaultPremedicatieItems: PremedicatieItem[] = [
    { name: 'Dexamethasone 10mg', route: 'PO', timing: '12u en 1u voor therapie' },
    { name: 'Dexamethasone 10mg', route: 'PO', timing: 'Dag 1, 2 en 3 na therapie' },
    { name: 'Medrol 32mg', route: 'PO', timing: '12u en 1u voor therapie' },
    { name: 'Lonquex 6mg', route: 'SC', timing: '24u na chemotherapie' },
    { name: 'Filgrastim 48IE', route: 'SC', timing: 'Dag 1 en 2 na therapie' },
  ];

  const premItemKey = (item: PremedicatieItem) => `${item.name}|${item.route}|${item.timing}`;

  const togglePremedicatieItem = (item: PremedicatieItem) => {
    const key = premItemKey(item);
    setSelectedPremedicatie(prev =>
      prev.some(i => premItemKey(i) === key) ? prev.filter(i => premItemKey(i) !== key) : [...prev, item]
    );
  };

  const addCustomPremedicatie = () => {
    const trimmedName = newPremName.trim();
    const trimmedTiming = newPremTiming.trim();
    if (trimmedName && trimmedTiming) {
      const newItem: PremedicatieItem = { name: trimmedName, route: newPremRoute, timing: trimmedTiming };
      if (!selectedPremedicatie.some(i => premItemKey(i) === premItemKey(newItem))) {
        setSelectedPremedicatie(prev => [...prev, newItem]);
      }
      setNewPremName('');
      setNewPremRoute('PO');
      setNewPremTiming('');
      setShowAddPremedicatie(false);
    }
  };

  // Default physician/nurse based on logged-in user's function
  useEffect(() => {
    if (!profile?.first_name || !profile?.last_name) return;
    const fullName = `${profile.first_name} ${profile.last_name}`;

    if (isLoggedInNurse) {
      // Nurse/pharmacist logged in: set them as nurse, leave physician for selection
      if (!nurseSelection && !isNurseCustom) {
        // Check if the nurse is in the hospitalNurses list
        const matchingNurse = hospitalNurses.find(n => n.name.toLowerCase() === fullName.toLowerCase());
        if (matchingNurse) {
          setNurseSelection(matchingNurse.name);
        } else {
          setIsNurseCustom(true);
          setCustomNurse(fullName);
        }
      }
      // If nurse has a dedicated doctor, pre-select that doctor
      if (!selectedPhysician && profile.dedicated_nurse_id) {
        // Find the dedicated doctor's name from profiles data
        const fetchDedicatedDoctor = async () => {
          const { data } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', profile.dedicated_nurse_id!)
            .maybeSingle();
          if (data?.first_name && data?.last_name) {
            setSelectedPhysician(`${data.first_name} ${data.last_name}`);
          }
        };
        fetchDedicatedDoctor();
      }
    } else {
      // Doctor/other: set them as physician (existing behavior)
      if (!selectedPhysician) {
        setSelectedPhysician(fullName);
      }
      // If doctor has a dedicated nurse, pre-select that nurse
      if (!nurseSelection && !isNurseCustom && profile.dedicated_nurse_id) {
        const fetchDedicatedNurse = async () => {
          const { data } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', profile.dedicated_nurse_id!)
            .maybeSingle();
          if (data?.first_name && data?.last_name) {
            const nurseName = `${data.first_name} ${data.last_name}`;
            const matchingNurse = hospitalNurses.find(n => n.name.toLowerCase() === nurseName.toLowerCase());
            if (matchingNurse) {
              setNurseSelection(matchingNurse.name);
            } else {
              setIsNurseCustom(true);
              setCustomNurse(nurseName);
            }
          }
        };
        fetchDedicatedNurse();
      }
    }
  }, [profile, hospitalNurses]);
  const fetchPatientInfo = useCallback(async (physicianName?: string, nurseName?: string, language: string = 'nl', phoneNumber?: string) => {
    if (!drug) return;
    
    setIsGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-drug-patient-info', {
        body: { 
          drug_id: drug.id, 
          include_dosing: folderMode === 'uitgebreid' ? true : includeDosing, 
          include_side_effects: includeSideEffects,
          physician_name: physicianName || '',
          nurse_name: nurseName || '',
          language,
          phone_number: phoneNumber || '',
          folder_mode: folderMode,
          premedicatie: includePremedicatie ? selectedPremedicatie.map(i => `${i.name} (${i.route}) – ${i.timing}`) : []
        }
      });

      if (error) throw error;
      setPreviewHtml(data.html);
    } catch (err) {
      console.error('Error generating patient info:', err);
      toast.error(t('patientFolder.generateError'));
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [drug, includeDosing, includeSideEffects, folderMode, includePremedicatie, selectedPremedicatie]);

  const currentNurseName = isNurseCustom ? customNurse.trim() : nurseSelection;

  const effectiveIncludeDosing = folderMode === 'uitgebreid' ? true : includeDosing;

  const staticPreviewHtml = drug ? generateStaticPreviewHtml(
    drug, selectedPhysician, currentNurseName, selectedLanguage, customPhone.trim(),
    effectiveIncludeDosing, includeSideEffects, folderMode,
    hospital?.name || 'OncoInfo',
    (() => {
      const rawUrl = (hospital?.branding as any)?.patient_folder_logo_url || hospital?.logo_url || null;
      if (!rawUrl) return null;
      if (rawUrl.startsWith('http')) return rawUrl;
      if (rawUrl.startsWith('/')) return `${window.location.origin}${rawUrl}`;
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/public-assets/${rawUrl}`;
    })(),
    (hospital?.branding as any)?.primary_color || '#6b2d5b',
    includePremedicatie ? selectedPremedicatie.map(i => `${i.name} (${i.route}) – ${i.timing}`) : []
  ) : '';

  const handleOpenStaffDialog = () => {
    setPreviewHtml(null);
    setIsStaffDialogOpen(true);
  };

  const handleConfirmStaff = async () => {
    const nurseName = isNurseCustom ? customNurse.trim() : nurseSelection;
    await fetchPatientInfo(selectedPhysician, nurseName, selectedLanguage, customPhone.trim());
  };

  const handlePrint = () => {
    if (!previewHtml) return;
    
    // Create a temporary full-size iframe for printing the complete document
    const printIframe = document.createElement('iframe');
    printIframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 210mm; height: 297mm; border: none;';
    document.body.appendChild(printIframe);
    
    const printDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!printDoc) return;
    
    printDoc.open();
    printDoc.write(previewHtml);
    printDoc.close();
    
    // Wait for content and images to load before printing
    printIframe.onload = () => {
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        // Clean up after print dialog closes
        setTimeout(() => {
          document.body.removeChild(printIframe);
        }, 1000);
      }, 500);
    };
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
      
      // Content already contains the disclaimer in the HTML, so just render pages cleanly
      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page: slice the image across pages
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        
        while (heightLeft > 5) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }
      
      pdf.save(`patienteninfo-${drug.generic_name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      
      document.body.removeChild(tempIframe);
      toast.success(t('patientFolder.downloaded'));
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error(t('patientFolder.downloadError'));
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
              <p className="text-destructive">{t('drugDetail.drugNotFound')}</p>
              <Link to="/drugs">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('drugs.backToOverview')}
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
      <div className="container py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link to="/drugs">
            <Button variant="ghost" size="sm" className="mb-2 sm:mb-4 h-8 text-xs sm:text-sm">
              <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('drugs.backToDrugs')}
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 min-w-0">
              <Pill className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              <h1 className="text-xl sm:text-3xl font-bold truncate">{drug.generic_name}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFavorite(drug.id)}
              className="shrink-0 h-8 w-8 sm:h-10 sm:w-10"
              aria-label={isFavorite(drug.id) ? t('drugs.removeFromFavorites') : t('drugs.addToFavorites')}
            >
              <Star
                className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
                  isFavorite(drug.id)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground hover:text-yellow-400'
                }`}
              />
            </Button>
          </div>
          {drug.brand_names.length > 0 && (
            <p className="text-sm sm:text-lg text-muted-foreground">
              {drug.brand_names.join(', ')}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            <Badge variant="default" className="text-xs">{drug.drug_class}</Badge>
            {drug.administration_route && (
              <Badge variant="outline" className="text-xs">{drug.administration_route}</Badge>
            )}
            {drug.is_on_zvz ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                ✓ RIZIV
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                ✗ Niet RIZIV
              </Badge>
            )}
            {isSuperAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={async () => {
                  const newValue = !drug.is_on_zvz;
                  const { error } = await supabase
                    .from('drugs')
                    .update({ is_on_zvz: newValue } as any)
                    .eq('id', drug.id);
                  if (!error) {
                    queryClient.invalidateQueries({ queryKey: ['drug', drug.id] });
                    queryClient.invalidateQueries({ queryKey: ['drugs'] });
                  }
                }}
              >
                {drug.is_on_zvz ? 'RIZIV uitschakelen' : 'RIZIV inschakelen'}
              </Button>
            )}
            {drug.unit_price !== null && drug.unit_price !== undefined && (
              <Badge variant="outline" className="font-mono text-xs">
                €{drug.unit_price.toFixed(2)}{drug.price_unit ? `/${drug.price_unit}` : ''}
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="w-max">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm px-2.5 sm:px-3">{t('drugDetail.overview')}</TabsTrigger>
                  <TabsTrigger value="dosing" className="text-xs sm:text-sm px-2.5 sm:px-3">{t('drugDetail.dosing')}</TabsTrigger>
                  <TabsTrigger value="side-effects" className="text-xs sm:text-sm px-2.5 sm:px-3">{t('drugDetail.sideEffects')}</TabsTrigger>
                  <TabsTrigger value="monitoring" className="text-xs sm:text-sm px-2.5 sm:px-3">{t('drugDetail.monitoring')}</TabsTrigger>
                </TabsList>
              </div>
              <div className="ml-4 sm:ml-6 flex items-center gap-1 shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{t('patientFolder.folderOptions')}</p>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeDosing}
                        onCheckedChange={(checked) => setIncludeDosing(checked as boolean)}
                      />
                      {t('patientFolder.includeDosing')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeSideEffects}
                        onCheckedChange={(checked) => setIncludeSideEffects(checked as boolean)}
                      />
                      {t('patientFolder.includeSideEffects')}
                    </label>
                  </div>
                </PopoverContent>
              </Popover>
                <Button 
                  onClick={handleOpenStaffDialog} 
                  disabled={isGeneratingPdf}
                  variant="outline"
                  className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  Patiënten Info
                </Button>
              </div>
            </div>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {isTranslating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('drugDetail.translating')}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {/* Mechanism of Action */}
              {td?.mechanism_of_action && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      {t('drugDetail.mechanism')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{td.mechanism_of_action}</p>
                  </CardContent>
                </Card>
              )}

              {/* Indications */}
              {td?.approved_indications && td.approved_indications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5" />
                      {t('drugDetail.indications')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {td.approved_indications.map((indication, i) => (
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
                    <CardTitle>{t('drugDetail.diseaseAreas')}</CardTitle>
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
              {td?.common_regimens && td.common_regimens.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('drugDetail.commonRegimens')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {td.common_regimens.map((regimen, i) => (
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
                  {t('drugDetail.dosingInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {td?.dosing_info ? (
                  <>
                    {td.dosing_info.standard_dose && (
                      <div>
                        <h4 className="font-medium mb-1">{t('drugDetail.standardDose')}</h4>
                        <p className="text-muted-foreground">{td.dosing_info.standard_dose}</p>
                      </div>
                    )}
                    {td.dosing_info.frequency && (
                      <div>
                        <h4 className="font-medium mb-1">{t('drugDetail.frequency')}</h4>
                        <p className="text-muted-foreground">{td.dosing_info.frequency}</p>
                      </div>
                    )}
                    {td.dosing_info.duration && (
                      <div>
                        <h4 className="font-medium mb-1">{t('drugDetail.duration')}</h4>
                        <p className="text-muted-foreground">{td.dosing_info.duration}</p>
                      </div>
                    )}
                    {td.dosing_info.max_dose && (
                      <div>
                        <h4 className="font-medium mb-1">{t('drugDetail.maxDose')}</h4>
                        <p className="text-muted-foreground">{td.dosing_info.max_dose}</p>
                      </div>
                    )}
                    {td.dosing_info.dose_adjustments && td.dosing_info.dose_adjustments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">{t('drugDetail.doseAdjustments')}</h4>
                        <div className="space-y-2">
                          {td.dosing_info.dose_adjustments.map((adj, i) => (
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
                  <p className="text-muted-foreground">{t('drugDetail.noDosingInfo')}</p>
                )}

                {drug.cycle_length_days && (
                  <div>
                    <h4 className="font-medium mb-1">{t('drugDetail.cycleDuration')}</h4>
                    <p className="text-muted-foreground">{drug.cycle_length_days} {t('drugDetail.days')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="side-effects" className="space-y-4 sm:space-y-6">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {(td?.side_effects?.common || td?.side_effects?.veel_voorkomend) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      {t('drugDetail.commonSideEffects')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(td.side_effects!.common || td.side_effects!.veel_voorkomend)?.map((effect: string, i: number) => (
                        <li key={i}>{effect}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {(td?.side_effects?.serious || td?.side_effects?.ernstig) && (
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      {t('drugDetail.seriousSideEffects')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(td.side_effects!.serious || td.side_effects!.ernstig)?.map((effect: string, i: number) => (
                        <li key={i}>{effect}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {td?.contraindications && td.contraindications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('drugDetail.contraindications')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {td.contraindications.map((contra, i) => (
                      <li key={i}>{contra}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {td?.side_effects?.management && Object.keys(td.side_effects.management).length > 0 && (
              <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Info className="h-5 w-5" />
                    {t('drugDetail.sideEffectManagement')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(td.side_effects.management).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium capitalize">{key}:</span>{' '}
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!td?.side_effects?.common && !td?.side_effects?.veel_voorkomend && !td?.side_effects?.serious && !td?.side_effects?.ernstig && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">{t('drugDetail.noSideEffects')}</p>
                </CardContent>
              </Card>
            )}

            {td?.drug_interactions && td.drug_interactions.length > 0 && (
               <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
                <CardHeader>
                   <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                     <AlertTriangle className="h-5 w-5" />
                     {t('drugDetail.drugInteractions')}
                   </CardTitle>
                </CardHeader>
                 <CardContent className="space-y-3">
                   <div className="flex items-start gap-2 p-3 bg-orange-100/80 dark:bg-orange-900/30 rounded-md border border-orange-200 dark:border-orange-800">
                     <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                     <p className="text-sm text-orange-800 dark:text-orange-300">
                       <strong>{t('drugDetail.interactionWarning').split('.')[0]}:</strong> {t('drugDetail.interactionWarning')}
                     </p>
                   </div>
                   <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    {td.drug_interactions.map((interaction, i) => (
                       <li key={i} className="leading-relaxed">{interaction}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4 sm:space-y-6">
            {drug.monitoring_requirements && drug.monitoring_requirements.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('drugDetail.monitoringRequirements')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {drug.monitoring_requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">{t('drugDetail.noMonitoring')}</p>
                </CardContent>
              </Card>
            )}

            {td?.patient_counseling_points && td.patient_counseling_points.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('drugDetail.patientCounseling')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {td.patient_counseling_points.map((point, i) => (
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
                    {t('drugDetail.references')}
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

        {/* Patient Folder Dialog – settings + live preview */}
        <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col w-[98vw] sm:w-[95vw] lg:w-full p-0">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">{t('patientFolder.title')} - {drug.generic_name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
              {/* Left: settings */}
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between p-3 sm:p-4 lg:hidden">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 text-xs font-medium w-full justify-between h-8">
                      <span className="flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5" />
                        {t('patientFolder.settings')}
                        {selectedPhysician && (
                          <span className="text-muted-foreground font-normal truncate max-w-[150px]">— {selectedPhysician}</span>
                        )}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="lg:!block">
                  <div className="p-3 pt-0 sm:p-6 sm:pt-0 lg:pt-6 overflow-y-auto space-y-3 sm:space-y-4 max-h-[40vh] lg:max-h-none">
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.physician')}</Label>
                      {(() => {
                        // Group doctors by specialization
                        const groups = new Map<string, HospitalDoctor[]>();
                        hospitalDoctors.forEach(doc => {
                          const key = doc.specialization || t('patientFolder.general');
                          if (!groups.has(key)) groups.set(key, []);
                          groups.get(key)!.push(doc);
                        });
                        return (
                          <Select value={selectedPhysician} onValueChange={setSelectedPhysician}>
                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue placeholder={t('patientFolder.select')} />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from(groups.entries()).map(([spec, docs]) => (
                                <SelectGroup key={spec}>
                                  <SelectLabel className="text-[11px]">{spec}</SelectLabel>
                                  {docs.map(doc => (
                                    <SelectItem key={doc.id} value={doc.name}>{doc.name}</SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </div>

                    <div className="space-y-2 sm:space-y-3 border-t pt-3 sm:pt-4">
                      <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.nurse')}</Label>
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
                        className="flex flex-wrap gap-x-4 gap-y-1 sm:flex-col sm:gap-2"
                      >
                        {hospitalNurses.map((nurse) => (
                          <div key={nurse.id} className="flex items-center gap-2">
                            <RadioGroupItem value={nurse.name} id={`nurse-${nurse.id}`} />
                            <Label htmlFor={`nurse-${nurse.id}`} className="font-normal cursor-pointer text-xs sm:text-sm">{nurse.name}</Label>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="__custom__" id="nurse-custom" />
                          <Label htmlFor="nurse-custom" className="font-normal cursor-pointer text-xs sm:text-sm">{t('patientFolder.otherNurse')}</Label>
                        </div>
                      </RadioGroup>
                      {isNurseCustom && (
                        <Input
                          placeholder={t('patientFolder.nurseName')}
                          value={customNurse}
                          onChange={(e) => setCustomNurse(e.target.value)}
                          className="mt-1 h-8 sm:h-9 text-xs sm:text-sm"
                          autoFocus
                        />
                      )}
                    </div>

                    <div className="space-y-1.5 sm:space-y-3 border-t pt-3 sm:pt-4">
                      <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.folderType')}</Label>
                      <div className="flex gap-1.5 sm:gap-2">
                        <Button
                          type="button"
                          variant={folderMode === 'compact' ? 'default' : 'outline'}
                          onClick={() => setFolderMode('compact')}
                          className="flex-1 h-7 sm:h-8 text-xs"
                          size="sm"
                        >
                          {t('patientFolder.compact')}
                        </Button>
                        <Button
                          type="button"
                          variant={folderMode === 'uitgebreid' ? 'default' : 'outline'}
                          onClick={() => setFolderMode('uitgebreid')}
                          className="flex-1 h-7 sm:h-8 text-xs"
                          size="sm"
                        >
                          {t('patientFolder.extended')}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {folderMode === 'compact'
                          ? t('patientFolder.compactDesc')
                          : t('patientFolder.extendedDesc')}
                      </p>
                    </div>

                    <div className="space-y-2 sm:space-y-3 border-t pt-3 sm:pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm font-medium">Ondersteunende medicatie</Label>
                        <Switch
                          checked={includePremedicatie}
                          onCheckedChange={setIncludePremedicatie}
                        />
                      </div>
                      {includePremedicatie && (
                        <div className="space-y-2 pl-1">
                          {defaultPremedicatieItems.map((item) => (
                            <label key={premItemKey(item)} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                              <Checkbox
                                checked={selectedPremedicatie.some(i => premItemKey(i) === premItemKey(item))}
                                onCheckedChange={() => togglePremedicatieItem(item)}
                              />
                              <span><strong>{item.name}</strong> ({item.route}) – {item.timing}</span>
                            </label>
                          ))}
                          {selectedPremedicatie.filter(i => !defaultPremedicatieItems.some(d => premItemKey(d) === premItemKey(i))).map((item) => (
                            <label key={premItemKey(item)} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => togglePremedicatieItem(item)}
                              />
                              <span><strong>{item.name}</strong> ({item.route}) – {item.timing}</span>
                            </label>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs mt-1"
                            onClick={() => setShowAddPremedicatie(true)}
                          >
                            + Toevoegen
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t pt-3 sm:pt-4">
                    <div className="space-y-1.5 sm:space-y-3">
                        <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.language')}</Label>
                        <div className="flex gap-1.5 sm:gap-2">
                          <Button type="button" variant={selectedLanguage === 'nl' ? 'default' : 'outline'} onClick={() => setSelectedLanguage('nl')} className="flex-1 h-7 sm:h-8 text-xs" size="sm">NL</Button>
                          <Button type="button" variant={selectedLanguage === 'fr' ? 'default' : 'outline'} onClick={() => setSelectedLanguage('fr')} className="flex-1 h-7 sm:h-8 text-xs" size="sm">FR</Button>
                          {isDACH && (
                            <Button type="button" variant={selectedLanguage === 'de' ? 'default' : 'outline'} onClick={() => setSelectedLanguage('de')} className="flex-1 h-7 sm:h-8 text-xs" size="sm">DE</Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:space-y-3">
                        <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.phone')}</Label>
                        <Input
                          placeholder={t('patientFolder.phonePlaceholder')}
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          className="h-7 sm:h-9 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleConfirmStaff}
                      disabled={isGeneratingPdf || (isNurseCustom && !customNurse.trim())}
                      className="w-full gap-2 mt-1 sm:mt-2 h-8 sm:h-9 text-xs sm:text-sm"
                    >
                      {isGeneratingPdf ? (
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                      {previewHtml ? t('patientFolder.regenerate') : t('patientFolder.generate')}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Right: preview */}
              <div className="flex-1 flex flex-col min-h-0">
                {previewHtml ? (
                  user ? (
                    <div className="flex-1 overflow-auto p-2 sm:p-4">
                      <PatientFolderEditor
                        drug={drug}
                        previewHtml={previewHtml}
                        iframeRef={iframeRef}
                        onRefreshPreview={fetchPatientInfo}
                        onUnsavedChanges={setHasUnsavedEditorChanges}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto bg-muted">
                      <iframe
                        ref={iframeRef}
                        srcDoc={previewHtml}
                        className="w-full border-0"
                        title="Patiëntenfolder preview"
                        style={{ minHeight: '400px', height: '100%' }}
                      />
                    </div>
                  )
                ) : (
                  <div className="flex-1 overflow-auto bg-muted">
                    <iframe
                      srcDoc={staticPreviewHtml}
                      className="w-full border-0"
                      title="Patiëntenfolder voorbeeld"
                      style={{ minHeight: '400px', height: '100%' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer with actions */}
            {previewHtml && (
              <div className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 border-t">
                {hasUnsavedEditorChanges && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t('patientFolder.saveBeforePrint', 'Sla wijzigingen op voordat u print of downloadt')}
                  </p>
                )}
                <div className="flex justify-end gap-2 ml-auto">
                  <Button
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={isDownloading || hasUnsavedEditorChanges}
                    className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-7 sm:h-8"
                    size="sm"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                    <span className="hidden xs:inline">{t('common.download')}</span> PDF
                  </Button>
                  <Button onClick={handlePrint} disabled={hasUnsavedEditorChanges} className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-7 sm:h-8" size="sm">
                    <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('common.print')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {/* Add Premedicatie Dialog */}
      <Dialog open={showAddPremedicatie} onOpenChange={setShowAddPremedicatie}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ondersteunende medicatie toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Naam *</Label>
              <Input
                value={newPremName}
                onChange={(e) => setNewPremName(e.target.value)}
                placeholder="bv. Dexamethason 10mg"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Toedieningsweg *</Label>
              <RadioGroup value={newPremRoute} onValueChange={(v) => setNewPremRoute(v as 'PO' | 'SC')} className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="PO" id="prem-po" />
                  <Label htmlFor="prem-po" className="text-sm cursor-pointer">PO</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="SC" id="prem-sc" />
                  <Label htmlFor="prem-sc" className="text-sm cursor-pointer">SC</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Wanneer *</Label>
              <Input
                value={newPremTiming}
                onChange={(e) => setNewPremTiming(e.target.value)}
                placeholder="bv. 12u voor therapie"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddPremedicatie(false)}>Annuleren</Button>
            <Button size="sm" onClick={addCustomPremedicatie} disabled={!newPremName.trim() || !newPremTiming.trim()}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}