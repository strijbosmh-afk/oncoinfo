import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Drug } from '@/types/drug';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Layers, GripVertical, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
    'Combinatietherapie': 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300',
    'CDK4/6i': 'bg-rose-100 text-rose-800 border-rose-200',
    'HER2-remmers': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Immunotherapie': 'bg-violet-100 text-violet-800 border-violet-200',
    'Immunotherapie (IO/ICI)': 'bg-violet-100 text-violet-800 border-violet-200',
    'SERM': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    'Aromataseremmers': 'bg-lime-100 text-lime-800 border-lime-200',
    'SERD': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'LHRH agonist': 'bg-sky-100 text-sky-800 border-sky-200',
  };
  return colors[drugClass] || 'bg-gray-100 text-gray-800 border-gray-200';
};

interface SortableDrugCardProps {
  drug: Drug;
  isFavorite: boolean;
  isMostUsed: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleMostUsed: (e: React.MouseEvent) => void;
  isEditMode: boolean;
  translateTerm?: (term: string) => string;
}

export function SortableDrugCard({ drug, isFavorite, isMostUsed, onToggleFavorite, onToggleMostUsed, isEditMode, translateTerm }: SortableDrugCardProps) {
  const { t } = useTranslation();
  const tMed = translateTerm || ((s: string) => s);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: drug.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const isCombo = drug.drug_class === 'Combinatietherapie';

  if (isCombo) {
    return (
      <div ref={setNodeRef} style={style} className="relative">
        {isEditMode && (
          <div
            {...attributes}
            {...listeners}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 cursor-grab active:cursor-grabbing hover:bg-amber-200/50 rounded transition-colors"
          >
            <GripVertical className="h-5 w-5 text-amber-600" />
          </div>
        )}
        <Card className={`h-full border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer relative group ${isEditMode ? 'pl-10' : ''}`}>
        <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5">
          <button
            onClick={onToggleMostUsed}
            className="p-1.5 rounded-full hover:bg-amber-100 transition-colors"
            aria-label={t('mostUsed.toggle')}
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
          <Link to={`/drugs/${drug.id}`} className={isEditMode ? 'pointer-events-none' : ''}>
            <CardHeader className="pb-2 pr-16">
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
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 cursor-grab active:cursor-grabbing hover:bg-muted rounded transition-colors"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <Card className={`h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer relative group ${isEditMode ? 'pl-10' : ''}`}>
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
        <Link to={`/drugs/${drug.id}`} className={isEditMode ? 'pointer-events-none' : ''}>
          <CardHeader className="pb-2 pr-16">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{drug.generic_name}</CardTitle>
              {drug.is_on_zvz ? (
                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 text-[10px] px-1.5 py-0">
                  ✓ RIZIV
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 text-[10px] px-1.5 py-0">
                  ✗ Niet RIZIV
                </Badge>
              )}
            </div>
            {drug.brand_names.length > 0 && (
              <CardDescription>
                {drug.brand_names.join(', ')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {drug.administration_route && (
             <p className="text-sm text-muted-foreground mb-2">
               {tMed(drug.administration_route)}
              </p>
            )}
            <div className="flex items-end justify-between gap-2">
              {drug.disease_areas.length > 0 ? (
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
              ) : <div />}
              <Badge className={`${getDrugClassColor(drug.drug_class)} text-[10px] px-1.5 py-0 whitespace-nowrap`}>
                {tMed(drug.drug_class)}
              </Badge>
            </div>
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}
