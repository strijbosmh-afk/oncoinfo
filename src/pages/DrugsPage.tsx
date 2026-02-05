import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useDrugs } from '@/hooks/useDrugs';
import { useFavorites } from '@/hooks/useFavorites';
import { DrugFilters, DRUG_CLASSES, DRUG_DISEASE_AREAS, Drug, DRUG_CATEGORIES, DrugCategoryKey } from '@/types/drug';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, Pill, Loader2, Star, FileText, ChevronLeft, Heart, Stethoscope, Baby, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  };
  return colors[drugClass] || 'bg-gray-100 text-gray-800 border-gray-200';
};

interface DrugCardProps {
  drug: Drug;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

function DrugCard({ drug, isFavorite, onToggleFavorite }: DrugCardProps) {
  return (
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
            <Badge className={getDrugClassColor(drug.drug_class)}>
              {drug.drug_class}
            </Badge>
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
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') as DrugCategoryKey | null;
  const categoryConfig = category ? DRUG_CATEGORIES[category] : null;

  const [filters, setFilters] = useState<DrugFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportIncludeDosing, setExportIncludeDosing] = useState(true);
  const [exportIncludeSideEffects, setExportIncludeSideEffects] = useState(true);

  const { data: drugs, isLoading, error } = useDrugs({
    ...filters,
    search: searchQuery || undefined,
  });

  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  // Get display drug classes based on category
  const displayDrugClasses = useMemo(() => {
    if (categoryConfig && 'drugClasses' in categoryConfig) {
      return categoryConfig.drugClasses as readonly string[];
    }
    return DRUG_CLASSES;
  }, [categoryConfig]);

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
  const favoriteDrugs = drugs?.filter(drug => favorites.includes(drug.id)) || [];

  return (
    <Layout>
      <div className="container py-8">
        {/* Back to categories link */}
        {category && (
          <Link 
            to="/" 
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
                      className="cursor-pointer hover:border-pink-300 hover:shadow-sm transition-all"
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
                      className="cursor-pointer hover:border-pink-300 hover:shadow-sm transition-all"
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
                      className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
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
                      className="cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all"
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
                      className="cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all"
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
                      {displayDrugClasses.map((drugClass) => (
                        <div key={drugClass} className="flex items-center space-x-2">
                          <Checkbox
                            id={`class-${drugClass}`}
                            checked={filters.drug_class?.includes(drugClass) ?? false}
                            onCheckedChange={(checked) =>
                              handleClassFilter(drugClass, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`class-${drugClass}`}
                            className="text-sm cursor-pointer"
                          >
                            {drugClass}
                          </label>
                        </div>
                      ))}
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
            ) : drugs?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Pill className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Geen medicijnen gevonden</h3>
                  <p className="text-muted-foreground mb-4">
                    Pas uw zoekopdracht of filters aan om resultaten te zien.
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Filters wissen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {drugs?.length} medicijn{drugs?.length !== 1 ? 'en' : ''} gevonden
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {drugs?.map((drug) => (
                    <DrugCard
                      key={drug.id}
                      drug={drug}
                      isFavorite={isFavorite(drug.id)}
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
          </div>
        </div>
      </div>
    </Layout>
  );
}