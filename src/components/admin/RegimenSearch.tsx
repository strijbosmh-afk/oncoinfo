import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Plus, ExternalLink, ChevronDown, ChevronUp, Upload, FileText, Sparkles, PenLine } from 'lucide-react';
import { DRUG_CLASSES, DRUG_DISEASE_AREAS } from '@/types/drug';

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

export function RegimenSearch() {
  const { toast } = useToast();
  const [discipline, setDiscipline] = useState('');
  const [drugType, setDrugType] = useState('');
  const [source, setSource] = useState('pubmed');
  const [studyName, setStudyName] = useState('');
  const [pubmedResults, setPubmedResults] = useState<PubMedResult[]>([]);
  const [ctgovResults, setCtgovResults] = useState<CTGovResult[]>([]);
  const [pdfResults, setPdfResults] = useState<string>('');
  const [expandedPmid, setExpandedPmid] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingDrug, setEditingDrug] = useState({
    generic_name: '',
    drug_class: '',
    disease_areas: [] as string[],
    mechanism_of_action: '',
    brand_names: '',
    administration_route: '',
    study_name: '',
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
      toast({ title: 'PDF verwerkt', description: `${data.pages || 0} pagina's geëxtraheerd. AI-analyse wordt gestart...` });
      // Automatically trigger AI analysis
      if (text && text.length > 20) {
        analyzeMutation.mutate(text);
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
      const ext = data.extracted;
      if (ext) {
        setEditingDrug({
          generic_name: ext.generic_name || '',
          drug_class: ext.drug_class || '',
          disease_areas: ext.disease_areas || [],
          mechanism_of_action: ext.mechanism_of_action || '',
          brand_names: ext.brand_names || '',
          administration_route: ext.administration_route || '',
          study_name: ext.study_name || '',
        });
        setAddDialogOpen(true);
        toast({ title: 'AI-analyse voltooid', description: 'Velden zijn automatisch ingevuld. Controleer en pas aan.' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'AI-analyse mislukt', description: error.message, variant: 'destructive' });
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
      const { error } = await supabase.from('drugs').insert({
        generic_name: editingDrug.generic_name,
        drug_class: editingDrug.drug_class,
        disease_areas: editingDrug.disease_areas,
        mechanism_of_action: editingDrug.mechanism_of_action || null,
        brand_names: editingDrug.brand_names ? editingDrug.brand_names.split(',').map(b => b.trim()) : [],
        administration_route: editingDrug.administration_route || null,
        common_regimens: editingDrug.study_name ? [editingDrug.study_name.trim()] : [],
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

  const openAddDialog = (prefill?: { title?: string; disease?: string }) => {
    setEditingDrug({
      generic_name: prefill?.title || '',
      drug_class: drugType ? DRUG_TYPES.find(t => t.value === drugType)?.label || '' : '',
      disease_areas: prefill?.disease ? [prefill.disease] : discipline ? [discipline] : [],
      mechanism_of_action: '',
      brand_names: '',
      administration_route: '',
      study_name: '',
    });
    setAddDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe Regimens Zoeken</CardTitle>
        <CardDescription>Zoek in PubMed en ClinicalTrials.gov naar nieuwe behandelregimens</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {source !== 'pdf' ? (
            <Button
              onClick={() => searchMutation.mutate()}
              disabled={!discipline || searchMutation.isPending}
              className="gap-2"
            >
              {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Zoeken
            </Button>
          ) : (
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
          )}
          <Button
            variant="outline"
            onClick={() => openAddDialog()}
            className="gap-2"
          >
            <PenLine className="h-4 w-4" />
            Handmatig toevoegen
          </Button>
        </div>

        {/* PDF Results */}
        {pdfResults && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Geëxtraheerde PDF-inhoud</h3>
            </div>
            <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">{pdfResults}</pre>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => analyzeMutation.mutate(pdfResults)}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI opnieuw analyseren
              </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openAddDialog({ title: '', disease: discipline })}
                      >
                        <Plus className="h-3 w-3" /> Toevoegen
                      </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openAddDialog({ title: '', disease: discipline })}
                      >
                        <Plus className="h-3 w-3" /> Toevoegen
                      </Button>
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nieuw Medicijn Toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Generieke naam *</Label>
                <Input
                  value={editingDrug.generic_name}
                  onChange={(e) => setEditingDrug({ ...editingDrug, generic_name: e.target.value })}
                  placeholder="Bijv. Pembrolizumab"
                />
              </div>
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
                  placeholder="Bijv. KEYNOTE-426, CheckMate 214"
                />
              </div>
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
              <div className="space-y-2">
                <Label>Ziektegebieden</Label>
                <div className="flex flex-wrap gap-2">
                  {DRUG_DISEASE_AREAS.map(area => (
                    <Badge
                      key={area}
                      variant={editingDrug.disease_areas.includes(area) ? 'default' : 'outline'}
                      className="cursor-pointer"
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
              <div className="space-y-2">
                <Label>Werkingsmechanisme</Label>
                <Textarea
                  value={editingDrug.mechanism_of_action}
                  onChange={(e) => setEditingDrug({ ...editingDrug, mechanism_of_action: e.target.value })}
                  placeholder="Beschrijf het werkingsmechanisme..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Toedieningsweg</Label>
                <Select
                  value={editingDrug.administration_route}
                  onValueChange={(v) => setEditingDrug({ ...editingDrug, administration_route: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Kies..." /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Oraal">Oraal</SelectItem>
                    <SelectItem value="Intraveneus">Intraveneus</SelectItem>
                    <SelectItem value="Subcutaan">Subcutaan</SelectItem>
                    <SelectItem value="Intramusculair">Intramusculair</SelectItem>
                  </SelectContent>
                </Select>
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
