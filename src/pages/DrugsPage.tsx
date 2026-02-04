import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useDrugs } from '@/hooks/useDrugs';
import { useFavorites } from '@/hooks/useFavorites';
import { DrugFilters, DRUG_CLASSES, DRUG_DISEASE_AREAS, Drug } from '@/types/drug';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, Pill, Loader2, Star, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
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

export default function DrugsPage() {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Medicijnbibliotheek</h1>
          <p className="text-muted-foreground">
            Doorzoek medicijnen voor urologische oncologie. Klik op een medicijn voor gedetailleerde informatie en patiëntfolders.
          </p>
        </div>

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
                      {DRUG_CLASSES.map((drugClass) => (
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

                  {/* Disease Area Filter */}
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