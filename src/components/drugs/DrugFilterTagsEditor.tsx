import { useState, useMemo, useEffect } from 'react';
import { Drug } from '@/types/drug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tags, Save, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useHospital } from '@/contexts/HospitalContext';

// All available filter tags per group
export const FILTER_TAGS = {
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

interface DrugFilterTagsEditorProps {
  drug: Drug;
}

export function DrugFilterTagsEditor({ drug }: DrugFilterTagsEditorProps) {
  const queryClient = useQueryClient();
  const { hospital } = useHospital();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [savedTags, setSavedTags] = useState<Set<string>>(new Set());

  const drugCategory = useMemo(() => {
    const areas = drug.disease_areas || [];
    if (areas.includes('Borstkanker')) return 'breast';
    return null;
  }, [drug.disease_areas]);

  const showSubtypes = drugCategory === 'breast';
  const showStages = drugCategory === 'breast';

  // Load hospital-specific tags
  useEffect(() => {
    if (!hospital?.id || (!showSubtypes && !showStages)) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('hospital_drug_filter_tags')
        .select('filter_tags')
        .eq('hospital_id', hospital.id)
        .eq('drug_id', drug.id)
        .maybeSingle();
      const tags = new Set<string>(data?.filter_tags || []);
      setActiveTags(tags);
      setSavedTags(tags);
      setIsLoading(false);
    };
    load();
  }, [hospital?.id, drug.id, showSubtypes, showStages]);

  const hasChanges = useMemo(() => {
    if (activeTags.size !== savedTags.size) return true;
    for (const t of activeTags) {
      if (!savedTags.has(t)) return true;
    }
    return false;
  }, [activeTags, savedTags]);

  if (!showSubtypes && !showStages) return null;

  const toggleTag = (canonical: string) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(canonical)) next.delete(canonical);
      else next.add(canonical);
      return next;
    });
  };

  const handleSave = async () => {
    if (!hospital?.id) return;
    setIsSaving(true);
    try {
      const tagsArray = Array.from(activeTags);
      const { error } = await supabase
        .from('hospital_drug_filter_tags')
        .upsert(
          { hospital_id: hospital.id, drug_id: drug.id, filter_tags: tagsArray },
          { onConflict: 'hospital_id,drug_id' }
        );
      if (error) throw error;
      setSavedTags(new Set(tagsArray));
      toast.success('Filtertags opgeslagen');
      queryClient.invalidateQueries({ queryKey: ['hospital-filter-tags'] });
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
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden...
          </div>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
