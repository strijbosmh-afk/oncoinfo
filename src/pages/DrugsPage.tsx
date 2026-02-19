import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/Layout';
import { useDrugs } from '@/hooks/useDrugs';
import { useFavorites } from '@/hooks/useFavorites';
import { useMostUsed } from '@/hooks/useMostUsed';
import { useAuth } from '@/hooks/useAuth';
import { useUserDrugOrder } from '@/hooks/useUserDrugOrder';
import { useTranslatedStrings } from '@/hooks/useTranslatedStrings';
import { DrugFilters, DRUG_CLASSES, DRUG_DISEASE_AREAS, Drug, DRUG_CATEGORIES, DrugCategoryKey } from '@/types/drug';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, Pill, Loader2, Star, FileText, ChevronLeft, Heart, Stethoscope, Baby, MoreHorizontal, GripVertical, Wind, UtensilsCrossed, Palette, Ear, Zap } from 'lucide-react';
import { Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SortableDrugList } from '@/components/drugs/SortableDrugList';
import { useHospital } from '@/contexts/HospitalContext';

const CATEGORY_DISCIPLINE_MAP: Record<string, string[]> = {
  breast: ['Borstkanker'],
  urology: ['Prostaatkanker', 'Blaaskanker', 'Niercelcarcinoom', 'Testiskanker', 'Peniskanker'],
  gynecology: ['Ovariumkanker', 'Endometriumkanker', 'Cervixkanker', 'Vulvakanker'],
  respiratory: ['NSCLC', 'SCLC', 'Mesothelioom'],
  digestive: ['Colorectaal carcinoom', 'Maagcarcinoom', 'Oesofaguscarcinoom', 'Pancreascarcinoom', 'Hepatocellulair carcinoom', 'Galwegcarcinoom'],
  skin: ['Melanoom', 'Merkelcelcarcinoom', 'Cutaan plaveiselcelcarcinoom'],
  head_neck: ['Hoofd-halscarcinoom', 'Nasofarynxcarcinoom', 'Speekselkliercarcinoom'],
  other: ['Supportive Care', 'Anti-emetica', 'Groeifactoren', 'Erytropoietines', 'Trombopoietine-agonisten', 'Antiresorptiva'],
};

const DRUG_CLASS_FULL_NAMES: Record<string, string> = {
  'IO/ICI': 'Immune Checkpoint Inhibitor',
  'PARPi': 'Poly (ADP-ribose) Polymerase Inhibitor',
  'ARTA': 'Androgen Receptor Targeted Agent',
  'TKI': 'Tyrosine Kinase Inhibitor',
  'ADC': 'Antibody-Drug Conjugate',
  'CDK4/6i': 'Cycline-Dependent Kinase 4/6 Inhibitor',
  'HER2-remmers': 'Humane Epidermale Groeifactor Receptor 2 Remmers',
  'SERM': 'Selectieve Estrogeen Receptor Modulator',
  'SERD': 'Selectieve Estrogeen Receptor Degradator',
  'LHRH agonist': 'Luteinizing Hormone-Releasing Hormone Agonist',
  'G-CSF': 'Granulocyte Colony-Stimulating Factor',
};

/** Translate a Dutch medical term using the medicalTerms i18n section, with fallback to the original */
function useMedicalTranslation() {
  const { t } = useTranslation();
  return (term: string) => {
    const translated = t(`medicalTerms.${term}`, { defaultValue: '' });
    return translated || term;
  };
}

const getDrugClassColor = (drugClass: string) => {
  const colors: Record<string, string> = {
    'IO/ICI': 'bg-purple-100 text-purple-800 border-purple-200',
    'PARPi': 'bg-pink-100 text-pink-800 border-pink-200',
    'ARTA': 'bg-blue-100 text-blue-800 border-blue-200',
    'Chemotherapie': 'bg-red-100 text-red-800 border-red-200',
    'TKI': 'bg-orange-100 text-orange-800 border-orange-200',
    'ADC': 'bg-teal-100 text-teal-800 border-teal-200',
    'Radioligand Therapie': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Hormonale Therapie': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Anti-hormonale therapie': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Combinatietherapie': 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300',
    'CDK4/6i': 'bg-rose-100 text-rose-800 border-rose-200',
    'HER2-remmers': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Immunotherapie': 'bg-violet-100 text-violet-800 border-violet-200',
    'SERM': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    'Aromataseremmers': 'bg-lime-100 text-lime-800 border-lime-200',
    'SERD': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'LHRH agonist': 'bg-sky-100 text-sky-800 border-sky-200',
    'Hormoontherapie': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'ALK-remmer': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'EGFR-remmer': 'bg-lime-100 text-lime-800 border-lime-200',
    'Angiogeneseremmer': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return colors[drugClass] || 'bg-gray-100 text-gray-800 border-gray-200';
};

interface DrugCardProps {
  drug: Drug;
  isFavorite: boolean;
  isMostUsed: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleMostUsed: (e: React.MouseEvent) => void;
  translateTerm?: (term: string) => string;
}

function DrugCard({ drug, isFavorite, isMostUsed, onToggleFavorite, onToggleMostUsed, translateTerm }: DrugCardProps) {
  const { t } = useTranslation();
  const tMedLocal = useMedicalTranslation();
  const tMed = translateTerm || tMedLocal;
  const isCombo = drug.drug_class === 'Combinatietherapie';
  
  if (isCombo) {
    return (
      <Card className="h-full border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer relative group">
        <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5">
          <button
            onClick={onToggleMostUsed}
            className="p-1.5 rounded-full hover:bg-amber-100 transition-colors"
            aria-label="Toggle meest gebruikt"
          >
            <Zap className={`h-4 w-4 transition-colors ${isMostUsed ? 'fill-orange-400 text-orange-400' : 'text-muted-foreground hover:text-orange-400'}`} />
          </button>
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-full hover:bg-amber-100 transition-colors"
            aria-label={isFavorite ? t('drugs.removeFromFavorites') : t('drugs.addToFavorites')}
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                isFavorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground hover:text-yellow-400'
              }`}
            />
          </button>
        </div>
        <Link to={`/drugs/${drug.id}`}>
          <CardHeader className="pb-2 pr-20">
            <div className="flex items-start gap-2 mb-1">
              <Layers className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-lg text-amber-900 dark:text-amber-100">{drug.generic_name}</CardTitle>
                {drug.brand_names.length > 0 && (
                  <CardDescription className="text-amber-700/70">
                    {drug.brand_names.join(', ')}
                  </CardDescription>
                )}
              </div>
            </div>
            <Badge className="w-fit bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              {t('drugs.combinationRegimen')}
            </Badge>
            {drug.is_on_zvz ? (
              <Badge className="w-fit bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                ✓ RIZIV
              </Badge>
            ) : (
              <Badge className="w-fit bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700">
                ✗ Niet RIZIV
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {drug.approved_indications && drug.approved_indications.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {drug.approved_indications.slice(0, 3).map((ind) => (
                  <Badge key={ind} variant="outline" className="text-xs border-amber-200 text-amber-800 dark:text-amber-200 max-w-full">
                    <span className="line-clamp-2">{tMed(ind)}</span>
                  </Badge>
                ))}
                {drug.approved_indications.length > 3 && (
                  <Badge variant="outline" className="text-xs border-amber-200">
                    +{drug.approved_indications.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Link>
      </Card>
    );
  }
  
  return (
    <TooltipProvider delayDuration={300}>
    <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer relative group">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5">
        <button
          onClick={onToggleMostUsed}
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Toggle meest gebruikt"
        >
          <Zap className={`h-4 w-4 transition-colors ${isMostUsed ? 'fill-orange-400 text-orange-400' : 'text-muted-foreground hover:text-orange-400'}`} />
        </button>
        <button
          onClick={onToggleFavorite}
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label={isFavorite ? t('drugs.removeFromFavorites') : t('drugs.addToFavorites')}
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              isFavorite
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground hover:text-yellow-400'
            }`}
          />
        </button>
      </div>
      <Link to={`/drugs/${drug.id}`}>
        <CardHeader className="pb-2 pr-20">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{drug.generic_name}</CardTitle>
              {drug.brand_names.length > 0 && (
                <CardDescription>
                  {drug.brand_names.join(', ')}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {DRUG_CLASS_FULL_NAMES[drug.drug_class] ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={getDrugClassColor(drug.drug_class)}>
                      {tMed(drug.drug_class)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{DRUG_CLASS_FULL_NAMES[drug.drug_class]}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Badge className={getDrugClassColor(drug.drug_class)}>
                  {tMed(drug.drug_class)}
                </Badge>
              )}
              {drug.is_on_zvz ? (
                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 text-xs">
                  ✓ RIZIV
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 text-xs">
                  ✗ Niet RIZIV
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {drug.administration_route && tMed(drug.administration_route) && (
            <p className="text-sm text-muted-foreground mb-2">
              {tMed(drug.administration_route)}
            </p>
          )}
          {drug.disease_areas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {drug.disease_areas.slice(0, 3).map((area) => (
                <Badge key={area} variant="outline" className="text-xs">
                  {tMed(area)}
                </Badge>
              ))}
              {drug.disease_areas.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{drug.disease_areas.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
    </TooltipProvider>
  );
}

const categoryIcons: Record<DrugCategoryKey, React.ElementType> = {
  breast: Heart,
  urology: Stethoscope,
  gynecology: Baby,
  respiratory: Wind,
  digestive: UtensilsCrossed,
  skin: Palette,
  head_neck: Ear,
  other: MoreHorizontal
};

const categoryColors: Record<DrugCategoryKey, { text: string; bg: string }> = {
  breast: { text: 'text-pink-500', bg: 'bg-pink-500/10' },
  urology: { text: 'text-blue-500', bg: 'bg-blue-500/10' },
  gynecology: { text: 'text-purple-500', bg: 'bg-purple-500/10' },
  respiratory: { text: 'text-sky-500', bg: 'bg-sky-500/10' },
  digestive: { text: 'text-orange-500', bg: 'bg-orange-500/10' },
  skin: { text: 'text-amber-500', bg: 'bg-amber-500/10' },
  head_neck: { text: 'text-teal-500', bg: 'bg-teal-500/10' },
  other: { text: 'text-emerald-500', bg: 'bg-emerald-500/10' }
};

export default function DrugsPage() {
  const { t } = useTranslation();
  const tMed = useMedicalTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') as DrugCategoryKey | null;
  const selectedSubtype = searchParams.get('subtype');
  const selectedStage = searchParams.get('stage');
  const selectedSubcategory = searchParams.get('subcategory');
  const selectedDiseaseArea = searchParams.get('diseaseArea');
  const categoryConfig = category ? DRUG_CATEGORIES[category] : null;

  const urlSearchQuery = searchParams.get('search') || '';
  const [filters, setFilters] = useState<DrugFilters>({});
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportIncludeDosing, setExportIncludeDosing] = useState(true);
  const [exportIncludeSideEffects, setExportIncludeSideEffects] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'combinations' | 'hormonal' | 'cdk46' | 'arta' | 'lhrh' | 'individual'>('all');
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();
  const { hospital } = useHospital();
  const [disciplines, setDisciplines] = useState<{ disease_area: string; is_enabled: boolean }[] | null>(null);

  // Fetch hospital disciplines for access check
  useEffect(() => {
    if (!hospital?.id) return;
    const fetchDisciplines = async () => {
      const { data } = await supabase
        .from('hospital_disciplines')
        .select('disease_area, is_enabled')
        .eq('hospital_id', hospital.id);
      setDisciplines(data || []);
    };
    fetchDisciplines();
  }, [hospital?.id]);

  // Redirect if category's disciplines are all disabled
  useEffect(() => {
    if (!category || !disciplines || disciplines.length === 0) return;
    const areas = CATEGORY_DISCIPLINE_MAP[category];
    if (!areas) return;
    const enabledAreas = new Set(disciplines.filter(d => d.is_enabled).map(d => d.disease_area));
    const hasAnyEnabled = areas.some(area => enabledAreas.has(area));
    if (!hasAnyEnabled) {
      toast.info('Deze functie werd uitgeschakeld voor uw instelling.');
      navigate('/home');
    }
  }, [category, disciplines, navigate]);

  const { data: drugs, isLoading, error } = useDrugs({
    ...filters,
    search: searchQuery || urlSearchQuery || undefined,
  });

  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { isMostUsed: isMostUsedCheck, toggleMostUsed } = useMostUsed();
  const { isAdmin } = useAuth();
  const { applyUserOrder } = useUserDrugOrder();

  // Batch-translate all drug card terms via AI
  const allCardTerms = useMemo(() => {
    if (!drugs) return [];
    return drugs.flatMap(drug => [
      ...(drug.approved_indications || []),
      ...(drug.disease_areas || []),
      drug.drug_class,
      drug.administration_route || '',
    ]).filter(Boolean);
  }, [drugs]);
  const { translate: tCardBatch } = useTranslatedStrings(allCardTerms);

  // Filter drugs based on selected subtype/stage
  const filteredDrugs = useMemo(() => {
    if (!drugs) return [];
    
    let result = drugs;
    
    // Filter by category disease area
    if (category === 'breast') {
      result = result.filter(drug => drug.disease_areas.includes('Borstkanker'));
      
    }
   
   if (category === 'urology') {
     const urologyAreas = ['Prostaatkanker', 'Blaaskanker', 'Niercelcarcinoom', 'Testiskanker', 'Peniskanker'];
     result = result.filter(drug => 
       drug.disease_areas.some(area => urologyAreas.includes(area))
     );
     
     // Filter by specific urology disease area
     if (selectedDiseaseArea) {
       const diseaseAreaMap: Record<string, string[]> = {
         'prostate': ['Prostaatkanker'],
         'bladder': ['Blaaskanker'],
         'kidney': ['Niercelcarcinoom'],
         'testis': ['Testiskanker'],
         'penile': ['Peniskanker']
       };
       const areas = diseaseAreaMap[selectedDiseaseArea];
       if (areas) {
         result = result.filter(drug => 
           drug.disease_areas.some(area => areas.includes(area))
         );
       }
     }
   }
   
   if (category === 'gynecology') {
     const gynecologyAreas = ['Ovariumkanker', 'Endometriumkanker', 'Cervixkanker', 'Vulvakanker', 'gynecology'];
     result = result.filter(drug => 
       drug.disease_areas.some(area => gynecologyAreas.includes(area))
     );
     
     // Filter by specific gynecology disease area
     if (selectedDiseaseArea) {
       const diseaseAreaMap: Record<string, string[]> = {
         'ovarian': ['Ovariumkanker'],
         'endometrial': ['Endometriumkanker'],
         'cervical': ['Cervixkanker'],
         'vulvar': ['Vulvakanker']
       };
       const areas = diseaseAreaMap[selectedDiseaseArea];
       if (areas) {
         result = result.filter(drug => 
           drug.disease_areas.some(area => areas.includes(area))
         );
       }
     }
   }
   
   if (category === 'respiratory') {
     const respiratoryAreas = ['Longkanker', 'NSCLC', 'SCLC', 'Mesothelioom'];
     result = result.filter(drug => 
       drug.disease_areas.some(area => respiratoryAreas.includes(area))
     );
     
     if (selectedDiseaseArea) {
       const diseaseAreaMap: Record<string, string[]> = {
         'nsclc': ['NSCLC'],
         'sclc': ['SCLC'],
         'mesothelioma': ['Mesothelioom']
       };
       const areas = diseaseAreaMap[selectedDiseaseArea];
       if (areas) {
         result = result.filter(drug => 
           drug.disease_areas.some(area => areas.includes(area))
         );
       }
     }
   }
   
   if (category === 'digestive') {
     const digestiveAreas = ['Colorectaal carcinoom', 'Maagcarcinoom', 'Oesofaguscarcinoom', 'Pancreascarcinoom', 'Hepatocellulair carcinoom', 'Galwegcarcinoom', 'Cholangiocarcinoom', 'GIST'];
     result = result.filter(drug => 
       drug.disease_areas.some(area => digestiveAreas.includes(area))
     );
     
     if (selectedDiseaseArea) {
       const diseaseAreaMap: Record<string, string[]> = {
         'colorectal': ['Colorectaal carcinoom'],
         'gastric': ['Maagcarcinoom'],
         'esophageal': ['Oesofaguscarcinoom'],
         'pancreatic': ['Pancreascarcinoom'],
         'hepatocellular': ['Hepatocellulair carcinoom'],
         'biliary': ['Galwegcarcinoom', 'Cholangiocarcinoom']
       };
       const areas = diseaseAreaMap[selectedDiseaseArea];
       if (areas) {
         result = result.filter(drug => 
           drug.disease_areas.some(area => areas.includes(area))
         );
       }
     }
   }

   if (category === 'skin') {
     const skinAreas = ['Melanoom', 'Merkelcelcarcinoom', 'Cutaan plaveiselcelcarcinoom', 'Cutaan SCC'];
     result = result.filter(drug => 
       drug.disease_areas.some(area => skinAreas.includes(area))
     );
     
     if (selectedDiseaseArea) {
       const diseaseAreaMap: Record<string, string[]> = {
         'melanoma': ['Melanoom'],
         'merkel': ['Merkelcelcarcinoom'],
         'cutaneous_scc': ['Cutaan plaveiselcelcarcinoom', 'Cutaan SCC']
       };
       const areas = diseaseAreaMap[selectedDiseaseArea];
       if (areas) {
         result = result.filter(drug => 
           drug.disease_areas.some(area => areas.includes(area))
         );
       }
     }
   }

   if (category === 'head_neck') {
     const headNeckAreas = ['Hoofd-halscarcinoom', 'Nasofarynxcarcinoom', 'Speekselkliercarcinoom'];
     result = result.filter(drug => 
       drug.disease_areas.some(area => headNeckAreas.includes(area))
     );
     
     if (selectedDiseaseArea) {
       const diseaseAreaMap: Record<string, string[]> = {
         'hnscc': ['Hoofd-halscarcinoom'],
         'nasopharyngeal': ['Nasofarynxcarcinoom'],
         'salivary': ['Speekselkliercarcinoom']
       };
       const areas = diseaseAreaMap[selectedDiseaseArea];
       if (areas) {
         result = result.filter(drug => 
           drug.disease_areas.some(area => areas.includes(area))
         );
       }
     }
   }

   if (category === 'other') {
      const otherAreas = ['Overige', 'Supportive Care'];
      const otherClasses = ['Antiresorptiva', 'Supportive Care'];
      result = result.filter(drug => 
        drug.disease_areas.some(area => otherAreas.includes(area)) ||
        otherClasses.includes(drug.drug_class)
      );
      
       // Filter by subcategory
       if (selectedSubcategory) {
         const specificAreas = ['Anti-emetica', 'Groeifactoren', 'Erytropoietines', 'Trombopoietine-agonisten', 'Antiresorptiva'];
         const subcategoryFilters: Record<string, { areas: string[], classes: string[], exclude?: string[] }> = {
           'antiresorptive': { areas: ['Antiresorptiva'], classes: ['Antiresorptiva'] },
           'antiemetic': { areas: ['Anti-emetica'], classes: [] },
           'gcsf': { areas: ['Groeifactoren'], classes: [] },
           'erythropoietin': { areas: ['Erytropoietines'], classes: [] },
           'thrombopoietin': { areas: ['Trombopoietine-agonisten'], classes: [] },
           'supportive': { areas: ['Supportive Care', 'Overige supportive care'], classes: ['Supportive Care'], exclude: specificAreas }
         };
         const filter = subcategoryFilters[selectedSubcategory];
         if (filter) {
           result = result.filter(drug => {
             const matchesArea = drug.disease_areas.some(area => filter.areas.includes(area)) ||
               filter.classes.includes(drug.drug_class);
             // For 'supportive' catch-all, exclude drugs that belong to a specific subcategory
             if (filter.exclude && matchesArea) {
               const belongsToSpecific = drug.disease_areas.some(area => filter.exclude!.includes(area)) ||
                 filter.exclude.includes(drug.drug_class);
               return !belongsToSpecific;
             }
             return matchesArea;
           });
         }
       }
   }
    
    // Filter by subtype (approved_indications)
    if (selectedSubtype) {
      const subtypeFilters: Record<string, string[]> = {
        'hr_positive': ['HR+', 'HR-positief', 'Hormoongevoelig', 'ER+', 'PR+'],
        'her2_positive': ['HER2+', 'HER2-positief', 'HER2 positief'],
        'triple_negative': ['TNBC', 'Triple negatief', 'triple negatief']
      };
      const keywords = subtypeFilters[selectedSubtype] || [];
      if (keywords.length > 0) {
        result = result.filter(drug => 
          drug.approved_indications?.some(ind => 
            keywords.some(kw => ind.toLowerCase().includes(kw.toLowerCase()))
          )
        );
      }
    }
    
    // Filter by stage
    if (selectedStage) {
      const stageFilters: Record<string, string[]> = {
        'neoadjuvant_adjuvant': ['Neoadjuvant', 'Adjuvant', 'neoadjuvant', 'adjuvant'],
        'metastatic': ['Gemetastaseerd', 'gemetastaseerd', 'metastatic', 'Stadium IV']
      };
      const keywords = stageFilters[selectedStage] || [];
      if (keywords.length > 0) {
        result = result.filter(drug => 
          drug.approved_indications?.some(ind => 
            keywords.some(kw => ind.toLowerCase().includes(kw.toLowerCase()))
          )
        );
      }
    }
    
    return result;
  }, [drugs, category, selectedSubtype, selectedStage, selectedSubcategory, selectedDiseaseArea]);

  // Separate combination regimens from individual drugs, plus hormonal and CDK4/6 (breast only)
  const { combinationDrugs, hormonalDrugs, cdk46Drugs, artaDrugs, lhrhDrugs, individualDrugs } = useMemo(() => {
    const orderedDrugs = applyUserOrder(filteredDrugs);
    const combinations = orderedDrugs.filter(drug => drug.drug_class === 'Combinatietherapie');
    const isBreast = category === 'breast';
    const isUrology = category === 'urology';
    const hormonal = isBreast ? orderedDrugs.filter(drug => ['Hormoontherapie', 'Anti-hormonale therapie'].includes(drug.drug_class)) : [];
    const cdk46 = isBreast ? orderedDrugs.filter(drug => drug.drug_class === 'CDK4/6i') : [];
    const arta = isUrology ? orderedDrugs.filter(drug => drug.drug_class === 'ARTA') : [];
    const lhrh = isUrology ? orderedDrugs.filter(drug => ['LHRH agonist', 'Hormoontherapie', 'Hormonale Therapie', 'Anti-hormonale therapie'].includes(drug.drug_class)) : [];
    const excludedClasses = isBreast 
      ? ['Combinatietherapie', 'Hormoontherapie', 'Anti-hormonale therapie', 'CDK4/6i']
      : isUrology
        ? ['Combinatietherapie', 'ARTA', 'LHRH agonist', 'Hormoontherapie', 'Hormonale Therapie', 'Anti-hormonale therapie']
        : ['Combinatietherapie'];
    const individuals = orderedDrugs.filter(drug => !excludedClasses.includes(drug.drug_class));
    return { combinationDrugs: combinations, hormonalDrugs: hormonal, cdk46Drugs: cdk46, artaDrugs: arta, lhrhDrugs: lhrh, individualDrugs: individuals };
  }, [filteredDrugs, applyUserOrder, category]);

  // Get display drug classes based on category
  const displayDrugClasses = useMemo(() => {
    if (categoryConfig && 'drugClasses' in categoryConfig) {
      return categoryConfig.drugClasses as readonly string[];
    }
    return DRUG_CLASSES;
  }, [categoryConfig]);

  const handleSubtypeClick = (subtypeKey: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedSubtype === subtypeKey) {
      newParams.delete('subtype');
    } else {
      newParams.set('subtype', subtypeKey);
    }
    newParams.delete('stage'); // Clear stage when selecting subtype
    setSearchParams(newParams);
  };

  const handleStageClick = (stageKey: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedStage === stageKey) {
      newParams.delete('stage');
    } else {
      newParams.set('stage', stageKey);
    }
    newParams.delete('subtype'); // Clear subtype when selecting stage
    setSearchParams(newParams);
  };

  const handleSubcategoryClick = (subcategoryKey: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedSubcategory === subcategoryKey) {
      newParams.delete('subcategory');
    } else {
      newParams.set('subcategory', subcategoryKey);
    }
    setSearchParams(newParams);
  };

  const handleDiseaseAreaClick = (areaKey: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedDiseaseArea === areaKey) {
      newParams.delete('diseaseArea');
    } else {
      newParams.set('diseaseArea', areaKey);
    }
    setSearchParams(newParams);
  };

  const clearCategoryFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('subtype');
    newParams.delete('stage');
    newParams.delete('subcategory');
    newParams.delete('diseaseArea');
    setSearchParams(newParams);
  };

  const handleExportFavorites = async () => {
    if (favorites.length === 0) {
      toast.error(t('drugs.noFavoritesToExport'));
      return;
    }

    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-favorites-pdf', {
        body: { 
          drug_ids: favorites, 
          include_dosing: exportIncludeDosing, 
          include_side_effects: exportIncludeSideEffects 
        }
      });

      if (error) throw error;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }

      // Log favorites export to audit_log
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('username, hospital_id').eq('user_id', currentUser.id).single();
        await supabase.from('audit_log').insert({
          user_id: currentUser.id,
          username: profile?.username || null,
          action: 'print_folder',
          entity_type: 'patient_folder',
          entity_id: favorites.join(','),
          entity_name: `Favorieten (${favorites.length})`,
          hospital_id: profile?.hospital_id || null,
        });
      }
    } catch (err) {
      console.error('Error exporting favorites:', err);
      toast.error(t('drugs.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleClassFilter = (drugClass: string, checked: boolean) => {
    const current = filters.drug_class || [];
    setFilters({
      ...filters,
      drug_class: checked
        ? [...current, drugClass]
        : current.filter(c => c !== drugClass),
    });
  };

  const handleDiseaseFilter = (disease: string, checked: boolean) => {
    const current = filters.disease_area || [];
    setFilters({
      ...filters,
      disease_area: checked
        ? [...current, disease]
        : current.filter(d => d !== disease),
    });
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const activeFilterCount = 
    (filters.drug_class?.length || 0) + 
    (filters.disease_area?.length || 0);

  // Get favorite drugs from the loaded drugs list
  const favoriteDrugs = filteredDrugs?.filter(drug => favorites.includes(drug.id)) || [];

  return (
    <Layout>
      <div className="container py-4">
        {/* Back to categories link */}
        {category && (
          <Link 
            to="/home" 
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('drugs.backToCategories')}
          </Link>
        )}

        <div className="mb-4">
          {categoryConfig ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                {(() => {
                  const Icon = categoryIcons[category!];
                  const colors = categoryColors[category!];
                  return (
                    <div className={`h-10 w-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                  );
                })()}
                <h1 className="text-3xl font-bold">{t(`medicalTerms.cat_${category}`, categoryConfig.name)}</h1>
              </div>
              <p className="text-muted-foreground">
                {t('drugs.browseFor', { category: t(`medicalTerms.cat_${category}`, categoryConfig.name).toLowerCase() })}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-2">{t('drugs.library')}</h1>
              <p className="text-muted-foreground">
                {t('drugs.browseAll')}
              </p>
            </>
          )}
        </div>

        {/* Active filter indicator */}
        {(selectedSubtype || selectedStage || selectedSubcategory || selectedDiseaseArea) && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('drugs.activeFilter')}</span>
            {selectedSubtype && (
              <Badge variant="secondary" className="gap-1">
                {t(`medicalTerms.sub_${selectedSubtype}`, selectedSubtype)}
                <button onClick={() => handleSubtypeClick(selectedSubtype)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedStage && (
              <Badge variant="secondary" className="gap-1">
                {t(`medicalTerms.stage_${selectedStage}`, selectedStage)}
                <button onClick={() => handleStageClick(selectedStage)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedSubcategory && (
              <Badge variant="secondary" className="gap-1">
                {t(`medicalTerms.sc_${selectedSubcategory}`, selectedSubcategory)}
                <button onClick={() => handleSubcategoryClick(selectedSubcategory)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedDiseaseArea && (
              <Badge variant="secondary" className="gap-1">
                {t(`medicalTerms.da_${selectedDiseaseArea}`, selectedDiseaseArea)}
                <button onClick={() => handleDiseaseAreaClick(selectedDiseaseArea)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearCategoryFilters} className="text-xs">
              {t('drugs.clearFilter')}
            </Button>
          </div>
        )}


        {/* Category-specific navigation cards */}
        {categoryConfig && (
          <div className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Breast cancer subtypes and stages */}
              {category === 'breast' && 'subtypes' in categoryConfig && (
                <>
                  <div className="col-span-full grid gap-3 sm:grid-cols-3">
                    {categoryConfig.subtypes.map((subtype) => (
                      <Card 
                        key={subtype.key}
                        onClick={() => handleSubtypeClick(subtype.key)}
                        className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                          selectedSubtype === subtype.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <h4 className="font-medium text-primary">{t(`medicalTerms.sub_${subtype.key}`, subtype.label)}</h4>
                          <p className="text-xs text-muted-foreground">{t('drugs.subtypes')}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {categoryConfig.stages.map((stage) => (
                      <Card 
                        key={stage.key}
                        onClick={() => handleStageClick(stage.key)}
                        className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                          selectedStage === stage.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <h4 className="font-medium text-primary">{t(`medicalTerms.stage_${stage.key}`, stage.label)}</h4>
                          <p className="text-xs text-muted-foreground">{t('drugs.stages')}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Urology disease areas */}
              {category === 'urology' && 'diseaseAreas' in categoryConfig && (
                <>
                  {categoryConfig.diseaseAreas.map((area) => (
                    <Card 
                      key={area.key}
                      onClick={() => handleDiseaseAreaClick(area.key)}
                      className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                        selectedDiseaseArea === area.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-primary">{String(t(`medicalTerms.da_${area.key}`, { defaultValue: area.label }))}</h4>
                        <p className="text-xs text-muted-foreground">{String(t(`medicalTerms.da_${area.key}_desc`, { defaultValue: area.description }))}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Gynecology disease areas */}
              {category === 'gynecology' && 'diseaseAreas' in categoryConfig && (
                <>
                  {categoryConfig.diseaseAreas.map((area) => (
                    <Card 
                      key={area.key}
                      onClick={() => handleDiseaseAreaClick(area.key)}
                      className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                        selectedDiseaseArea === area.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-primary">{String(t(`medicalTerms.da_${area.key}`, { defaultValue: area.label }))}</h4>
                        <p className="text-xs text-muted-foreground">{String(t(`medicalTerms.da_${area.key}_desc`, { defaultValue: area.description }))}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Respiratory disease areas */}
              {category === 'respiratory' && 'diseaseAreas' in categoryConfig && (
                <>
                  {categoryConfig.diseaseAreas.map((area) => (
                    <Card 
                      key={area.key}
                      onClick={() => handleDiseaseAreaClick(area.key)}
                      className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                        selectedDiseaseArea === area.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-primary">{String(t(`medicalTerms.da_${area.key}`, { defaultValue: area.label }))}</h4>
                        <p className="text-xs text-muted-foreground">{String(t(`medicalTerms.da_${area.key}_desc`, { defaultValue: area.description }))}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Digestive disease areas */}
              {category === 'digestive' && 'diseaseAreas' in categoryConfig && (
                <>
                  {categoryConfig.diseaseAreas.map((area) => (
                    <Card 
                      key={area.key}
                      onClick={() => handleDiseaseAreaClick(area.key)}
                      className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                        selectedDiseaseArea === area.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-primary">{String(t(`medicalTerms.da_${area.key}`, { defaultValue: area.label }))}</h4>
                        <p className="text-xs text-muted-foreground">{String(t(`medicalTerms.da_${area.key}_desc`, { defaultValue: area.description }))}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Skin disease areas */}
              {category === 'skin' && 'diseaseAreas' in categoryConfig && (
                <>
                  {categoryConfig.diseaseAreas.map((area) => (
                    <Card 
                      key={area.key}
                      onClick={() => handleDiseaseAreaClick(area.key)}
                      className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                        selectedDiseaseArea === area.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-primary">{String(t(`medicalTerms.da_${area.key}`, { defaultValue: area.label }))}</h4>
                        <p className="text-xs text-muted-foreground">{String(t(`medicalTerms.da_${area.key}_desc`, { defaultValue: area.description }))}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Head & Neck disease areas */}
              {category === 'head_neck' && 'diseaseAreas' in categoryConfig && (
                <>
                  {categoryConfig.diseaseAreas.map((area) => (
                    <Card 
                      key={area.key}
                      onClick={() => handleDiseaseAreaClick(area.key)}
                      className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                        selectedDiseaseArea === area.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-primary">{String(t(`medicalTerms.da_${area.key}`, { defaultValue: area.label }))}</h4>
                        <p className="text-xs text-muted-foreground">{String(t(`medicalTerms.da_${area.key}_desc`, { defaultValue: area.description }))}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Other subcategories */}
              {category === 'other' && 'subcategories' in categoryConfig && (
                <>
                  {categoryConfig.subcategories.map((subcat) => (
                    <Card 
                      key={subcat.key}
                      onClick={() => handleSubcategoryClick(subcat.key)}
                      className={`cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
                        selectedSubcategory === subcat.key ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-primary">{t(`medicalTerms.sc_${subcat.key}`, subcat.label)}</h4>
                        <p className="text-xs text-muted-foreground">{t(`medicalTerms.sc_${subcat.key}_desc`, subcat.description)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>

            {/* View Mode Toggle - under subtypes */}
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
              <Button
                variant={viewMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('all')}
                className="gap-1.5"
              >
                {t('common.all')}
                <Badge variant={viewMode === 'all' ? 'secondary' : 'outline'} className="ml-0.5">
                  {filteredDrugs.length}
                </Badge>
              </Button>
              <Button
                variant={viewMode === 'combinations' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('combinations')}
                className="gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                {t('drugs.combinations')}
                <Badge variant={viewMode === 'combinations' ? 'secondary' : 'outline'} className="ml-0.5">
                  {combinationDrugs.length}
                </Badge>
              </Button>
              {category === 'breast' && hormonalDrugs.length > 0 && (
                <Button
                  variant={viewMode === 'hormonal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('hormonal')}
                  className="gap-1.5"
                >
                  Antihormonaal
                  <Badge variant={viewMode === 'hormonal' ? 'secondary' : 'outline'} className="ml-0.5">
                    {hormonalDrugs.length}
                  </Badge>
                </Button>
              )}
              {category === 'breast' && cdk46Drugs.length > 0 && (
                <Button
                  variant={viewMode === 'cdk46' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cdk46')}
                  className="gap-1.5"
                >
                  CDK4/6
                  <Badge variant={viewMode === 'cdk46' ? 'secondary' : 'outline'} className="ml-0.5">
                    {cdk46Drugs.length}
                  </Badge>
                </Button>
              )}
              {category === 'urology' && lhrhDrugs.length > 0 && (
                <Button
                  variant={viewMode === 'lhrh' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('lhrh')}
                  className="gap-1.5"
                >
                  LHRH
                  <Badge variant={viewMode === 'lhrh' ? 'secondary' : 'outline'} className="ml-0.5">
                    {lhrhDrugs.length}
                  </Badge>
                </Button>
              )}
              {category === 'urology' && artaDrugs.length > 0 && (
                <Button
                  variant={viewMode === 'arta' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('arta')}
                  className="gap-1.5"
                >
                  ARTA
                  <Badge variant={viewMode === 'arta' ? 'secondary' : 'outline'} className="ml-0.5">
                    {artaDrugs.length}
                  </Badge>
                </Button>
              )}
              <Button
                variant={viewMode === 'individual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('individual')}
                className="gap-1.5"
              >
                <Pill className="h-3.5 w-3.5" />
                {t('drugs.individualDrugs')}
                <Badge variant={viewMode === 'individual' ? 'secondary' : 'outline'} className="ml-0.5">
                  {individualDrugs.length}
                </Badge>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="gap-2 ml-auto"
                disabled={isEditMode}
              >
                <GripVertical className="h-4 w-4" />
                {t('drugs.adjustOrder')}
              </Button>
            </div>
          </div>
        )}

        {/* Favorites Section */}
        {favoriteDrugs.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <h2 className="text-xl font-semibold">{t('drugs.favorites')}</h2>
                <Badge variant="secondary">{favoriteDrugs.length}</Badge>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favoriteDrugs.map((drug) => (
                <DrugCard
                  key={drug.id}
                  drug={drug}
                  isFavorite={true}
                  isMostUsed={isMostUsedCheck(drug.id)}
                  onToggleFavorite={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(drug.id);
                  }}
                  onToggleMostUsed={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMostUsed(drug.id);
                  }}
                  translateTerm={tCardBatch}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('drugs.searchByName')}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {t('drugs.filters')}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Filters Sidebar */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t('drugs.filters')}</CardTitle>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        {t('drugs.clear')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Drug Class Filter */}
                  <div>
                    <h4 className="font-medium mb-3">{t('drugs.drugClass')}</h4>
                    <div className="space-y-2">
                      <TooltipProvider delayDuration={300}>
                        {displayDrugClasses.map((drugClass) => {
                          const fullName = DRUG_CLASS_FULL_NAMES[drugClass];
                          const label = (
                            <label
                              htmlFor={`class-${drugClass}`}
                              className="text-sm cursor-pointer"
                            >
                              {tMed(drugClass)}
                            </label>
                          );
                          return (
                            <div key={drugClass} className="flex items-center space-x-2">
                              <Checkbox
                                id={`class-${drugClass}`}
                                checked={filters.drug_class?.includes(drugClass) ?? false}
                                onCheckedChange={(checked) =>
                                  handleClassFilter(drugClass, checked as boolean)
                                }
                              />
                              {fullName ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {label}
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    <p>{fullName}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                label
                              )}
                            </div>
                          );
                        })}
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Disease Area Filter - only show when not in a category */}
                  {!category && (
                    <div>
                      <h4 className="font-medium mb-3">{t('drugs.diseaseArea')}</h4>
                      <div className="space-y-2">
                        {DRUG_DISEASE_AREAS.map((disease) => (
                          <div key={disease} className="flex items-center space-x-2">
                            <Checkbox
                              id={`disease-${disease}`}
                              checked={filters.disease_area?.includes(disease) ?? false}
                              onCheckedChange={(checked) =>
                                handleDiseaseFilter(disease, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={`disease-${disease}`}
                              className="text-sm cursor-pointer"
                            >
                              {tMed(disease)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Drug List */}
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Card>
                <CardContent className="py-8 text-center text-destructive">
                  {t('drugs.loadError')}
                </CardContent>
              </Card>
            ) : filteredDrugs?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Pill className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">{t('drugs.noDrugsFound')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {(selectedSubtype || selectedStage) 
                      ? t('drugs.noFilterResults')
                      : t('drugs.adjustFilters')}
                  </p>
                  <Button variant="outline" onClick={() => { clearFilters(); clearCategoryFilters(); }}>
                    {t('drugs.clearAllFilters')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <SortableDrugList
                  combinationDrugs={combinationDrugs}
                  hormonalDrugs={hormonalDrugs}
                  cdk46Drugs={cdk46Drugs}
                  artaDrugs={artaDrugs}
                  lhrhDrugs={lhrhDrugs}
                  individualDrugs={individualDrugs}
                  viewMode={viewMode}
                  isFavorite={isFavorite}
                  isMostUsed={isMostUsedCheck}
                  toggleFavorite={toggleFavorite}
                  toggleMostUsed={toggleMostUsed}
                  isAdmin={isAdmin}
                  isEditMode={isEditMode}
                  onEditModeChange={setIsEditMode}
                />

                <p className="text-sm text-muted-foreground pt-2">
                  {t('drugs.totalFound', { count: filteredDrugs?.length })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">© DRMSoftware</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}