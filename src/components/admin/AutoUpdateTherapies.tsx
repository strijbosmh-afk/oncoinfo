import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Search,
  Plus,
  ChevronDown,
  Pencil,
  Check,
  X,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { DRUG_CLASSES, DRUG_DISEASE_AREAS } from '@/types/drug';

interface DiscoveredTherapy {
  generic_name: string;
  brand_names?: string[];
  drug_class: string;
  mechanism_of_action?: string;
  disease_areas: string[];
  approved_indications?: string[];
  administration_route?: string;
  is_on_zvz?: boolean;
  source: string;
  evidence_level?: string;
  rationale: string;
  // UI state
  selected?: boolean;
  editing?: boolean;
}

export function AutoUpdateTherapies() {
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [therapies, setTherapies] = useState<DiscoveredTherapy[]>([]);
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleScan = async () => {
    setScanning(true);
    setTherapies([]);
    setScanSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('auto-update-therapies', {
        body: {
          action: 'scan',
          disease_areas: selectedAreas.length > 0 ? selectedAreas : undefined,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const found = (data.therapies || []).map((t: DiscoveredTherapy) => ({
        ...t,
        selected: true,
        editing: false,
      }));

      setTherapies(found);
      setScanSummary(data.scan_summary || null);
      setHasScanned(true);

      toast({
        title: 'Scan voltooid',
        description: `${found.length} nieuwe therapie(ën) gevonden.`,
      });
    } catch (err: any) {
      toast({
        title: 'Scan mislukt',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    setTherapies((prev) => prev.map((t) => ({ ...t, selected: checked })));
  };

  const toggleOne = (index: number) => {
    setTherapies((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const startEdit = (index: number) => {
    setTherapies((prev) =>
      prev.map((t, i) => (i === index ? { ...t, editing: true } : t))
    );
  };

  const cancelEdit = (index: number) => {
    setTherapies((prev) =>
      prev.map((t, i) => (i === index ? { ...t, editing: false } : t))
    );
  };

  const updateTherapy = (index: number, field: string, value: any) => {
    setTherapies((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const selectedCount = therapies.filter((t) => t.selected).length;

  const handleAdd = async () => {
    const selected = therapies.filter((t) => t.selected);
    if (!selected.length) return;

    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-update-therapies', {
        body: {
          action: 'add',
          therapies: selected.map(({ selected: _, editing: __, ...t }) => t),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const addedCount = data.added?.length || 0;
      const errorCount = data.errors?.length || 0;
      const skippedCount = data.skipped?.length || 0;

      // Remove added + skipped therapies from the list
      if (data.added?.length || data.skipped?.length) {
        const processedNames = new Set([
          ...(data.added || []).map((n: string) => n.toLowerCase()),
          ...(data.skipped || []).map((n: string) => n.toLowerCase()),
        ]);
        setTherapies((prev) => prev.filter((t) => !processedNames.has(t.generic_name.toLowerCase())));
      }

      queryClient.invalidateQueries({ queryKey: ['drugs'] });

      const parts: string[] = [];
      if (addedCount > 0) parts.push(`${addedCount} toegevoegd`);
      if (skippedCount > 0) parts.push(`${skippedCount} overgeslagen (duplicaat)`);
      if (errorCount > 0) parts.push(`${errorCount} fout(en)`);

      toast({
        title: 'Therapieën verwerkt',
        description: parts.join(', ') + '.',
        variant: errorCount > 0 ? 'destructive' : 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Fout bij toevoegen',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const allSelected = therapies.length > 0 && therapies.every((t) => t.selected);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Auto-update Therapieën
          </CardTitle>
          <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 text-[10px] px-1.5 py-0">
            BETA
          </Badge>
        </div>
        <CardDescription>
          Scan PubMed, RIZIV en ESMO/ASCO richtlijnen voor nieuwe oncologische therapieën
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter area selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Ziektegebieden (optioneel filter)</Label>
          <div className="flex flex-wrap gap-2">
            {DRUG_DISEASE_AREAS.map((area) => (
              <Button
                key={area}
                variant={selectedAreas.includes(area) ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7"
                onClick={() =>
                  setSelectedAreas((prev) =>
                    prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
                  )
                }
              >
                {area}
              </Button>
            ))}
          </div>
        </div>

        {/* Scan button */}
        <Button onClick={handleScan} disabled={scanning} className="gap-2">
          {scanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {scanning ? 'Bezig met scannen…' : 'Start scan'}
        </Button>

        {/* Summary */}
        {scanSummary && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Scan samenvatting</p>
            {scanSummary}
          </div>
        )}

        {/* Results */}
        {hasScanned && therapies.length === 0 && !scanning && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Check className="h-4 w-4 text-green-500" />
            Geen nieuwe therapieën gevonden — de bibliotheek is up-to-date.
          </div>
        )}

        {therapies.length > 0 && (
          <div className="space-y-3">
            {/* Select all + add */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(!!checked)}
                />
                <Label className="text-sm cursor-pointer font-medium">
                  Alles selecteren ({therapies.length})
                </Label>
              </div>
              <Button
                onClick={handleAdd}
                disabled={adding || selectedCount === 0}
                size="sm"
                className="gap-2"
              >
                {adding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {selectedCount} toevoegen
              </Button>
            </div>

            {/* Therapy cards */}
            <div className="space-y-2">
              {therapies.map((therapy, index) => (
                <TherapyCard
                  key={`${therapy.generic_name}-${index}`}
                  therapy={therapy}
                  index={index}
                  onToggle={toggleOne}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onUpdate={updateTherapy}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TherapyCard({
  therapy,
  index,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onUpdate,
}: {
  therapy: DiscoveredTherapy;
  index: number;
  onToggle: (i: number) => void;
  onStartEdit: (i: number) => void;
  onCancelEdit: (i: number) => void;
  onUpdate: (i: number, field: string, value: any) => void;
}) {
  if (therapy.editing) {
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Bewerken</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdate(index, 'editing', false)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCancelEdit(index)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Naam</Label>
            <Input
              value={therapy.generic_name}
              onChange={(e) => onUpdate(index, 'generic_name', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Merknamen</Label>
            <Input
              value={therapy.brand_names?.join(', ') || ''}
              onChange={(e) =>
                onUpdate(
                  index,
                  'brand_names',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              className="h-8 text-sm"
              placeholder="bijv. Keytruda, Opdivo"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Klasse</Label>
            <Select value={therapy.drug_class} onValueChange={(v) => onUpdate(index, 'drug_class', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {DRUG_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Toedieningsweg</Label>
            <Select
              value={therapy.administration_route || ''}
              onValueChange={(v) => onUpdate(index, 'administration_route', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecteer" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="Oraal">Oraal</SelectItem>
                <SelectItem value="Intraveneus">Intraveneus</SelectItem>
                <SelectItem value="Subcutaan">Subcutaan</SelectItem>
                <SelectItem value="Intramusculair">Intramusculair</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Werkingsmechanisme</Label>
          <Input
            value={therapy.mechanism_of_action || ''}
            onChange={(e) => onUpdate(index, 'mechanism_of_action', e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Ziektegebieden (kommagescheiden)</Label>
          <Input
            value={therapy.disease_areas?.join(', ') || ''}
            onChange={(e) =>
              onUpdate(
                index,
                'disease_areas',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            className="h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={therapy.is_on_zvz || false}
            onCheckedChange={(checked) => onUpdate(index, 'is_on_zvz', !!checked)}
          />
          <Label className="text-xs cursor-pointer">RIZIV terugbetaald</Label>
        </div>
      </div>
    );
  }

  return (
    <Collapsible>
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          <Checkbox checked={therapy.selected} onCheckedChange={() => onToggle(index)} />
          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-center gap-2 text-left">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{therapy.generic_name}</span>
                  {therapy.brand_names?.length ? (
                    <span className="text-xs text-muted-foreground truncate">
                      ({therapy.brand_names.join(', ')})
                    </span>
                  ) : null}
                  {therapy.is_on_zvz && (
                    <Badge variant="outline" className="text-green-600 border-green-400 text-[10px] h-5 px-1.5">
                      ✓ RIZIV
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {therapy.drug_class}
                  </Badge>
                  {therapy.evidence_level && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                      {therapy.evidence_level}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground truncate">
                    {therapy.disease_areas?.join(', ')}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </CollapsibleTrigger>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onStartEdit(index)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-2 border-t">
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">{therapy.rationale}</p>
            </div>
            {therapy.mechanism_of_action && (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">Mechanisme: </span>
                <span className="text-xs">{therapy.mechanism_of_action}</span>
              </div>
            )}
            {therapy.source && (
              <div className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{therapy.source}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
