import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { FolderMilestoneDialog } from '@/components/FolderMilestoneDialog';
import { DemoRestrictionDialog } from '@/components/DemoRestrictionDialog';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useDrug } from '@/hooks/useDrugs';
import { useTranslatedDrug } from '@/hooks/useTranslatedDrug';
import { useFavorites } from '@/hooks/useFavorites';
import { useMostUsed } from '@/hooks/useMostUsed';
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
import { DrugFilterTagsEditor } from '@/components/drugs/DrugFilterTagsEditor';
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
  Zap,
  FileText,
  Settings2,
  Printer,
  ChevronDown,
  AlertCircle,
  PenLine,
  ClipboardCheck,
  Eye,
  Save,
  RotateCcw,
  History
} from 'lucide-react';
import { Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface HospitalDoctor {
  id: string;
  name: string;
  staff_type: string;
  specialization: string | null;
  phone_number?: string | null;
  discipline?: string | null;
}

const waitForDocumentAssets = async (doc: Document) => {
  try {
    await doc.fonts?.ready;
  } catch {
    // A missing webfont should not block printing with the fallback font.
  }

  const imagesReady = Promise.all(
    Array.from(doc.images).map(async image => {
      if (!image.complete) {
        await new Promise<void>(resolve => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
          if (image.complete) resolve();
        });
      }
      try {
        await image.decode?.();
      } catch {
        // Broken or cross-origin images render as their browser fallback.
      }
    }),
  );
  await Promise.race([
    imagesReady,
    new Promise<void>(resolve => window.setTimeout(resolve, 3000)),
  ]);

  await new Promise<void>(resolve => {
    const view = doc.defaultView;
    if (view) view.requestAnimationFrame(() => resolve());
    else resolve();
  });
};


interface PremedicatieItem {
  name: string;
  route: 'PO' | 'SC';
  timing: string;
}

const DISEASE_AREA_TO_CATEGORY: Record<string, string> = {
  'Borstkanker': 'breast',
  'Prostaatkanker': 'urology', 'Blaaskanker': 'urology', 'Niercelcarcinoom': 'urology', 'Testiskanker': 'urology', 'Peniskanker': 'urology',
  'Ovariumkanker': 'gynecology', 'Endometriumkanker': 'gynecology', 'Cervixkanker': 'gynecology', 'Vulvakanker': 'gynecology',
  'NSCLC': 'respiratory', 'SCLC': 'respiratory', 'Mesothelioom': 'respiratory',
  'Colorectaal carcinoom': 'digestive', 'Maagcarcinoom': 'digestive', 'Oesofaguscarcinoom': 'digestive', 'Pancreascarcinoom': 'digestive', 'Hepatocellulair carcinoom': 'digestive', 'Galwegcarcinoom': 'digestive',
  'Melanoom': 'skin', 'Merkelcelcarcinoom': 'skin', 'Cutaan plaveiselcelcarcinoom': 'skin',
  'Hoofd-halscarcinoom': 'head_neck', 'Nasofarynxcarcinoom': 'head_neck', 'Speekselkliercarcinoom': 'head_neck',
  'Supportive Care': 'other', 'Anti-emetica': 'other', 'Groeifactoren': 'other', 'Erytropoietines': 'other', 'Trombopoietine-agonisten': 'other', 'Antiresorptiva': 'other',
};

const DEFAULT_PHONE_VALUES = ['016 80 90 11'];
const FOLDER_PRESET_KEY = 'patient-folder-workflow-preset-v1';

function isMissingOrDefaultPhone(phone: string): boolean {
  const normalized = phone.replace(/\s+/g, ' ').trim();
  return !normalized || DEFAULT_PHONE_VALUES.includes(normalized);
}

function getDrugCategory(diseaseAreas?: string[] | null): string | null {
  if (!diseaseAreas || diseaseAreas.length === 0) return null;
  for (const area of diseaseAreas) {
    if (DISEASE_AREA_TO_CATEGORY[area]) return DISEASE_AREA_TO_CATEGORY[area];
  }
  return null;
}

function countTextItems(value?: unknown): number {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') return value.trim() ? 1 : 0;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + countTextItems(item), 0);
  return 0;
}

export default function DrugDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: drug, isLoading, error } = useDrug(id || '');
  const { translatedDrug: td, isTranslating } = useTranslatedDrug(drug);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isMostUsed, toggleMostUsed } = useMostUsed();
  const { user, profile, isSuperAdmin, isAdmin, permissions } = useAuth();
  const navigateAdmin = useNavigate();
  const queryClient = useQueryClient();
  const { hospital, isDemoClinic } = useHospital();
  const [showDemoPopup, setShowDemoPopup] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [includeDosing, setIncludeDosing] = useState(true);
  const [includeSideEffects, setIncludeSideEffects] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneCount, setMilestoneCount] = useState(0);
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
        .select('user_id, first_name, last_name, function, phone_number, discipline')
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
                phone_number: p.phone_number,
                discipline: p.discipline,
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
                phone_number: p.phone_number,
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
  const [folderMode] = useState<'compact' | 'uitgebreid'>('uitgebreid');
  const [folderFontSize, setFolderFontSize] = useState(() => {
    const saved = localStorage.getItem('folder-font-size-default');
    return saved ? parseInt(saved, 10) : 14;
  });
  const [showFontSizeSavePrompt, setShowFontSizeSavePrompt] = useState(false);
  const [physicianPhone, setPhysicianPhone] = useState('');
  const [nursePhone, setNursePhone] = useState('');
  const [phoneMode, setPhoneMode] = useState<'nurse' | 'custom'>('nurse');
  const [showPhoneWarning, setShowPhoneWarning] = useState(false);
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

  function premItemKey(item: PremedicatieItem) {
    return `${item.name}|${item.route}|${item.timing}`;
  }

  const suggestedPremedicatieItems = useMemo(() => {
    if (!drug) return defaultPremedicatieItems;
    const suggestions = new Map<string, PremedicatieItem>();
    const add = (item: PremedicatieItem) => suggestions.set(premItemKey(item), item);
    const drugClass = drug.drug_class.toLowerCase();
    const route = drug.administration_route?.toLowerCase() || '';
    const textBlob = [
      drug.generic_name,
      drug.drug_class,
      drug.administration_route,
      ...(drug.common_regimens || []),
      ...(drug.approved_indications || []),
      JSON.stringify(drug.dosing_info || {}),
    ].join(' ').toLowerCase();

    if (drugClass.includes('chemo') || drugClass.includes('combinatie') || textBlob.includes('paclitaxel') || textBlob.includes('docetaxel')) {
      add({ name: 'Ondansetron 8mg', route: 'PO', timing: t('workflow.supportiveDayOfTherapy') });
      add({ name: 'Dexamethasone 8mg', route: 'PO', timing: t('workflow.supportiveDayTwoThree') });
    }
    if (textBlob.includes('paclitaxel') || textBlob.includes('docetaxel')) {
      add({ name: 'Dexamethasone 10mg', route: 'PO', timing: '12u en 1u voor therapie' });
    }
    if (drugClass.includes('io') || drugClass.includes('immuno')) {
      add({ name: t('workflow.supportiveIoCard'), route: 'PO', timing: t('workflow.supportiveBringEachVisit') });
    }
    if (textBlob.includes('dose-dense') || textBlob.includes('dd-') || textBlob.includes('q2w')) {
      add({ name: 'Lonquex 6mg', route: 'SC', timing: '24u na chemotherapie' });
    }
    if (route.includes('oraal')) {
      add({ name: t('workflow.supportiveOralDiary'), route: 'PO', timing: t('workflow.supportiveDaily') });
    }

    defaultPremedicatieItems.forEach(add);
    return Array.from(suggestions.values());
  }, [drug, t]);

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
        const matchingNurse = hospitalNurses.find(n => n.name.toLowerCase() === fullName.toLowerCase());
        if (matchingNurse) {
          setNurseSelection(matchingNurse.name);
          if (matchingNurse.phone_number) {
            setNursePhone(matchingNurse.phone_number);
          }
          // Also set profile phone as customPhone fallback
          if (profile.phone_number) setCustomPhone(profile.phone_number);
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
            .select('first_name, last_name, phone_number')
            .eq('id', profile.dedicated_nurse_id!)
            .maybeSingle();
          if (data?.first_name && data?.last_name) {
            setSelectedPhysician(`${data.first_name} ${data.last_name}`);
            setPhysicianPhone(data.phone_number || '');
          }
        };
        fetchDedicatedDoctor();
      }
    } else {
      // Doctor/other: set them as physician (existing behavior)
      if (!selectedPhysician) {
        setSelectedPhysician(fullName);
        setPhysicianPhone(profile.phone_number || '');
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
              setNursePhone(matchingNurse.phone_number || '');
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

  useEffect(() => {
    if (!selectedPhysician || physicianPhone.trim()) return;
    const selectedDoctor = hospitalDoctors.find(doc => doc.name === selectedPhysician);
    if (selectedDoctor?.phone_number) {
      setPhysicianPhone(selectedDoctor.phone_number);
    }
  }, [selectedPhysician, hospitalDoctors, physicianPhone]);

  const fetchPatientInfo = useCallback(async (
    physicianName?: string,
    nurseName?: string,
    language: string = 'nl',
    phoneNumber?: string,
    physicianPhoneNumber?: string,
    nursePhoneNumber?: string,
  ) => {
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
          physician_phone: physicianPhoneNumber || '',
          nurse_phone: nursePhoneNumber || '',
          folder_mode: folderMode,
          font_size: folderFontSize,
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
  }, [drug, includeDosing, includeSideEffects, folderMode, folderFontSize, includePremedicatie, selectedPremedicatie]);

  const currentNurseName = isNurseCustom ? customNurse.trim() : nurseSelection;

  const effectiveIncludeDosing = folderMode === 'uitgebreid' ? true : includeDosing;

  const selectedPhysicianRecord = hospitalDoctors.find(d => d.name === selectedPhysician);
  const effectivePhysicianPhone = physicianPhone.trim() || selectedPhysicianRecord?.phone_number || '';
  const effectiveNursePhone = phoneMode === 'nurse' ? nursePhone.trim() : customPhone.trim();

  const staticPreviewHtml = drug ? generateStaticPreviewHtml(
    drug, selectedPhysician, currentNurseName, selectedLanguage, effectiveNursePhone,
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
    includePremedicatie ? selectedPremedicatie.map(i => `${i.name} (${i.route}) – ${i.timing}`) : [],
    folderFontSize,
    effectivePhysicianPhone,
    effectiveNursePhone,
  ) : '';

  const updatedDate = new Date(drug?.updated_at || Date.now());
  const createdDate = new Date(drug?.created_at || Date.now());
  const isRecentlyUpdated = Date.now() - updatedDate.getTime() < 30 * 24 * 60 * 60 * 1000;
  const hasContentChangedAfterCreation = Math.abs(updatedDate.getTime() - createdDate.getTime()) > 60 * 1000;
  const dateFormatter = new Intl.DateTimeFormat(selectedLanguage === 'fr' ? 'fr-BE' : selectedLanguage === 'de' ? 'de-DE' : selectedLanguage === 'en' ? 'en-GB' : 'nl-BE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const consultHighlights = {
    indications: td?.approved_indications?.slice(0, 3) || [],
    dosing: td?.dosing_info?.standard_dose || td?.dosing_info?.standard || td?.dosing_info?.frequency || drug?.common_regimens?.[0] || '',
    commonEffects: (td?.side_effects?.common || td?.side_effects?.veel_voorkomend || []).slice(0, 5),
    seriousEffects: (td?.side_effects?.serious || td?.side_effects?.ernstig || []).slice(0, 4),
    monitoring: (drug?.monitoring_requirements || []).slice(0, 5),
    counseling: (td?.patient_counseling_points || []).slice(0, 4),
  };

  const contentScore =
    countTextItems(td?.approved_indications) +
    countTextItems(td?.dosing_info) +
    countTextItems(td?.side_effects) +
    countTextItems(td?.contraindications) +
    countTextItems(drug?.monitoring_requirements) +
    countTextItems(td?.patient_counseling_points) +
    selectedPremedicatie.length * 2;
  const estimatedPages = folderFontSize >= 17 || contentScore > 38 ? 3 : contentScore > 22 || folderFontSize >= 15 ? 2 : 1;
  const fitStatus = estimatedPages <= 2 ? 'ok' : 'warn';

  const monitoringPlan = useMemo(() => {
    if (!drug) return [];

    const textBlob = [
      drug.generic_name,
      drug.drug_class,
      drug.administration_route || '',
      ...(drug.common_regimens || []),
      ...(drug.approved_indications || []),
      JSON.stringify(drug.dosing_info || {}),
    ].join(' ').toLowerCase();
    const items: { label: string; timing: string; type: 'lab' | 'imaging' | 'toxicity' | 'check' }[] = [];
    const add = (label: string, timing: string, type: 'lab' | 'imaging' | 'toxicity' | 'check') => {
      if (!items.some(item => item.label === label && item.timing === timing)) {
        items.push({ label, timing, type });
      }
    };

    (drug.monitoring_requirements || []).slice(0, 4).forEach(req => add(req, t('workflow.monitoringPerProtocol'), 'check'));

    if (drug.drug_class.includes('Chemo') || drug.drug_class.includes('Combinatie')) {
      add('Bloedbeeld', t('workflow.monitoringBeforeEachCycle'), 'lab');
      add('Nier- en leverfunctie', t('workflow.monitoringBeforeEachCycle'), 'lab');
      add(t('workflow.monitoringNauseaNeuropathy'), t('workflow.monitoringEachVisit'), 'toxicity');
    }

    if (drug.drug_class.includes('IO') || drug.drug_class.includes('Immuno')) {
      add('TSH / vrij T4', t('workflow.monitoringEvery6Weeks'), 'lab');
      add('Leverwaarden', t('workflow.monitoringBeforeEachCycle'), 'lab');
      add(t('workflow.monitoringImmuneToxicity'), t('workflow.monitoringEachVisit'), 'toxicity');
    }

    if (drug.drug_class.includes('TKI') || drug.drug_class.includes('ARTA') || textBlob.includes('parp')) {
      add(t('workflow.monitoringBloodPressureSkin'), t('workflow.monitoringEachVisit'), 'toxicity');
      add('Bloedbeeld en biochemie', t('workflow.monitoringBeforeEachCycle'), 'lab');
    }

    if (drug.administration_route?.toLowerCase().includes('oraal')) {
      add(t('workflow.monitoringAdherence'), t('workflow.monitoringEachVisit'), 'check');
    }

    add(t('workflow.monitoringImaging'), t('workflow.monitoringPerProtocol'), 'imaging');
    return items.slice(0, 9);
  }, [drug, t]);

  const preflightItems = [
    {
      ok: Boolean(selectedPhysician),
      label: t('workflow.preflightPhysician'),
      detail: selectedPhysician || t('workflow.preflightMissing'),
    },
    {
      ok: !isMissingOrDefaultPhone(effectivePhysicianPhone),
      label: t('workflow.preflightPhysicianPhone'),
      detail: effectivePhysicianPhone || t('workflow.preflightMissing'),
    },
    {
      ok: Boolean(currentNurseName),
      label: t('workflow.preflightNurse'),
      detail: currentNurseName || t('workflow.preflightMissing'),
    },
    {
      ok: !isMissingOrDefaultPhone(effectiveNursePhone),
      label: t('workflow.preflightNursePhone'),
      detail: effectiveNursePhone || t('workflow.preflightMissing'),
    },
    {
      ok: Boolean(selectedLanguage),
      label: t('workflow.preflightLanguage'),
      detail: selectedLanguage.toUpperCase(),
    },
    {
      ok: fitStatus === 'ok',
      label: t('workflow.preflightFit'),
      detail: fitStatus === 'ok' ? t('workflow.fitGood', { count: estimatedPages }) : t('workflow.fitRisk', { count: estimatedPages }),
    },
  ];
  const preflightBlockingIssues = preflightItems.filter(item => !item.ok).length;

  const saveFolderPreset = () => {
    localStorage.setItem(FOLDER_PRESET_KEY, JSON.stringify({
      selectedLanguage,
      includeSideEffects,
      includePremedicatie,
      folderFontSize,
      phoneMode,
      customPhone,
      selectedPremedicatie,
    }));
    toast.success(t('workflow.presetSaved'));
  };

  const applyFolderPreset = () => {
    const raw = localStorage.getItem(FOLDER_PRESET_KEY);
    if (!raw) {
      toast.error(t('workflow.noPreset'));
      return;
    }
    try {
      const preset = JSON.parse(raw);
      if (preset.selectedLanguage) setSelectedLanguage(preset.selectedLanguage);
      if (typeof preset.includeSideEffects === 'boolean') setIncludeSideEffects(preset.includeSideEffects);
      if (typeof preset.includePremedicatie === 'boolean') setIncludePremedicatie(preset.includePremedicatie);
      if (typeof preset.folderFontSize === 'number') setFolderFontSize(preset.folderFontSize);
      if (preset.phoneMode === 'nurse' || preset.phoneMode === 'custom') setPhoneMode(preset.phoneMode);
      if (typeof preset.customPhone === 'string') setCustomPhone(preset.customPhone);
      if (Array.isArray(preset.selectedPremedicatie)) setSelectedPremedicatie(preset.selectedPremedicatie);
      toast.success(t('workflow.presetApplied'));
    } catch {
      toast.error(t('workflow.presetInvalid'));
    }
  };

  const applySupportiveCarePresets = () => {
    setIncludePremedicatie(true);
    setSelectedPremedicatie(suggestedPremedicatieItems);
    toast.success(t('workflow.supportivePresetsApplied'));
  };

  const handlePrintMonitoringPlan = useCallback(() => {
    if (!drug) return;
    const typeLabel = (type: 'lab' | 'imaging' | 'toxicity' | 'check') => {
      const keys = {
        lab: 'workflow.monitoringTypeLab',
        imaging: 'workflow.monitoringTypeImaging',
        toxicity: 'workflow.monitoringTypeToxicity',
        check: 'workflow.monitoringTypeCheck',
      } as const;
      return t(keys[type]);
    };
    const rows = monitoringPlan.map(item => `
      <tr>
        <td>${item.timing}</td>
        <td>${item.label}</td>
        <td>${typeLabel(item.type)}</td>
      </tr>
    `).join('');
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>${t('workflow.monitoringCalendar')} - ${drug.generic_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .meta { color: #4b5563; margin-bottom: 24px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
            .note { margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>${t('workflow.monitoringCalendar')}</h1>
          <div class="meta">${drug.generic_name}${drug.brand_names?.length ? ` (${drug.brand_names.join(', ')})` : ''}</div>
          <table>
            <thead><tr><th>${t('workflow.monitoringTiming')}</th><th>${t('workflow.monitoringAction')}</th><th>${t('workflow.monitoringType')}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="note">${t('workflow.monitoringDisclaimer')}</p>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }, [drug, monitoringPlan, t]);

  const handleOpenStaffDialog = () => {
    setPreviewHtml(null);
    setIsStaffDialogOpen(true);
  };

  const handleConfirmStaff = async () => {
    const nurseName = isNurseCustom ? customNurse.trim() : nurseSelection;

    if (isMissingOrDefaultPhone(effectivePhysicianPhone) || isMissingOrDefaultPhone(effectiveNursePhone)) {
      setShowPhoneWarning(true);
      return;
    }
    
    await fetchPatientInfo(selectedPhysician, nurseName, selectedLanguage, effectiveNursePhone, effectivePhysicianPhone, effectiveNursePhone);
  };
  
  const handleConfirmStaffForce = async () => {
    setShowPhoneWarning(false);
    const nurseName = isNurseCustom ? customNurse.trim() : nurseSelection;
    await fetchPatientInfo(selectedPhysician, nurseName, selectedLanguage, effectiveNursePhone, effectivePhysicianPhone, effectiveNursePhone);
  };

  const handlePrint = () => {
    if (!previewHtml) return;
    if (isDemoClinic) { setShowDemoPopup(true); return; }
    // Create a temporary full-size iframe for printing the complete document
    const printIframe = document.createElement('iframe');
    printIframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 210mm; height: 297mm; border: none;';
    document.body.appendChild(printIframe);
    
    const printDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!printDoc) {
      printIframe.remove();
      return;
    }

    printIframe.onload = async () => {
      await waitForDocumentAssets(printDoc);
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();

      // Printing blocks the frame while the system dialog is open.
      setTimeout(() => printIframe.remove(), 1000);
    };

    printDoc.open();
    printDoc.write(previewHtml);
    printDoc.close();
  };

  const handleDownloadPdf = async () => {
    if (!previewHtml || !drug) return;
    if (isDemoClinic) { setShowDemoPopup(true); return; }
    setIsDownloading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Disclaimer text for every page footer
      const disclaimerText = selectedLanguage === 'fr'
        ? '⚠ Avis important — Ce document est uniquement destiné à des fins informatives et ne constitue pas un dispositif médical (MDR 2017/745). Son contenu peut contenir des erreurs. Consultez toujours votre médecin ou pharmacien.'
        : selectedLanguage === 'de'
        ? '⚠ Wichtiger Hinweis — Dieses Dokument dient ausschließlich zu Informationszwecken und ist kein Medizinprodukt (MDR 2017/745). Der Inhalt kann Fehler enthalten. Konsultieren Sie immer Ihren Arzt oder Apotheker.'
        : selectedLanguage === 'en'
        ? '⚠ Important notice — This document is for informational purposes only and is not a medical device (MDR 2017/745). Its content may contain errors. Always consult your physician or pharmacist.'
        : '⚠ Belangrijke mededeling — Dit document is uitsluitend bedoeld als informatief hulpmiddel en is geen medisch hulpmiddel (MDR 2017/745). De inhoud kan fouten bevatten. Raadpleeg altijd uw behandelend arts of apotheker.';

      const disclaimerBoxHeight = 12;

      const addDisclaimerToPage = (pdfDoc: any) => {
        const boxY = pdfHeight - disclaimerBoxHeight;
        pdfDoc.setFillColor(255, 255, 255);
        pdfDoc.rect(0, boxY - 1, pdfWidth, disclaimerBoxHeight + 1, 'F');
        pdfDoc.setDrawColor(204, 0, 0);
        pdfDoc.setLineWidth(0.3);
        pdfDoc.roundedRect(8, boxY, pdfWidth - 16, disclaimerBoxHeight - 2, 1, 1, 'S');
        pdfDoc.setFontSize(6.5);
        pdfDoc.setTextColor(180, 0, 0);
        pdfDoc.text(disclaimerText, pdfWidth / 2, boxY + (disclaimerBoxHeight - 2) / 2 + 1, { align: 'center', maxWidth: pdfWidth - 22 });
        pdfDoc.setTextColor(0, 0, 0);
      };

      // Create iframe to render HTML
      const tempIframe = document.createElement('iframe');
      tempIframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 210mm; height: auto; border: none;';
      document.body.appendChild(tempIframe);
      
      const iframeDoc = tempIframe.contentDocument || tempIframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');
      
      iframeDoc.open();
      iframeDoc.write(previewHtml);
      iframeDoc.close();
      
      await waitForDocumentAssets(iframeDoc);

      // Hide ALL HTML disclaimers before capture — jsPDF overlay is the single source
      // Match both .disclaimer-box class and inline-styled disclaimer divs (red border)
      const allElements = Array.from(iframeDoc.querySelectorAll('div')) as HTMLElement[];
      allElements.forEach(el => {
        const hasDisclaimerClass = el.classList.contains('disclaimer-box');
        const hasRedBorder = el.style.border?.includes('#cc0000') || el.style.borderColor?.includes('#cc0000');
        const textContent = el.textContent || '';
        const isDisclaimerByContent = (textContent.includes('MDR 2017/745') || textContent.includes('Belangrijke mededeling') || textContent.includes('Important notice') || textContent.includes('Avis important') || textContent.includes('Wichtiger Hinweis')) && el.children.length <= 2 && textContent.length < 500;
        if (hasDisclaimerClass || hasRedBorder || isDisclaimerByContent) {
          el.style.display = 'none';
        }
      });

      // Find separate pages: .page-container (main) and .page-break (premedicatie)
      const pageContainer = iframeDoc.querySelector('.page-container') as HTMLElement;
      const pageBreaks = Array.from(iframeDoc.querySelectorAll('.page-break')) as HTMLElement[];
      
      // --- Section-based capture for main page ---
      if (pageContainer) {
        pageContainer.style.maxHeight = 'none';
        pageContainer.style.overflow = 'visible';
      }

      // Render the printable content as one column. CSS grids fragment poorly
      // across pages and can otherwise clip the bottom of a grid item.
      const contentGrid = iframeDoc.querySelector('.content') as HTMLElement | null;
      if (contentGrid) contentGrid.style.display = 'block';
      pageBreaks.forEach(page => {
        page.style.minHeight = '0';
        page.style.height = 'auto';
        page.style.overflow = 'visible';
      });

      const pageMargin = 10;
      const contentWidth = pdfWidth - (pageMargin * 2);
      const contentBottom = pdfHeight - disclaimerBoxHeight - 4;
      const contentAreaHeight = contentBottom - pageMargin;
      const sectionGap = 1.5; // mm gap between sections
      let yPosition = pageMargin; // current vertical position on the page in mm

      // Helper: render a single HTML element to a canvas and get its image + mm dimensions
      const captureElement = async (el: HTMLElement) => {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidthMm = contentWidth;
        const imgHeightMm = (canvas.height * contentWidth) / canvas.width;
        return { canvas, imgData, imgWidthMm, imgHeightMm };
      };

      // Locate a quiet horizontal band close to the desired page edge. This
      // keeps a canvas slice between text lines instead of through the letters.
      const findSafeSliceHeight = (
        canvas: HTMLCanvasElement,
        startYpx: number,
        maxSliceHeightPx: number,
      ) => {
        const remainingPx = canvas.height - startYpx;
        const idealHeightPx = Math.min(remainingPx, Math.floor(maxSliceHeightPx));
        if (idealHeightPx >= remainingPx) return remainingPx;

        const minimumHeightPx = Math.max(1, Math.floor(idealHeightPx * 0.7));
        const searchStartY = startYpx + minimumHeightPx;
        const searchEndY = startYpx + idealHeightPx;
        const searchHeight = searchEndY - searchStartY;
        const ctx = canvas.getContext('2d');
        if (!ctx || searchHeight < 8) return idealHeightPx;

        try {
          const imageData = ctx.getImageData(0, searchStartY - 1, canvas.width, searchHeight + 1);
          const pixels = imageData.data;
          const rowStride = canvas.width * 4;
          const xStep = Math.max(1, Math.floor(canvas.width / 500));
          const sampleCount = Math.ceil(canvas.width / xStep);
          const quietBandRows = Math.max(4, Math.round(canvas.width / 220));
          let quietRows = 0;

          for (let localY = searchHeight; localY >= 1; localY -= 1) {
            let changedSamples = 0;
            const currentRow = localY * rowStride;
            const previousRow = (localY - 1) * rowStride;

            for (let x = 0; x < canvas.width; x += xStep) {
              const current = currentRow + (x * 4);
              const previous = previousRow + (x * 4);
              const difference =
                Math.abs(pixels[current] - pixels[previous]) +
                Math.abs(pixels[current + 1] - pixels[previous + 1]) +
                Math.abs(pixels[current + 2] - pixels[previous + 2]);
              if (difference > 36) changedSamples += 1;
            }

            if ((changedSamples / sampleCount) < 0.012) {
              quietRows += 1;
              if (quietRows >= quietBandRows) {
                return Math.max(
                  minimumHeightPx,
                  (searchStartY - startYpx) + localY + Math.floor(quietBandRows / 2),
                );
              }
            } else {
              quietRows = 0;
            }
          }
        } catch {
          // Cross-origin canvas data can be unreadable; the exact slice is a
          // safe fallback and still preserves all content.
        }

        return idealHeightPx;
      };

      const addCanvasSliceToPdf = (canvas: HTMLCanvasElement, startYpx: number, sliceHeightPx: number) => {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(canvas, 0, startYpx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const sliceMm = (sliceHeightPx * contentWidth) / canvas.width;
        const sliceData = sliceCanvas.toDataURL('image/png');
        pdf.addImage(sliceData, 'PNG', pageMargin, yPosition, contentWidth, sliceMm);
        yPosition += sliceMm + sectionGap;
      };

      // Helper: add section image to PDF, handling page overflow and oversized sections
      const addSectionToPdf = (canvas: HTMLCanvasElement, imgData: string, imgW: number, imgH: number) => {
        if (imgH <= contentAreaHeight) {
          if (yPosition > pageMargin && (yPosition + imgH) > contentBottom) {
            addDisclaimerToPage(pdf);
            pdf.addPage();
            yPosition = pageMargin;
          }
          pdf.addImage(imgData, 'PNG', pageMargin, yPosition, imgW, imgH);
          yPosition += imgH + sectionGap;
          return;
        }

        const pxPerMm = canvas.height / imgH;
        let remainingPx = canvas.height;
        let startYpx = 0;

        while (remainingPx > 0) {
          const availableMm = contentBottom - yPosition;
          if (yPosition > pageMargin && availableMm < 28) {
            addDisclaimerToPage(pdf);
            pdf.addPage();
            yPosition = pageMargin;
            continue;
          }
          if (availableMm <= 2) {
            addDisclaimerToPage(pdf);
            pdf.addPage();
            yPosition = pageMargin;
            continue;
          }

          const maxSliceHeightPx = Math.min(remainingPx, Math.floor(availableMm * pxPerMm));
          const sliceHeightPx = findSafeSliceHeight(canvas, startYpx, maxSliceHeightPx);
          if (sliceHeightPx <= 0) {
            addDisclaimerToPage(pdf);
            pdf.addPage();
            yPosition = pageMargin;
            continue;
          }

          addCanvasSliceToPdf(canvas, startYpx, sliceHeightPx);
          startYpx += sliceHeightPx;
          remainingPx -= sliceHeightPx;

          if (remainingPx > 0) {
            addDisclaimerToPage(pdf);
            pdf.addPage();
            yPosition = pageMargin;
          }
        }
      };

      // Capture main page sections individually
      if (pageContainer) {
        const sections = Array.from(pageContainer.querySelectorAll('[data-pdf-section]')) as HTMLElement[];
        
        if (sections.length > 0) {
          // Also capture the header (everything before first section)
          const logoHeader = iframeDoc.querySelector('.logo-header') as HTMLElement;
          if (logoHeader) {
            const { canvas, imgData, imgWidthMm, imgHeightMm } = await captureElement(logoHeader);
            addSectionToPdf(canvas, imgData, imgWidthMm, imgHeightMm);
          }

          for (const section of sections) {
            const { canvas, imgData, imgWidthMm, imgHeightMm } = await captureElement(section);
            addSectionToPdf(canvas, imgData, imgWidthMm, imgHeightMm);
          }
          addDisclaimerToPage(pdf);
        } else {
          // Fallback: no sections found, capture entire page container
          const { canvas, imgData, imgWidthMm, imgHeightMm } = await captureElement(pageContainer);
          addSectionToPdf(canvas, imgData, imgWidthMm, imgHeightMm);
          addDisclaimerToPage(pdf);
        }
      }

      // Capture premedication pages through the same safe slicer. A long
      // schedule can then continue on another page without being clipped.
      for (const pageEl of pageBreaks) {
        pdf.addPage();
        yPosition = pageMargin;
        const { canvas, imgData, imgWidthMm, imgHeightMm } = await captureElement(pageEl);
        addSectionToPdf(canvas, imgData, imgWidthMm, imgHeightMm);
        addDisclaimerToPage(pdf);
      }
      
      pdf.save(`patienteninfo-${drug.generic_name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      document.body.removeChild(tempIframe);

      // Log folder print to audit_log
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('username, hospital_id').eq('user_id', currentUser.id).single();
        await supabase.from('audit_log').insert({
          user_id: currentUser.id,
          username: profile?.username || null,
          action: 'print_folder',
          entity_type: 'patient_folder',
          entity_id: drug.id,
          entity_name: drug.generic_name,
          hospital_id: profile?.hospital_id || null,
        });

        // Check milestone
        const { count: folderCount } = await supabase
          .from('audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .eq('action', 'print_folder');
        if (folderCount && folderCount % 100 === 0) {
          setMilestoneCount(folderCount);
          setShowMilestone(true);
        }
      }

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
              <Link to={`/drugs${drug ? `?category=${getDrugCategory(drug.disease_areas) || ''}` : ''}`}>
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
          <Link to={`/drugs?category=${getDrugCategory(drug.disease_areas) || ''}`}>
            <Button variant="ghost" size="sm" className="mb-2 sm:mb-4 h-8 text-xs sm:text-sm">
              <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('drugs.backToDrugs')}
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-1">
                <Pill className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <h1 className="text-xl sm:text-3xl font-bold truncate">{drug.generic_name}</h1>
              </div>
              {drug.brand_names.length > 0 && (
                <p className="text-sm sm:text-lg text-muted-foreground mb-2">
                  {drug.brand_names.join(', ')}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Badge variant="default" className="text-xs">{t(`medicalTerms.${drug.drug_class}`, drug.drug_class)}</Badge>
                {drug.administration_route && (
                  <Badge variant="outline" className="text-xs">{t(`medicalTerms.${drug.administration_route}`, drug.administration_route)}</Badge>
                )}
                {!isDemoClinic && (
                  drug.is_on_zvz ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      ✓ RIZIV
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                      ✗ Niet RIZIV
                    </Badge>
                  )
                )}
                {!isDemoClinic && isSuperAdmin && (
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

            {/* Action buttons — vertically stacked on right for easy access */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleFavorite(drug.id)}
                className="h-9 w-9 sm:h-10 sm:w-10"
                aria-label={isFavorite(drug.id) ? t('drugs.removeFromFavorites') : t('drugs.addToFavorites')}
                title={isFavorite(drug.id) ? t('drugs.removeFromFavorites') : t('drugs.addToFavorites')}
              >
                <Star
                  className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
                    isFavorite(drug.id)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground hover:text-yellow-400'
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMostUsed(drug.id)}
                className="h-9 w-9 sm:h-10 sm:w-10"
                aria-label={isMostUsed(drug.id) ? t('mostUsed.remove') : t('mostUsed.add')}
                title={isMostUsed(drug.id) ? t('mostUsed.remove') : t('mostUsed.label')}
              >
                <Zap
                  className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
                    isMostUsed(drug.id)
                      ? 'fill-orange-400 text-orange-400'
                      : 'text-muted-foreground hover:text-orange-400'
                  }`}
                />
              </Button>
              {(isAdmin || isSuperAdmin) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateAdmin(`/admin?editDrug=${drug.id}`)}
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  aria-label="Schema bewerken"
                  title="Schema bewerken"
                >
                  <PenLine className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-primary transition-colors" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="consult" className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="w-max">
                  <TabsTrigger value="consult" className="text-xs sm:text-sm px-2.5 sm:px-3">{t('workflow.consultTab')}</TabsTrigger>
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
                        checked={includeSideEffects}
                        onCheckedChange={(checked) => setIncludeSideEffects(checked as boolean)}
                      />
                      {t('patientFolder.includeSideEffects')}
                    </label>
                    <div className="pt-2 border-t space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t('patientFolder.fontSize', 'Tekstgrootte')}</span>
                        <span className="text-xs text-muted-foreground font-mono">{folderFontSize}px</span>
                      </div>
                      <Slider
                        value={[folderFontSize]}
                        onValueChange={([v]) => {
                          setFolderFontSize(v);
                          const savedDefault = localStorage.getItem('folder-font-size-default');
                          if (!savedDefault || parseInt(savedDefault, 10) !== v) {
                            setShowFontSizeSavePrompt(true);
                          }
                        }}
                        min={11}
                        max={20}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{t('patientFolder.fontSmall', 'Klein')}</span>
                        <span>{t('patientFolder.fontLarge', 'Groot')}</span>
                      </div>
                      {showFontSizeSavePrompt && (
                        <div className="rounded-md border bg-muted/40 p-2 space-y-2">
                          <p className="text-xs font-medium">
                            {t('patientFolder.fontSizeSaveQuestion', 'Deze tekstgrootte opslaan als standaard?')}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => {
                              localStorage.setItem('folder-font-size-default', String(folderFontSize));
                              setShowFontSizeSavePrompt(false);
                              toast.success(t('patientFolder.fontSizeSaved', 'Tekstgrootte opgeslagen als standaard'));
                            }}
                          >
                            {t('patientFolder.saveAsDefault', 'Opslaan als standaard')} ({folderFontSize}px)
                          </Button>
                        </div>
                      )}
                    </div>
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
                  {t('patientFolder.patientInfo')}
                </Button>
              </div>
            </div>

          <TabsContent value="consult" className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    {t('workflow.consultTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{t('drugDetail.indications')}</p>
                      {consultHighlights.indications.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                          {consultHighlights.indications.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">{t('workflow.noConsultData')}</p>
                      )}
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{t('drugDetail.dosingInfo')}</p>
                      <p className="mt-2 text-sm">{consultHighlights.dosing || t('workflow.noConsultData')}</p>
                      {drug.cycle_length_days && (
                        <p className="mt-1 text-xs text-muted-foreground">{drug.cycle_length_days} {t('drugDetail.days')}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                      <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">{t('drugDetail.commonSideEffects')}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                        {consultHighlights.commonEffects.length > 0
                          ? consultHighlights.commonEffects.map((item, index) => <li key={index}>{item}</li>)
                          : <li className="text-muted-foreground">{t('workflow.noConsultData')}</li>}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 dark:border-red-900 dark:bg-red-950/20">
                      <p className="text-xs font-medium uppercase text-red-700 dark:text-red-300">{t('drugDetail.seriousSideEffects')}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                        {consultHighlights.seriousEffects.length > 0
                          ? consultHighlights.seriousEffects.map((item, index) => <li key={index}>{item}</li>)
                          : <li className="text-muted-foreground">{t('workflow.noConsultData')}</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{t('drugDetail.monitoringRequirements')}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                      {consultHighlights.monitoring.length > 0
                        ? consultHighlights.monitoring.map((item, index) => <li key={index}>{item}</li>)
                        : <li className="text-muted-foreground">{t('workflow.noConsultData')}</li>}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <History className="h-4 w-4" />
                      {t('workflow.updatesTitle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t('workflow.createdAt')}</span>
                      <span className="font-medium">{dateFormatter.format(createdDate)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t('workflow.updatedAt')}</span>
                      <span className="font-medium">{dateFormatter.format(updatedDate)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isRecentlyUpdated && <Badge variant="secondary">{t('workflow.recentlyUpdated')}</Badge>}
                      {hasContentChangedAfterCreation && <Badge variant="outline">{t('workflow.changedSinceCreation')}</Badge>}
                      {!hasContentChangedAfterCreation && <Badge variant="outline">{t('workflow.originalVersion')}</Badge>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Stethoscope className="h-4 w-4" />
                      {t('workflow.folderReadyTitle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t('workflow.preflightPhysician')}</span>
                      <span className="font-medium">{selectedPhysician || t('workflow.preflightMissing')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{t('workflow.preflightNurse')}</span>
                      <span className="font-medium">{currentNurseName || t('workflow.preflightMissing')}</span>
                    </div>
                    <Button onClick={handleOpenStaffDialog} className="w-full gap-2">
                      <FileText className="h-4 w-4" />
                      {t('patientFolder.patientInfo')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

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

              {/* Filter Tags Editor - visible for users with modify permissions */}
              {(isAdmin || isSuperAdmin || permissions?.can_modify_treatments) && (
                <DrugFilterTagsEditor drug={drug} />
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
                    {/* Single-string "standard" format (used by many combination therapies) */}
                    {td.dosing_info.standard && !td.dosing_info.standard_dose && (
                      <div>
                        <h4 className="font-medium mb-1">{t('drugDetail.standardDose')}</h4>
                        <p className="text-muted-foreground whitespace-pre-line">{td.dosing_info.standard}</p>
                      </div>
                    )}

                    {/* Standard fields */}
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
                    {td.dosing_info.cycles && (
                      <div>
                        <h4 className="font-medium mb-1">Cycli</h4>
                        <p className="text-muted-foreground">{td.dosing_info.cycles}</p>
                      </div>
                    )}

                    {/* Multi-phase: induction / maintenance */}
                    {td.dosing_info.induction && (
                      <div className="border-l-2 border-primary/30 pl-3">
                        <h4 className="font-medium mb-1">Inductiefase</h4>
                        <p className="text-muted-foreground">{td.dosing_info.induction}</p>
                      </div>
                    )}
                    {td.dosing_info.maintenance && (
                      <div className="border-l-2 border-primary/30 pl-3">
                        <h4 className="font-medium mb-1">Onderhoudsfase</h4>
                        <p className="text-muted-foreground">{td.dosing_info.maintenance}</p>
                      </div>
                    )}

                    {/* Multi-phase: neoadjuvant / adjuvant (e.g. KEYNOTE-522) */}
                    {td.dosing_info.neoadjuvant_phase1 && (
                      <div className="border-l-2 border-primary/30 pl-3">
                        <h4 className="font-medium mb-1">Neoadjuvant fase 1</h4>
                        <p className="text-muted-foreground">{td.dosing_info.neoadjuvant_phase1}</p>
                        {td.dosing_info.neoadjuvant_phase1_duration && (
                          <p className="text-xs text-muted-foreground mt-1">Duur: {td.dosing_info.neoadjuvant_phase1_duration}</p>
                        )}
                      </div>
                    )}
                    {td.dosing_info.neoadjuvant_phase2 && (
                      <div className="border-l-2 border-primary/30 pl-3">
                        <h4 className="font-medium mb-1">Neoadjuvant fase 2</h4>
                        <p className="text-muted-foreground">{td.dosing_info.neoadjuvant_phase2}</p>
                        {td.dosing_info.neoadjuvant_phase2_duration && (
                          <p className="text-xs text-muted-foreground mt-1">Duur: {td.dosing_info.neoadjuvant_phase2_duration}</p>
                        )}
                      </div>
                    )}
                    {td.dosing_info.adjuvant && (
                      <div className="border-l-2 border-accent/50 pl-3">
                        <h4 className="font-medium mb-1">Adjuvant fase</h4>
                        <p className="text-muted-foreground">{td.dosing_info.adjuvant}</p>
                        {td.dosing_info.adjuvant_duration && (
                          <p className="text-xs text-muted-foreground mt-1">Duur: {td.dosing_info.adjuvant_duration}</p>
                        )}
                      </div>
                    )}

                    {/* Alternative dosing */}
                    {td.dosing_info.alternative && (
                      <div>
                        <h4 className="font-medium mb-1">Alternatief schema</h4>
                        <p className="text-muted-foreground">{td.dosing_info.alternative}</p>
                      </div>
                    )}

                    {/* Classic variant (e.g. dd-MVAC) */}
                    {td.dosing_info.classic_mvac && (
                      <div>
                        <h4 className="font-medium mb-1">Klassiek schema</h4>
                        <p className="text-muted-foreground">{td.dosing_info.classic_mvac}</p>
                      </div>
                    )}

                    {/* Dose adjustments */}
                    {td.dosing_info.dose_adjustments && (
                      <div>
                        <h4 className="font-medium mb-2">{t('drugDetail.doseAdjustments')}</h4>
                        <div className="space-y-2">
                          {Array.isArray(td.dosing_info.dose_adjustments) ? (
                            td.dosing_info.dose_adjustments.map((adj, i) => (
                              <div key={i} className="text-sm">
                                <span className="font-medium">{adj.condition}:</span>{' '}
                                <span className="text-muted-foreground">{adj.adjustment}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">{String(td.dosing_info.dose_adjustments)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Adjustments (alternate key name) */}
                    {td.dosing_info.adjustments && !td.dosing_info.dose_adjustments && (
                      <div>
                        <h4 className="font-medium mb-1">{t('drugDetail.doseAdjustments')}</h4>
                        <p className="text-muted-foreground">{td.dosing_info.adjustments}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {td.dosing_info.notes && (
                      <div className="bg-muted/50 rounded-md p-3">
                        <h4 className="font-medium mb-1 text-sm">Opmerking</h4>
                        <p className="text-sm text-muted-foreground">{td.dosing_info.notes}</p>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    {t('workflow.monitoringCalendar')}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{t('workflow.monitoringCalendarDesc')}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintMonitoringPlan}>
                  <Printer className="h-4 w-4" />
                  {t('workflow.printMonitoring')}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">{t('workflow.monitoringTiming')}</th>
                        <th className="py-2 pr-3 font-medium">{t('workflow.monitoringAction')}</th>
                        <th className="py-2 font-medium">{t('workflow.monitoringType')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitoringPlan.map((item, index) => (
                        <tr key={`${item.label}-${index}`} className="border-b last:border-0">
                          <td className="py-2 pr-3 align-top">{item.timing}</td>
                          <td className="py-2 pr-3 align-top text-muted-foreground">{item.label}</td>
                          <td className="py-2 align-top">
                            <Badge variant="outline">
                              {item.type === 'lab' && t('workflow.monitoringTypeLab')}
                              {item.type === 'imaging' && t('workflow.monitoringTypeImaging')}
                              {item.type === 'toxicity' && t('workflow.monitoringTypeToxicity')}
                              {item.type === 'check' && t('workflow.monitoringTypeCheck')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{t('workflow.monitoringDisclaimer')}</p>
              </CardContent>
            </Card>

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
          <DialogContent className="max-w-7xl max-h-[98vh] sm:max-h-[95vh] flex flex-col w-[99vw] sm:w-[97vw] lg:w-[95vw] xl:w-full p-0">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">{t('patientFolder.title')} - {drug.generic_name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
              {/* Left: settings */}
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r">
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
                  <div className="p-3 pt-0 sm:p-6 sm:pt-0 lg:pt-6 overflow-y-auto space-y-3 sm:space-y-4 max-h-[60vh] lg:max-h-[calc(95vh-80px)]">
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.physician')}</Label>
                      {(() => {
                        // Put the pre-selected (dedicated) physician first, then group rest by discipline
                        const dedicatedDoc = selectedPhysician
                          ? hospitalDoctors.find(d => d.name === selectedPhysician)
                          : null;
                        const otherDocs = hospitalDoctors.filter(d => d.name !== selectedPhysician);

                        // Group others by discipline
                        const groups = new Map<string, HospitalDoctor[]>();
                        otherDocs.forEach(doc => {
                          const rawKey = doc.discipline || doc.specialization || t('patientFolder.general');
                          const key = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
                          if (!groups.has(key)) groups.set(key, []);
                          groups.get(key)!.push(doc);
                        });

                        // Sort groups alphabetically
                        const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

                        return (
                          <Select value={selectedPhysician} onValueChange={(val) => {
                            setSelectedPhysician(val);
                            const selectedDoctor = hospitalDoctors.find(doc => doc.name === val);
                            setPhysicianPhone(selectedDoctor?.phone_number || '');
                          }}>
                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue placeholder={t('patientFolder.select')} />
                            </SelectTrigger>
                            <SelectContent>
                              {dedicatedDoc && (
                                <SelectGroup>
                                  <SelectLabel className="text-[11px]">⭐ Vaste arts</SelectLabel>
                                  <SelectItem value={dedicatedDoc.name}>{dedicatedDoc.name}</SelectItem>
                                </SelectGroup>
                              )}
                              {sortedGroups.map(([discipline, docs]) => (
                                <SelectGroup key={discipline}>
                                  <SelectLabel className="text-[11px] font-bold">{discipline}</SelectLabel>
                                  {docs.map(doc => (
                                    <SelectItem key={doc.id} value={doc.name}>{doc.name}</SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                      <Input
                        placeholder={t('patientFolder.phonePhysicianPlaceholder', 'Telefoonnummer arts')}
                        value={physicianPhone}
                        onChange={(e) => setPhysicianPhone(e.target.value)}
                        className="h-8 sm:h-9 text-xs sm:text-sm"
                      />
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
                            // Auto-fill phone number from selected nurse
                            const selectedNurse = hospitalNurses.find(n => n.name === val);
                            setNursePhone(selectedNurse?.phone_number || '');
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
                      <div className="space-y-1.5 mt-2">
                        <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.phoneOnFolder')}</Label>
                        <div className="flex gap-1.5 sm:gap-2">
                          <Button
                            type="button"
                            variant={phoneMode === 'nurse' ? 'default' : 'outline'}
                            onClick={() => setPhoneMode('nurse')}
                            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                            size="sm"
                          >
                            {t('patientFolder.phoneNursing')} {nursePhone ? `(${nursePhone})` : ''}
                          </Button>
                          <Button
                            type="button"
                            variant={phoneMode === 'custom' ? 'default' : 'outline'}
                            onClick={() => setPhoneMode('custom')}
                            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                            size="sm"
                          >
                            {t('patientFolder.phoneOther')}
                          </Button>
                        </div>
                        {phoneMode === 'nurse' && (
                          <Input
                            placeholder={t('patientFolder.phoneNursePlaceholder')}
                            value={nursePhone}
                            onChange={(e) => { setNursePhone(e.target.value); }}
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                          />
                        )}
                        {phoneMode === 'custom' && (
                          <Input
                            placeholder={t('patientFolder.phoneCustomPlaceholder')}
                            value={customPhone}
                            onChange={(e) => setCustomPhone(e.target.value)}
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                            autoFocus
                          />
                        )}
                      </div>
                    </div>


                    <div className="space-y-2 sm:space-y-3 border-t pt-3 sm:pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.supportiveMedication')}</Label>
                        <Switch
                          checked={includePremedicatie}
                          onCheckedChange={setIncludePremedicatie}
                        />
                      </div>
                      {includePremedicatie && (
                        <div className="space-y-2 pl-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={applySupportiveCarePresets}
                          >
                            {t('workflow.applySupportivePresets')}
                          </Button>
                          {suggestedPremedicatieItems.map((item) => (
                            <label key={premItemKey(item)} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                              <Checkbox
                                checked={selectedPremedicatie.some(i => premItemKey(i) === premItemKey(item))}
                                onCheckedChange={() => togglePremedicatieItem(item)}
                              />
                              <span><strong>{item.name}</strong> ({item.route}) – {item.timing}</span>
                            </label>
                          ))}
                          {selectedPremedicatie.filter(i => !suggestedPremedicatieItems.some(d => premItemKey(d) === premItemKey(i))).map((item) => (
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

                    <div className="border-t pt-3 sm:pt-4">
                    <div className="space-y-1.5 sm:space-y-3">
                        <Label className="text-xs sm:text-sm font-medium">{t('patientFolder.language')}</Label>
                        <div className="flex gap-1.5 sm:gap-2">
                          <Button type="button" variant={selectedLanguage === 'nl' ? 'default' : 'outline'} onClick={() => setSelectedLanguage('nl')} className="flex-1 h-7 sm:h-8 text-xs" size="sm">NL</Button>
                          <Button type="button" variant={selectedLanguage === 'fr' ? 'default' : 'outline'} onClick={() => setSelectedLanguage('fr')} className="flex-1 h-7 sm:h-8 text-xs" size="sm">FR</Button>
                          <Button type="button" variant={selectedLanguage === 'en' ? 'default' : 'outline'} onClick={() => setSelectedLanguage('en')} className="flex-1 h-7 sm:h-8 text-xs" size="sm">EN</Button>
                          {isDACH && (
                            <Button type="button" variant={selectedLanguage === 'de' ? 'default' : 'outline'} onClick={() => setSelectedLanguage('de')} className="flex-1 h-7 sm:h-8 text-xs" size="sm">DE</Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-3 sm:pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs sm:text-sm font-medium">{t('workflow.presetsTitle')}</Label>
                        <div className="flex gap-1.5">
                          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={saveFolderPreset}>
                            <Save className="h-3.5 w-3.5" />
                            {t('workflow.savePreset')}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={applyFolderPreset}>
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t('workflow.applyPreset')}
                          </Button>
                        </div>
                      </div>

                      <div className={`rounded-lg border p-3 ${preflightBlockingIssues > 0 ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/20' : 'border-green-200 bg-green-50/70 dark:bg-green-950/20'}`}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-xs font-semibold">
                            <ClipboardCheck className="h-4 w-4" />
                            {t('workflow.preflightTitle')}
                          </p>
                          <Badge variant={preflightBlockingIssues > 0 ? 'secondary' : 'outline'} className="text-[10px]">
                            {preflightBlockingIssues > 0 ? t('workflow.preflightAttention', { count: preflightBlockingIssues }) : t('workflow.preflightReady')}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          {preflightItems.map((item) => (
                            <div key={item.label} className="flex items-start justify-between gap-3 text-xs">
                              <span className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${item.ok ? 'bg-green-500' : 'bg-amber-500'}`} />
                                {item.label}
                              </span>
                              <span className="max-w-[160px] truncate text-right text-muted-foreground">{item.detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`rounded-lg border p-3 ${fitStatus === 'ok' ? 'bg-muted/40' : 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/20'}`}>
                        <div className="flex items-start gap-2">
                          <Eye className={`mt-0.5 h-4 w-4 ${fitStatus === 'ok' ? 'text-primary' : 'text-amber-600'}`} />
                          <div className="space-y-1">
                            <p className="text-xs font-semibold">{t('workflow.fitTitle')}</p>
                            <p className="text-xs text-muted-foreground">
                              {fitStatus === 'ok' ? t('workflow.fitGood', { count: estimatedPages }) : t('workflow.fitRisk', { count: estimatedPages })}
                            </p>
                            {fitStatus !== 'ok' && (
                              <p className="text-xs text-amber-700 dark:text-amber-300">{t('workflow.fitSuggestion')}</p>
                            )}
                          </div>
                        </div>
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
                        onRefreshPreview={() => fetchPatientInfo(
                          selectedPhysician,
                          currentNurseName,
                          selectedLanguage,
                          effectiveNursePhone,
                          effectivePhysicianPhone,
                          effectiveNursePhone,
                        )}
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
            <DialogTitle>{t('patientFolder.addSupportiveMed')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('patientFolder.medName')} *</Label>
              <Input
                value={newPremName}
                onChange={(e) => setNewPremName(e.target.value)}
                placeholder={t('patientFolder.medNamePlaceholder')}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t('patientFolder.medRoute')} *</Label>
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
              <Label className="text-sm">{t('patientFolder.medTiming')} *</Label>
              <Input
                value={newPremTiming}
                onChange={(e) => setNewPremTiming(e.target.value)}
                placeholder={t('patientFolder.medTimingPlaceholder')}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddPremedicatie(false)}>{t('patientFolder.cancel')}</Button>
            <Button size="sm" onClick={addCustomPremedicatie} disabled={!newPremName.trim() || !newPremTiming.trim()}>{t('patientFolder.add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Phone number warning dialog */}
      <Dialog open={showPhoneWarning} onOpenChange={setShowPhoneWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {t('patientFolder.phoneMissingTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('patientFolder.phoneMissingDesc')}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowPhoneWarning(false)}>
              {t('patientFolder.phoneGoBack')}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleConfirmStaffForce}>
              {t('patientFolder.phoneContinue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FolderMilestoneDialog open={showMilestone} onOpenChange={setShowMilestone} count={milestoneCount} />
      <DemoRestrictionDialog open={showDemoPopup} onOpenChange={setShowDemoPopup} />
    </Layout>
  );
}
