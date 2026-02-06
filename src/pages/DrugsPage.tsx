import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useDrugs } from '@/hooks/useDrugs';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { DrugFilters, DRUG_CLASSES, DRUG_DISEASE_AREAS, Drug, DRUG_CATEGORIES, DrugCategoryKey } from '@/types/drug';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, Pill, Loader2, Star, FileText, ChevronLeft, Heart, Stethoscope, Baby, MoreHorizontal } from 'lucide-react';
import { Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SortableDrugList } from '@/components/drugs/SortableDrugList';

const DRUG_CLASS_FULL_NAMES: Record<string, string> = {
  'IO/ICI': 'Immune Checkpoint Inhibitor',
  'PARPi': 'Poly (ADP-ribose) Polymerase Inhibitor',
  'ARPI': 'Androgen Receptor Pathway Inhibitor',
  'TKI': 'Tyrosine Kinase Inhibitor',
  'ADC': 'Antibody-Drug Conjugate',
  'CDK4/6i': 'Cycline-Dependent Kinase 4/6 Inhibitor',
  'HER2-remmers': 'Humane Epidermale Groeifactor Receptor 2 Remmers',
  'SERM': 'Selectieve Estrogeen Receptor Modulator',
  'SERD': 'Selectieve Estrogeen Receptor Degradator',
  'LHRH agonist': 'Luteinizing Hormone-Releasing Hormone Agonist',
  'G-CSF': 'Granulocyte Colony-Stimulating Factor',
};

const getDrugClassColor = (drugClass: string) => {
  const colors: Record<string, string> = {
    'IO/ICI': 'bg-purple-100 text-purple-800 border-purple-200',
    'PARPi': 'bg-pink-100 text-pink-800 border-pink-200',
    'ARPI': 'bg-blue-100 text-blue-800 border-blue-200',
    'Chemotherapie': 'bg-red-100 text-red-800 border-red-200',
    'TKI': 'bg-orange-100 text-orange-800 border-orange-200',
    'ADC': 'bg-teal-100 text-teal-800 border-teal-200',
    'Radioligand Therapie': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Hormonale Therapie': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Combinatietherapie': 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300',
    'CDK4/6i': 'bg-rose-100 text-rose-800 border-rose-200',
    'HER2-remmers': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Immunotherapie': 'bg-violet-100 text-violet-800 border-violet-200',
    'SERM': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    'Aromataseremmers': 'bg-lime-100 text-lime-800 border-lime-200',
    'SERD': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'LHRH agonist': 'bg-sky-100 text-sky-800 border-sky-200',
  };
  return colors[drugClass] || 'bg-gray-100 text-gray-800 border-gray-200';
};

interface DrugCardProps {
  drug: Drug;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

function DrugCard({ drug, isFavorite, onToggleFavorite }: DrugCardProps) {
  const isCombo = drug.drug_class === 'Combinatietherapie';
  
  if (isCombo) {
    return (
      <Card className="h-full border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer relative group">
        <button
          onClick={onToggleFavorite}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-amber-100 transition-colors"
          aria-label={isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              isFavorite
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground hover:text-yellow-400'
            }`}
          />
        </button>
        <Link to={`/drugs/${drug.id}`}>
          <CardHeader className="pb-2 pr-12">
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
              Combinatieschema
            </Badge>
            {drug.is_on_zvz && (
              <Badge className="w-fit bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                ✓ RIZIV
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {drug.approved_indications && drug.approved_indications.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {drug.approved_indications.slice(0, 3).map((ind) => (
                  <Badge key={ind} variant="outline" className="text-xs border-amber-200 text-amber-800 dark:text-amber-200">
                    {ind}
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
      <button
        onClick={onToggleFavorite}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-muted transition-colors"
        aria-label={isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
      >
        <Star
          className={`h-5 w-5 transition-colors ${
            isFavorite
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground hover:text-yellow-400'
          }`}
        />
      </button>
      <Link to={`/drugs/${drug.id}`}>
        <CardHeader className="pb-2 pr-12">
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
                      {drug.drug_class}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{DRUG_CLASS_FULL_NAMES[drug.drug_class]}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Badge className={getDrugClassColor(drug.drug_class)}>
                  {drug.drug_class}
                </Badge>
              )}
              {drug.is_on_zvz && (
                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 text-xs">
                  ✓ RIZIV
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {drug.administration_route && (
            <p className="text-sm text-muted-foreground mb-2">
              {drug.administration_route}
            </p>
          )}
          {drug.disease_areas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {drug.disease_areas.slice(0, 3).map((area) => (
                <Badge key={area} variant="outline" className="text-xs">
                  {area}
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
  other: MoreHorizontal
};

const categoryColors: Record<DrugCategoryKey, { text: string; bg: string }> = {
  breast: { text: 'text-pink-500', bg: 'bg-pink-500/10' },
  urology: { text: 'text-blue-500', bg: 'bg-blue-500/10' },
  gynecology: { text: 'text-purple-500', bg: 'bg-purple-500/10' },
  other: { text: 'text-emerald-500', bg: 'bg-emerald-500/10' }
};

export default function DrugsPage() {
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
  const [viewMode, setViewMode] = useState<'all' | 'combinations' | 'individual'>('all');

  const { data: drugs, isLoading, error } = useDrugs({
    ...filters,
    search: searchQuery || urlSearchQuery || undefined,
  });

  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { isAdmin } = useAuth();

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

  // Separate combination regimens from individual drugs
  const { combinationDrugs, individualDrugs } = useMemo(() => {
    const combinations = filteredDrugs.filter(drug => drug.drug_class === 'Combinatietherapie');
    const individuals = filteredDrugs.filter(drug => drug.drug_class !== 'Combinatietherapie');
    return { combinationDrugs: combinations, individualDrugs: individuals };
  }, [filteredDrugs]);

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
      toast.error('Geen favorieten om te exporteren');
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
    } catch (err) {
      console.error('Error exporting favorites:', err);
      toast.error('Fout bij exporteren favorieten');
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
      <div className="container py-8">
        {/* Back to categories link */}
        {category && (
          <Link 
            to="/home" 
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Terug naar categorieën
          </Link>
        )}

        <div className="mb-8">
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
                <h1 className="text-3xl font-bold">{categoryConfig.name}</h1>
              </div>
              <p className="text-muted-foreground">
                Doorzoek medicijnen voor {categoryConfig.name.toLowerCase()}. Klik op een medicijn voor gedetailleerde informatie.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-2">Medicijnbibliotheek</h1>
              <p className="text-muted-foreground">
                Doorzoek alle medicijnen. Klik op een medicijn voor gedetailleerde informatie en patiëntfolders.
              </p>
            </>
          )}
        </div>

        {/* Active filter indicator */}
        {(selectedSubtype || selectedStage || selectedSubcategory || selectedDiseaseArea) && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Actief filter:</span>
            {selectedSubtype && (
              <Badge variant="secondary" className="gap-1">
                {category === 'breast' && 'subtypes' in (categoryConfig || {}) 
                  ? (categoryConfig as any).subtypes.find((s: any) => s.key === selectedSubtype)?.label 
                  : selectedSubtype}
                <button onClick={() => handleSubtypeClick(selectedSubtype)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedStage && (
              <Badge variant="secondary" className="gap-1">
                {category === 'breast' && 'stages' in (categoryConfig || {})
                  ? (categoryConfig as any).stages.find((s: any) => s.key === selectedStage)?.label
                  : selectedStage}
                <button onClick={() => handleStageClick(selectedStage)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedSubcategory && (
              <Badge variant="secondary" className="gap-1">
                {category === 'other' && 'subcategories' in (categoryConfig || {})
                  ? (categoryConfig as any).subcategories.find((s: any) => s.key === selectedSubcategory)?.label
                  : selectedSubcategory}
                <button onClick={() => handleSubcategoryClick(selectedSubcategory)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedDiseaseArea && (
              <Badge variant="secondary" className="gap-1">
                {(category === 'urology' || category === 'gynecology') && 'diseaseAreas' in (categoryConfig || {})
                  ? (categoryConfig as any).diseaseAreas.find((s: any) => s.key === selectedDiseaseArea)?.label
                  : selectedDiseaseArea}
                <button onClick={() => handleDiseaseAreaClick(selectedDiseaseArea)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearCategoryFilters} className="text-xs">
              Wis filter
            </Button>
          </div>
        )}


        {/* Category-specific navigation cards */}
        {categoryConfig && (
          <div className="mb-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Breast cancer subtypes and stages */}
              {category === 'breast' && 'subtypes' in categoryConfig && (
                <>
                  <div className="col-span-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Subtypen</h3>
                  </div>
                  {categoryConfig.subtypes.map((subtype) => (
                    <Card 
                      key={subtype.key}
                      onClick={() => handleSubtypeClick(subtype.key)}
                      className={`cursor-pointer hover:border-pink-300 hover:shadow-sm transition-all ${
                        selectedSubtype === subtype.key ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-pink-700 dark:text-pink-400">{subtype.label}</h4>
                        <p className="text-xs text-muted-foreground">{subtype.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="col-span-full mt-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Stadia</h3>
                  </div>
                  {categoryConfig.stages.map((stage) => (
                    <Card 
                      key={stage.key}
                      onClick={() => handleStageClick(stage.key)}
                      className={`cursor-pointer hover:border-pink-300 hover:shadow-sm transition-all ${
                        selectedStage === stage.key ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium">{stage.label}</h4>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Urology disease areas */}
              {category === 'urology' && 'diseaseAreas' in categoryConfig && (
                <>
                  {categoryConfig.diseaseAreas.map((area) => (
                    <Card 
                      key={area.key}
                      onClick={() => handleDiseaseAreaClick(area.key)}
                      className={`cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all ${
                        selectedDiseaseArea === area.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-blue-700 dark:text-blue-400">{area.label}</h4>
                        <p className="text-xs text-muted-foreground">{area.description}</p>
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
                      className={`cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all ${
                        selectedDiseaseArea === area.key ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-purple-700 dark:text-purple-400">{area.label}</h4>
                        <p className="text-xs text-muted-foreground">{area.description}</p>
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
                      className={`cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all ${
                        selectedSubcategory === subcat.key ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium text-emerald-700 dark:text-emerald-400">{subcat.label}</h4>
                        <p className="text-xs text-muted-foreground">{subcat.description}</p>
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
                className="gap-2"
              >
                Alles
                <Badge variant={viewMode === 'all' ? 'secondary' : 'outline'} className="ml-1">
                  {filteredDrugs.length}
                </Badge>
              </Button>
              <Button
                variant={viewMode === 'combinations' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('combinations')}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Combinatieschema's
                <Badge variant={viewMode === 'combinations' ? 'secondary' : 'outline'} className="ml-1">
                  {combinationDrugs.length}
                </Badge>
              </Button>
              <Button
                variant={viewMode === 'individual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('individual')}
                className="gap-2"
              >
                <Pill className="h-4 w-4" />
                Individuele Medicijnen
                <Badge variant={viewMode === 'individual' ? 'secondary' : 'outline'} className="ml-1">
                  {individualDrugs.length}
                </Badge>
              </Button>
            </div>
          </div>
        )}

        {/* Favorites Section */}
        {favoriteDrugs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <h2 className="text-xl font-semibold">Favorieten</h2>
                <Badge variant="secondary">{favoriteDrugs.length}</Badge>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-1.5">
                    <Checkbox
                      checked={exportIncludeDosing}
                      onCheckedChange={(checked) => setExportIncludeDosing(checked as boolean)}
                    />
                    Dosering
                  </label>
                  <label className="flex items-center gap-1.5">
                    <Checkbox
                      checked={exportIncludeSideEffects}
                      onCheckedChange={(checked) => setExportIncludeSideEffects(checked as boolean)}
                    />
                    Bijwerkingen
                  </label>
                </div>
                <Button
                  onClick={handleExportFavorites}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Exporteer als PDF
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favoriteDrugs.map((drug) => (
                <DrugCard
                  key={drug.id}
                  drug={drug}
                  isFavorite={true}
                  onToggleFavorite={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(drug.id);
                  }}
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
              placeholder="Zoek op medicijnnaam of merknaam..."
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
            Filters
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
                    <CardTitle className="text-lg">Filters</CardTitle>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Wissen
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Drug Class Filter */}
                  <div>
                    <h4 className="font-medium mb-3">Medicijnklasse</h4>
                    <div className="space-y-2">
                      <TooltipProvider delayDuration={300}>
                        {displayDrugClasses.map((drugClass) => {
                          const fullName = DRUG_CLASS_FULL_NAMES[drugClass];
                          const label = (
                            <label
                              htmlFor={`class-${drugClass}`}
                              className="text-sm cursor-pointer"
                            >
                              {drugClass}
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
                      <h4 className="font-medium mb-3">Ziektegebied</h4>
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
                              {disease}
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
                  Er is een fout opgetreden bij het laden van medicijnen.
                </CardContent>
              </Card>
            ) : filteredDrugs?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Pill className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Geen medicijnen gevonden</h3>
                  <p className="text-muted-foreground mb-4">
                    {(selectedSubtype || selectedStage) 
                      ? 'Geen medicijnen gevonden voor dit filter. Probeer een ander subtype of stadium.'
                      : 'Pas uw zoekopdracht of filters aan om resultaten te zien.'}
                  </p>
                  <Button variant="outline" onClick={() => { clearFilters(); clearCategoryFilters(); }}>
                    Alle filters wissen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <SortableDrugList
                  combinationDrugs={combinationDrugs}
                  individualDrugs={individualDrugs}
                  viewMode={viewMode}
                  isFavorite={isFavorite}
                  toggleFavorite={toggleFavorite}
                  isAdmin={isAdmin}
                />

                <p className="text-sm text-muted-foreground pt-2">
                  Totaal: {filteredDrugs?.length} item{filteredDrugs?.length !== 1 ? 's' : ''} gevonden
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}