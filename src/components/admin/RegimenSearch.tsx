import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Plus, ExternalLink, ChevronDown, ChevronUp, Upload, FileText, Sparkles, PenLine, Link, Globe, Trash2, Wand2 } from 'lucide-react';
import { DRUG_CLASSES, DRUG_DISEASE_AREAS, ADMINISTRATION_ROUTES } from '@/types/drug';

interface PubMedResult {
  pmid: string;
  title: string;
  abstract: string;
  journal: string;
  year: number | null;
  authors: string[];
  doi: string;
}

interface CTGovResult {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  conditions: string[];
  interventions: string[];
  enrollment: number | null;
}

interface ExtractedRegimen {
  generic_name: string;
  brand_names?: string;
  drug_class: string;
  disease_areas?: string[];
  mechanism_of_action?: string;
  administration_route?: string;
  study_name?: string;
  dosing?: string;
  side_effects_common?: string[];
  side_effects_serious?: string[];
  contraindications?: string[];
  monitoring?: string;
}

const DISCIPLINES = [
  'Prostaatkanker',
  'Blaaskanker',
  'Niercelcarcinoom',
  'Borstkanker',
  'Ovariumcarcinoom',
  'Endometriumcarcinoom',
  'Cervixcarcinoom',
  'Testiskanker',
  'Peniskanker',
  'Vulvacarcinoom',
];

const DRUG_TYPES = [
  { value: 'all', label: 'Alle typen' },
  { value: 'chemotherapy', label: 'Chemotherapie' },
  { value: 'immunotherapy', label: 'Immunotherapie (IO)' },
  { value: 'targeted therapy', label: 'Targeted therapie' },
  { value: 'PARP inhibitor', label: 'PARPi' },
  { value: 'ADC antibody drug conjugate', label: 'ADC' },
  { value: 'hormone therapy', label: 'Hormonale therapie' },
  { value: 'TKI tyrosine kinase', label: 'TKI' },
  { value: 'combination', label: 'Combinatietherapie' },
];

interface RegimenSearchProps {
  canAddTreatments?: boolean;
}

export function RegimenSearch({ canAddTreatments = false }: RegimenSearchProps) {
  const { toast } = useToast();
  const [discipline, setDiscipline] = useState('');
  const [drugType, setDrugType] = useState('');
  const [source, setSource] = useState('pubmed');
  const [studyName, setStudyName] = useState('');
  const [pubmedResults, setPubmedResults] = useState<PubMedResult[]>([]);
  const [ctgovResults, setCtgovResults] = useState<CTGovResult[]>([]);
  const [pdfResults, setPdfResults] = useState<string>('');
  const [extractedRegimens, setExtractedRegimens] = useState<ExtractedRegimen[]>([]);
  const [pdfSummary, setPdfSummary] = useState<string>('');
  const [relevanceWarning, setRelevanceWarning] = useState<string | null>(null);
  const [expandedPmid, setExpandedPmid] = useState<string | null>(null);
  const [expandedRegimen, setExpandedRegimen] = useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [articleUrl, setArticleUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quickDrugName, setQuickDrugName] = useState('');
  const [editingDrug, setEditingDrug] = useState({
    generic_name: '',
    drug_class: '',
    disease_areas: [] as string[],
    mechanism_of_action: '',
    brand_names: '',
    administration_route: '',
    study_name: '',
    standard_dose: '',
    dosing_frequency: '',
    cycle_length_days: '',
    is_combination: false,
    is_on_zvz: false,
    components: [{ name: '', dose: '', route: '', interval: '', cycle_length: '' }] as {
      name: string; dose: string; route: string; interval: string; cycle_length: string;
    }[],
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('search-regimens', {
        body: { discipline, drug_type: drugType && drugType !== 'all' ? drugType : undefined, source, study_name: studyName || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setPubmedResults(data.results?.pubmed || []);
      setCtgovResults(data.results?.ctgov || []);
      if ((data.results?.pubmed?.length || 0) === 0 && (data.results?.ctgov?.length || 0) === 0) {
        toast({ title: 'Geen resultaten', description: 'Probeer andere zoektermen.' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Zoekfout', description: error.message, variant: 'destructive' });
    },
  });

  const pdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('extract-pdf', {
        body: { pdf_base64: base64, filename: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const text = data.text || '';
      setPdfResults(text);
      setExtractedRegimens([]);
      setPdfSummary('');
      setRelevanceWarning(null);
      if (text && text.length > 20) {
        toast({ title: 'PDF verwerkt', description: `${data.pages || 0} pagina's geëxtraheerd. Bekijk de preview en start de analyse.` });
      } else {
        toast({ title: 'Geen tekst gevonden', description: 'Kon geen bruikbare tekst uit de PDF extraheren.', variant: 'destructive' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'PDF fout', description: error.message, variant: 'destructive' });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.functions.invoke('analyze-pdf-drug', {
        body: { text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const regimens = data.regimens || [];
      setExtractedRegimens(regimens);
      setPdfSummary(data.summary || '');
      // Keep pdfResults visible as preview
      setRelevanceWarning(null);

      if (data.is_oncology_relevant === false) {
        setRelevanceWarning(data.relevance_reason || 'Dit artikel lijkt niet over oncologie te gaan.');
        toast({ title: 'Geen oncologische content', description: data.relevance_reason || 'Dit artikel bevat geen kankerbehandelingen.', variant: 'destructive' });
      } else if (regimens.length > 0) {
        toast({ title: 'AI-analyse voltooid', description: `${regimens.length} regimen(s) gevonden met veiligheidsinformatie.` });
      } else {
        toast({ title: 'Geen regimens gevonden', description: 'Het artikel is oncologie-gerelateerd maar er werden geen specifieke regimens geëxtraheerd.' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'AI-analyse mislukt', description: error.message, variant: 'destructive' });
    },
  });

  const urlMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke('scrape-article', {
        body: { url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const text = data.text || '';
      setPdfResults(text);
      setExtractedRegimens([]);
      setPdfSummary('');
      setRelevanceWarning(null);
      if (text && text.length > 20) {
        toast({ title: 'Artikel opgehaald', description: `${data.chars || 0} tekens geëxtraheerd van ${data.source}. Bekijk de preview en start de analyse.` });
      } else {
        toast({ title: 'Geen tekst gevonden', description: 'Kon geen bruikbare tekst ophalen.', variant: 'destructive' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'URL fout', description: error.message, variant: 'destructive' });
    },
  });

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'Bestand te groot', description: 'Maximaal 20MB.', variant: 'destructive' });
        return;
      }
      pdfMutation.mutate(file);
    }
    e.target.value = '';
  };

  const addDrugMutation = useMutation({
    mutationFn: async () => {
      const dosingInfo: any = {};
      if (editingDrug.standard_dose) dosingInfo.standard_dose = editingDrug.standard_dose;
      if (editingDrug.dosing_frequency) dosingInfo.frequency = editingDrug.dosing_frequency;

      if (editingDrug.is_combination && editingDrug.components.length > 0) {
        const componentDetails = editingDrug.components
          .filter(c => c.name)
          .map(c => {
            const parts = [c.name];
            if (c.dose) parts.push(c.dose);
            if (c.route) parts.push(c.route);
            if (c.interval) parts.push(c.interval);
            if (c.cycle_length) parts.push(`cyclus: ${c.cycle_length} dagen`);
            return parts.join(' ');
          });
        dosingInfo.components = componentDetails.join(' + ');
      }

      const { error } = await supabase.from('drugs').insert({
        generic_name: editingDrug.generic_name,
        drug_class: editingDrug.drug_class,
        disease_areas: editingDrug.disease_areas,
        mechanism_of_action: editingDrug.mechanism_of_action || null,
        brand_names: editingDrug.brand_names ? editingDrug.brand_names.split(',').map(b => b.trim()) : [],
        administration_route: editingDrug.administration_route || null,
        common_regimens: editingDrug.study_name ? [editingDrug.study_name.trim()] : [],
        is_on_zvz: editingDrug.is_on_zvz,
        cycle_length_days: editingDrug.cycle_length_days ? parseInt(editingDrug.cycle_length_days) : null,
        dosing_info: Object.keys(dosingInfo).length > 0 ? dosingInfo : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Medicijn toegevoegd', description: `${editingDrug.generic_name} is toegevoegd aan de bibliotheek.` });
      setAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij toevoegen', description: error.message, variant: 'destructive' });
    },
  });

  const enrichMutation = useMutation({
    mutationFn: async (drugName: string) => {
      const { data, error } = await supabase.functions.invoke('enrich-drug-info', {
        body: { drug_name: drugName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const drug = data.drug;
      setEditingDrug(prev => ({
        ...prev,
        generic_name: drug.generic_name || quickDrugName,
        drug_class: drug.drug_class || prev.drug_class,
        disease_areas: drug.disease_areas || prev.disease_areas,
        mechanism_of_action: drug.mechanism_of_action || prev.mechanism_of_action,
        brand_names: drug.brand_names || prev.brand_names,
        administration_route: drug.administration_route || prev.administration_route,
        standard_dose: drug.standard_dose || prev.standard_dose,
        dosing_frequency: drug.dosing_frequency || prev.dosing_frequency,
        cycle_length_days: drug.cycle_length_days ? String(drug.cycle_length_days) : prev.cycle_length_days,
      }));
      setQuickDrugName('');
      toast({ title: 'AI-verrijking voltooid', description: `Informatie voor "${drug.generic_name}" is ingevuld. Controleer en pas aan indien nodig.` });
    },
    onError: (error: Error) => {
      toast({ title: 'AI-verrijking mislukt', description: error.message, variant: 'destructive' });
    },
  });

  const openAddDialog = (prefill?: { title?: string; disease?: string }) => {
    setEditingDrug({
      generic_name: prefill?.title || '',
      drug_class: drugType ? DRUG_TYPES.find(t => t.value === drugType)?.label || '' : '',
      disease_areas: prefill?.disease ? [prefill.disease] : discipline ? [discipline] : [],
      mechanism_of_action: '',
      brand_names: '',
      administration_route: '',
      study_name: '',
      standard_dose: '',
      dosing_frequency: '',
      cycle_length_days: '',
      is_combination: false,
      is_on_zvz: false,
      components: [{ name: '', dose: '', route: '', interval: '', cycle_length: '' }],
    });
    setAddDialogOpen(true);
  };

  const openAddFromRegimen = (regimen: ExtractedRegimen) => {
    setEditingDrug({
      generic_name: regimen.generic_name || '',
      drug_class: regimen.drug_class || '',
      disease_areas: regimen.disease_areas || [],
      mechanism_of_action: regimen.mechanism_of_action || '',
      brand_names: regimen.brand_names || '',
      administration_route: regimen.administration_route || '',
      study_name: regimen.study_name || '',
      standard_dose: '',
      dosing_frequency: '',
      cycle_length_days: '',
      is_combination: false,
      is_on_zvz: false,
      components: [{ name: '', dose: '', route: '', interval: '', cycle_length: '' }],
    });
    setAddDialogOpen(true);
  };

  const updateComponent = (index: number, field: string, value: string) => {
    setEditingDrug(prev => ({
      ...prev,
      components: prev.components.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  const addComponent = () => {
    if (editingDrug.components.length < 3) {
      setEditingDrug(prev => ({
        ...prev,
        components: [...prev.components, { name: '', dose: '', route: '', interval: '', cycle_length: '' }],
      }));
    }
  };

  const removeComponent = (index: number) => {
    if (editingDrug.components.length > 1) {
      setEditingDrug(prev => ({
        ...prev,
        components: prev.components.filter((_, i) => i !== index),
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe Regimens Zoeken</CardTitle>
        <CardDescription>
          Zoek in PubMed en ClinicalTrials.gov naar nieuwe behandelregimens, of importeer direct vanuit een PDF of URL{' '}
          <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 align-middle border-amber-500/50 text-amber-600">Beta</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Separator before search */}

        {/* Search form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Studienaam (optioneel)</Label>
            <Input
              value={studyName}
              onChange={(e) => setStudyName(e.target.value)}
              placeholder="Bijv. KEYNOTE-426, CheckMate 214"
            />
          </div>
          <div className="space-y-2">
            <Label>Discipline *</Label>
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger>
                <SelectValue placeholder="Kies discipline..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {DISCIPLINES.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type medicijn (optioneel)</Label>
            <Select value={drugType} onValueChange={setDrugType}>
              <SelectTrigger>
                <SelectValue placeholder="Alle typen" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {DRUG_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bron</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="pubmed">PubMed</SelectItem>
                <SelectItem value="ctgov">ClinicalTrials.gov</SelectItem>
                <SelectItem value="both">Beide</SelectItem>
                <SelectItem value="pdf">PDF uploaden</SelectItem>
                <SelectItem value="url">URL / artikel link</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* URL input when source is url */}
        {source === 'url' && (
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label>Artikel URL</Label>
              <Input
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                placeholder="https://pubmed.ncbi.nlm.nih.gov/12345678 of andere URL"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          {source === 'pdf' ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfUpload}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={pdfMutation.isPending || analyzeMutation.isPending}
                className="gap-2"
              >
                {pdfMutation.isPending || analyzeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {pdfMutation.isPending ? 'PDF extraheren...' : analyzeMutation.isPending ? 'AI analyseert...' : 'PDF uploaden & analyseren'}
              </Button>
            </>
          ) : source === 'url' ? (
            <Button
              onClick={() => articleUrl && urlMutation.mutate(articleUrl)}
              disabled={!articleUrl || urlMutation.isPending || analyzeMutation.isPending}
              className="gap-2"
            >
              {urlMutation.isPending || analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {urlMutation.isPending ? 'Artikel ophalen...' : analyzeMutation.isPending ? 'AI analyseert...' : 'Artikel analyseren'}
            </Button>
          ) : (
            <Button
              onClick={() => searchMutation.mutate()}
              disabled={!discipline || searchMutation.isPending}
              className="gap-2"
            >
              {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Zoeken
            </Button>
          )}
          {canAddTreatments && (
            <Button
              variant="outline"
              onClick={() => openAddDialog()}
              className="gap-2"
            >
              <PenLine className="h-4 w-4" />
              Handmatig toevoegen
            </Button>
          )}
        </div>

        {/* AI Loading State */}
        {(pdfMutation.isPending || analyzeMutation.isPending || urlMutation.isPending) && !pdfResults && (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">
                {pdfMutation.isPending ? 'PDF wordt verwerkt...' : urlMutation.isPending ? 'Artikel wordt opgehaald...' : 'AI analyseert regimens en zoekt veiligheidsinformatie...'}
              </p>
              <p className="text-xs text-muted-foreground">Dit kan enkele seconden duren</p>
            </div>
          </div>
        )}

        {/* Extracted Text Preview */}
        {pdfResults && pdfResults.length > 20 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Geëxtraheerde tekst preview</h3>
                <span className="text-xs text-muted-foreground">({pdfResults.length.toLocaleString()} tekens)</span>
              </div>
              <Button
                onClick={() => analyzeMutation.mutate(pdfResults)}
                disabled={analyzeMutation.isPending}
                size="sm"
                className="gap-2"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {analyzeMutation.isPending ? 'Analyseren...' : 'Start AI-analyse'}
              </Button>
            </div>
            <div className="relative border rounded-lg bg-muted/20 max-h-64 overflow-y-auto">
              <pre className="p-4 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {pdfResults.slice(0, 5000)}
                {pdfResults.length > 5000 && '\n\n... (tekst ingekort voor preview)'}
              </pre>
            </div>
          </div>
        )}


        {relevanceWarning && (
          <div className="flex items-start gap-3 p-4 border rounded-lg border-destructive/30 bg-destructive/5">
            <span className="text-destructive text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-medium text-destructive">Geen oncologische content gedetecteerd</p>
              <p className="text-sm text-muted-foreground mt-1">{relevanceWarning}</p>
            </div>
          </div>
        )}

        {/* Extracted Regimens */}
        {extractedRegimens.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Gevonden regimens ({extractedRegimens.length})</h3>
            </div>
            {pdfSummary && (
              <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">{pdfSummary}</p>
            )}
            <div className="space-y-3">
              {extractedRegimens.map((regimen, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedRegimen(expandedRegimen === idx ? null : idx)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{regimen.generic_name}</p>
                        {regimen.brand_names && (
                          <span className="text-xs text-muted-foreground">({regimen.brand_names})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{regimen.drug_class}</Badge>
                        {regimen.study_name && <Badge variant="outline" className="text-xs">{regimen.study_name}</Badge>}
                        {regimen.administration_route && (
                          <span className="text-xs text-muted-foreground">{regimen.administration_route}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canAddTreatments && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => { e.stopPropagation(); openAddFromRegimen(regimen); }}
                        >
                          <Plus className="h-3 w-3" /> Toevoegen
                        </Button>
                      )}
                      {expandedRegimen === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {expandedRegimen === idx && (
                    <div className="px-4 pb-4 space-y-3 border-t bg-muted/10">
                      {regimen.mechanism_of_action && (
                        <div className="pt-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Werkingsmechanisme</p>
                          <p className="text-sm">{regimen.mechanism_of_action}</p>
                        </div>
                      )}
                      {regimen.dosing && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Dosering</p>
                          <p className="text-sm">{regimen.dosing}</p>
                        </div>
                      )}
                      {regimen.side_effects_common && regimen.side_effects_common.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Veel voorkomende bijwerkingen</p>
                          <div className="flex flex-wrap gap-1.5">
                            {regimen.side_effects_common.map((se, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-normal">{se}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {regimen.side_effects_serious && regimen.side_effects_serious.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-1">Ernstige bijwerkingen</p>
                          <div className="flex flex-wrap gap-1.5">
                            {regimen.side_effects_serious.map((se, i) => (
                              <Badge key={i} variant="destructive" className="text-xs font-normal">{se}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {regimen.contraindications && regimen.contraindications.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Contra-indicaties</p>
                          <ul className="text-sm list-disc list-inside space-y-0.5">
                            {regimen.contraindications.map((ci, i) => (
                              <li key={i}>{ci}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {regimen.monitoring && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Monitoring</p>
                          <p className="text-sm">{regimen.monitoring}</p>
                        </div>
                      )}
                      {regimen.disease_areas && regimen.disease_areas.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ziektegebieden</p>
                          <div className="flex flex-wrap gap-1.5">
                            {regimen.disease_areas.map((da, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{da}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PubMed Results */}
        {pubmedResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">PubMed resultaten ({pubmedResults.length})</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {pubmedResults.map((r) => (
                <div key={r.pmid} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.authors.slice(0, 3).join(', ')}{r.authors.length > 3 ? ' et al.' : ''} · {r.journal} · {r.year}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedPmid(expandedPmid === r.pmid ? null : r.pmid)}
                      >
                        {expandedPmid === r.pmid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {canAddTreatments && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openAddDialog({ title: '', disease: discipline })}
                        >
                          <Plus className="h-3 w-3" /> Toevoegen
                        </Button>
                      )}
                      {r.doi && (
                        <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm"><ExternalLink className="h-3 w-3" /></Button>
                        </a>
                      )}
                    </div>
                  </div>
                  {expandedPmid === r.pmid && r.abstract && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line border-t pt-2">{r.abstract}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ClinicalTrials.gov Results */}
        {ctgovResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">ClinicalTrials.gov resultaten ({ctgovResults.length})</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {ctgovResults.map((r) => (
                <div key={r.nctId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{r.nctId}</Badge>
                        {r.phase && <Badge variant="secondary" className="text-xs">{r.phase}</Badge>}
                        <Badge variant={r.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">
                          {r.status}
                        </Badge>
                        {r.enrollment && <span className="text-xs text-muted-foreground">n={r.enrollment}</span>}
                      </div>
                      {r.interventions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Interventies: {r.interventions.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canAddTreatments && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openAddDialog({ title: '', disease: discipline })}
                        >
                          <Plus className="h-3 w-3" /> Toevoegen
                        </Button>
                      )}
                      <a href={`https://clinicaltrials.gov/study/${r.nctId}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm"><ExternalLink className="h-3 w-3" /></Button>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Drug Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuw Medicijn / Combinatie Toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* AI enrichment inside dialog */}
              <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Automatisch invullen op basis van naam</Label>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">AI</Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={quickDrugName}
                    onChange={(e) => setQuickDrugName(e.target.value)}
                    placeholder="Typ een medicijnnaam, bijv. Pembrolizumab..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && quickDrugName.trim().length >= 2) {
                        e.preventDefault();
                        enrichMutation.mutate(quickDrugName.trim());
                      }
                    }}
                  />
                  <Button
                    onClick={() => enrichMutation.mutate(quickDrugName.trim())}
                    disabled={quickDrugName.trim().length < 2 || enrichMutation.isPending}
                    size="sm"
                    className="gap-2"
                  >
                    {enrichMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {enrichMutation.isPending ? 'Zoeken...' : 'Verrijken'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  AI zoekt automatisch medicijnklasse, werkingsmechanisme, indicaties en meer op.
                </p>
              </div>

              <Separator />
              {/* Combination toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Combinatietherapie</Label>
                  <p className="text-xs text-muted-foreground">Voeg een schema met 2 of 3 middelen toe</p>
                </div>
                <Switch
                  checked={editingDrug.is_combination}
                  onCheckedChange={(v) => setEditingDrug(prev => ({
                    ...prev,
                    is_combination: v,
                    drug_class: v ? 'Combinatietherapie' : prev.drug_class === 'Combinatietherapie' ? '' : prev.drug_class,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Naam therapie / schema *</Label>
                <Input
                  value={editingDrug.generic_name}
                  onChange={(e) => setEditingDrug({ ...editingDrug, generic_name: e.target.value })}
                  placeholder={editingDrug.is_combination ? 'Bijv. ADT + Docetaxel + Darolutamide' : 'Bijv. Pembrolizumab'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Merknamen (kommagescheiden)</Label>
                  <Input
                    value={editingDrug.brand_names}
                    onChange={(e) => setEditingDrug({ ...editingDrug, brand_names: e.target.value })}
                    placeholder="Bijv. Keytruda"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Studienaam</Label>
                  <Input
                    value={editingDrug.study_name}
                    onChange={(e) => setEditingDrug({ ...editingDrug, study_name: e.target.value })}
                    placeholder="Bijv. ARASENS, KEYNOTE-426"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Medicijnklasse *</Label>
                  <Select
                    value={editingDrug.drug_class}
                    onValueChange={(v) => setEditingDrug({ ...editingDrug, drug_class: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Kies klasse..." /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {DRUG_CLASSES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!editingDrug.is_combination && (
                  <div className="space-y-2">
                    <Label>Toedieningsweg</Label>
                    <Select
                      value={editingDrug.administration_route}
                      onValueChange={(v) => setEditingDrug({ ...editingDrug, administration_route: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Kies..." /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        {ADMINISTRATION_ROUTES.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Dosering velden */}
              {!editingDrug.is_combination && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Standaarddosering</Label>
                    <Input
                      value={editingDrug.standard_dose}
                      onChange={(e) => setEditingDrug({ ...editingDrug, standard_dose: e.target.value })}
                      placeholder="Bijv. 200 mg, 75 mg/m²"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequentie</Label>
                    <Input
                      value={editingDrug.dosing_frequency}
                      onChange={(e) => setEditingDrug({ ...editingDrug, dosing_frequency: e.target.value })}
                      placeholder="Bijv. q3w, dagelijks"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cyclusduur (dagen)</Label>
                    <Input
                      type="number"
                      value={editingDrug.cycle_length_days}
                      onChange={(e) => setEditingDrug({ ...editingDrug, cycle_length_days: e.target.value })}
                      placeholder="Bijv. 21"
                    />
                  </div>
                </div>
              )}

              {/* RIZIV toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={editingDrug.is_on_zvz}
                  onCheckedChange={(v) => setEditingDrug({ ...editingDrug, is_on_zvz: v })}
                />
                <Label className="text-sm">RIZIV-terugbetaald</Label>
              </div>

              <div className="space-y-2">
                <Label>Ziektegebieden</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DRUG_DISEASE_AREAS.map(area => (
                    <Badge
                      key={area}
                      variant={editingDrug.disease_areas.includes(area) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setEditingDrug(prev => ({
                          ...prev,
                          disease_areas: prev.disease_areas.includes(area)
                            ? prev.disease_areas.filter(a => a !== area)
                            : [...prev.disease_areas, area],
                        }));
                      }}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Combination components */}
              {editingDrug.is_combination && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Componenten ({editingDrug.components.length}/3)</Label>
                      {editingDrug.components.length < 3 && (
                        <Button variant="outline" size="sm" onClick={addComponent} className="gap-1 h-7 text-xs">
                          <Plus className="h-3 w-3" /> Component
                        </Button>
                      )}
                    </div>
                    {editingDrug.components.map((comp, idx) => (
                      <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Middel {idx + 1}</span>
                          {editingDrug.components.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeComponent(idx)} className="h-6 w-6 p-0">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={comp.name}
                            onChange={(e) => updateComponent(idx, 'name', e.target.value)}
                            placeholder="Naam (bijv. Docetaxel)"
                            className="text-sm"
                          />
                          <Input
                            value={comp.dose}
                            onChange={(e) => updateComponent(idx, 'dose', e.target.value)}
                            placeholder="Dosering (bijv. 75 mg/m²)"
                            className="text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Select value={comp.route} onValueChange={(v) => updateComponent(idx, 'route', v)}>
                            <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Route" /></SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="PO">PO (Oraal)</SelectItem>
                              <SelectItem value="IV">IV (Intraveneus)</SelectItem>
                              <SelectItem value="SC">SC (Subcutaan)</SelectItem>
                              <SelectItem value="IM">IM (Intramusculair)</SelectItem>
                              <SelectItem value="Continu">Continu</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={comp.interval}
                            onChange={(e) => updateComponent(idx, 'interval', e.target.value)}
                            placeholder="Interval (bijv. q3w)"
                            className="text-sm"
                          />
                          <Input
                            value={comp.cycle_length}
                            onChange={(e) => updateComponent(idx, 'cycle_length', e.target.value)}
                            placeholder="Cyclusdagen"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Werkingsmechanisme</Label>
                <Textarea
                  value={editingDrug.mechanism_of_action}
                  onChange={(e) => setEditingDrug({ ...editingDrug, mechanism_of_action: e.target.value })}
                  placeholder="Beschrijf het werkingsmechanisme..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuleren</Button>
              <Button
                onClick={() => addDrugMutation.mutate()}
                disabled={!editingDrug.generic_name || !editingDrug.drug_class || addDrugMutation.isPending}
              >
                {addDrugMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Toevoegen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
