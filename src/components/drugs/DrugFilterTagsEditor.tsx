import { useState, useMemo } from 'react';
import { Drug, DRUG_CATEGORIES } from '@/types/drug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tags, Save, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

// Canonical keywords that are stored in approved_indications for filtering
const FILTER_TAGS = {
  subtypes: [
    { key: 'hr_positive', label: 'HR+ (Hormoongevoelig)', canonical: 'HR-positief' },
    { key: 'her2_positive', label: 'HER2-positief', canonical: 'HER2-positief' },
    { key: 'triple_negative', label: 'Triple negatief (TNBC)', canonical: 'Triple negatief' },
  ],
  stages: [
    { key: 'neoadjuvant_adjuvant', label: 'Neoadjuvant/Adjuvant', canonical: 'Neoadjuvant' },
    { key: 'metastatic', label: 'Gemetastaseerd', canonical: 'Gemetastaseerd' },
  ],
} as const;

// All canonical keywords used by the filter system
const ALL_FILTER_CANONICALS = [
  ...FILTER_TAGS.subtypes.map(t => t.canonical),
  ...FILTER_TAGS.stages.map(t => t.canonical),
];

// Keywords that map to each filter for detection
const DETECTION_KEYWORDS: Record<string, string[]> = {
  'HR-positief': ['HR+', 'HR-positief', 'Hormoongevoelig', 'ER+', 'PR+'],
  'HER2-positief': ['HER2+', 'HER2-positief', 'HER2 positief'],
  'Triple negatief': ['TNBC', 'Triple negatief', 'triple negatief'],
  'Neoadjuvant': ['Neoadjuvant', 'Adjuvant', 'neoadjuvant', 'adjuvant'],
  'Gemetastaseerd': ['Gemetastaseerd', 'gemetastaseerd', 'metastatic', 'Stadium IV'],
};

function hasTag(indications: string[] | undefined, canonical: string): boolean {
  if (!indications) return false;
  const keywords = DETECTION_KEYWORDS[canonical] || [canonical];
  return indications.some(ind =>
    keywords.some(kw => ind.toLowerCase().includes(kw.toLowerCase()))
  );
}

interface DrugFilterTagsEditorProps {
  drug: Drug;
}

export function DrugFilterTagsEditor({ drug }: DrugFilterTagsEditorProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Determine which category this drug belongs to
  const drugCategory = useMemo(() => {
    const areas = drug.disease_areas || [];
    if (areas.includes('Borstkanker')) return 'breast';
    // Other categories use diseaseAreas, not subtypes/stages
    return null;
  }, [drug.disease_areas]);

  // Current active tags
  const [activeTags, setActiveTags] = useState<Set<string>>(() => {
    const tags = new Set<string>();
    for (const tag of [...FILTER_TAGS.subtypes, ...FILTER_TAGS.stages]) {
      if (hasTag(drug.approved_indications, tag.canonical)) {
        tags.add(tag.canonical);
      }
    }
    return tags;
  });

  const showSubtypes = drugCategory === 'breast';
  const showStages = drugCategory === 'breast';

  const toggleTag = (canonical: string) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(canonical)) {
        next.delete(canonical);
      } else {
        next.add(canonical);
      }
      return next;
    });
  };

  const hasChanges = useMemo(() => {
    const original = new Set<string>();
    for (const tag of [...FILTER_TAGS.subtypes, ...FILTER_TAGS.stages]) {
      if (hasTag(drug.approved_indications, tag.canonical)) {
        original.add(tag.canonical);
      }
    }
    if (original.size !== activeTags.size) return true;
    for (const t of activeTags) {
      if (!original.has(t)) return true;
    }
    return false;
  }, [activeTags, drug.approved_indications]);

  // Early return after all hooks
  if (!showSubtypes && !showStages) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Start with existing indications, removing all filter-related keywords
      const existingIndications = (drug.approved_indications || []).filter(ind => {
        // Keep if it doesn't match any filter canonical keyword
        return !ALL_FILTER_CANONICALS.some(canonical => {
          const keywords = DETECTION_KEYWORDS[canonical] || [canonical];
          return keywords.some(kw => ind.toLowerCase().includes(kw.toLowerCase()));
        });
      });

      // Add active tags as canonical keywords
      const newIndications = [...existingIndications, ...Array.from(activeTags)];

      const { error } = await supabase
        .from('drugs')
        .update({ approved_indications: newIndications })
        .eq('id', drug.id);

      if (error) throw error;

      toast.success('Filtertags opgeslagen');
      queryClient.invalidateQueries({ queryKey: ['drug', drug.id] });
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
    } catch (e: any) {
      toast.error(e.message || 'Opslaan mislukt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="h-4 w-4" />
          Filtertags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSubtypes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Subtypen</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_TAGS.subtypes.map(tag => (
                <Badge
                  key={tag.key}
                  variant={activeTags.has(tag.canonical) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-all select-none ${
                    activeTags.has(tag.canonical) 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleTag(tag.canonical)}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {showStages && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Stadia</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_TAGS.stages.map(tag => (
                <Badge
                  key={tag.key}
                  variant={activeTags.has(tag.canonical) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-all select-none ${
                    activeTags.has(tag.canonical) 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleTag(tag.canonical)}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {hasChanges && (
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={isSaving}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Opslaan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
