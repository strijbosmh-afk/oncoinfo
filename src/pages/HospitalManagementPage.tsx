import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Plus, Pencil, Trash2, Building2, UserPlus, X,
  Stethoscope, Heart, Pill, ArrowLeft, BookOpen, Check, Lock,
  Sparkles, CalendarClock, ToggleRight, ChevronDown, ChevronRight,
  Utensils, Sun, CircleUser, Wind,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Hospital {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  branding: { primary_color?: string } | null;
  is_active: boolean;
  created_at: string;
}

type StaffType = 'arts' | 'verpleging' | 'apotheker';

interface StaffMember {
  id: string;
  hospital_id: string;
  name: string;
  specialization: string | null;
  staff_type: StaffType;
  display_order: number;
  is_active: boolean;
}

interface HospitalDiscipline {
  id: string;
  hospital_id: string;
  disease_area: string;
  is_enabled: boolean;
}

interface HospitalFeature {
  id: string;
  hospital_id: string;
  feature_key: string;
  is_enabled: boolean;
}

const AVAILABLE_FEATURES: { key: string; label: string; description: string; icon: typeof Sparkles }[] = [
  { key: 'auto_update', label: 'Auto-Update Database', description: 'AI-gestuurde automatische updates van therapieën via PubMed en RIZIV', icon: Sparkles },
  { key: 'scheduled_updates', label: 'Geplande Updates', description: 'Automatische scans inplannen op vaste intervallen', icon: CalendarClock },
];

// Discipline categories with sub-disciplines (disease_areas stored in DB)
interface DisciplineCategory {
  key: string;
  label: string;
  description: string;
  icon: typeof Heart;
  subDisciplines: { key: string; label: string }[];
  isPlaceholder?: boolean;
}

const DISCIPLINE_CATEGORIES: DisciplineCategory[] = [
  {
    key: 'breast', label: 'Borstkanker', description: 'HR+, HER2+, Triple negatief', icon: Heart,
    subDisciplines: [
      { key: 'Borstkanker', label: 'Borstkanker (alle subtypes)' },
    ],
  },
  {
    key: 'urology', label: 'Urologie', description: 'Prostaat, Blaas, Nier, Testis, Penis', icon: Stethoscope,
    subDisciplines: [
      { key: 'Prostaatkanker', label: 'Prostaatkanker' },
      { key: 'Blaaskanker', label: 'Blaaskanker' },
      { key: 'Niercelcarcinoom', label: 'Niercelcarcinoom' },
      { key: 'Testiskanker', label: 'Testiskanker' },
      { key: 'Peniskanker', label: 'Peniskanker' },
    ],
  },
  {
    key: 'gynecology', label: 'Gynaecologie', description: 'Ovarium, Endometrium, Cervix, Vulva', icon: Stethoscope,
    subDisciplines: [
      { key: 'Ovariumkanker', label: 'Ovariumcarcinoom' },
      { key: 'Endometriumkanker', label: 'Endometriumcarcinoom' },
      { key: 'Cervixkanker', label: 'Cervixcarcinoom' },
      { key: 'Vulvakanker', label: 'Vulvacarcinoom' },
    ],
  },
  {
    key: 'respiratory', label: 'Respiratoire oncologie', description: 'NSCLC, SCLC, Mesothelioom', icon: Wind,
    subDisciplines: [
      { key: 'NSCLC', label: 'NSCLC' },
      { key: 'SCLC', label: 'SCLC' },
      { key: 'Mesothelioom', label: 'Mesothelioom' },
    ],
  },
  {
    key: 'supportive', label: 'Supportive Care', description: 'Anti-emetica, G-CSF, Erytropoietines, Antiresorptiva', icon: Pill,
    subDisciplines: [
      { key: 'Anti-emetica', label: 'Anti-emetica' },
      { key: 'Groeifactoren', label: 'G-CSF / Groeifactoren' },
      { key: 'Erytropoietines', label: 'Erytropoietines' },
      { key: 'Trombopoietine-agonisten', label: 'Trombopoietine-agonisten' },
      { key: 'Antiresorptiva', label: 'Antiresorptiva' },
      { key: 'Supportive Care', label: 'Overige supportive care' },
    ],
  },
  {
    key: 'digestive', label: 'Digestieve oncologie', description: 'Gastro-intestinale tumoren', icon: Utensils,
    subDisciplines: [],
    isPlaceholder: true,
  },
  {
    key: 'skin', label: 'Huidtumoren', description: 'Dermatologische oncologie', icon: Sun,
    subDisciplines: [],
    isPlaceholder: true,
  },
  {
    key: 'headneck', label: 'Hoofd & Halstumoren', description: 'Hoofd-halstumoren', icon: CircleUser,
    subDisciplines: [],
    isPlaceholder: true,
  },
];

const staffTypeLabels: Record<StaffType, string> = {
  arts: 'Artsen',
  verpleging: 'Verpleging',
  apotheker: 'Apothekers',
};

const staffTypeIcons: Record<StaffType, typeof Stethoscope> = {
  arts: Stethoscope,
  verpleging: Heart,
  apotheker: Pill,
};

export default function HospitalManagementPage() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Hospital form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formPrimaryColor, setFormPrimaryColor] = useState('#6b2d5b');
  const [formIsActive, setFormIsActive] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Staff
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [activeStaffTab, setActiveStaffTab] = useState<StaffType>('arts');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffSpec, setNewStaffSpec] = useState('');

  // Disciplines
  const [hospitalDisciplines, setHospitalDisciplines] = useState<HospitalDiscipline[]>([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Features
  const [hospitalFeatures, setHospitalFeatures] = useState<HospitalFeature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);

  const fetchHospitals = useCallback(async () => {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('name');
    if (error) {
      toast({ title: 'Fout', description: 'Kon ziekenhuizen niet laden', variant: 'destructive' });
    } else {
      setHospitals((data || []).map(h => ({
        ...h,
        branding: h.branding as Hospital['branding'],
      })));
    }
    setLoading(false);
  }, [toast]);

  // No longer need to fetch disease areas from drugs - we use fixed categories


  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // When a hospital is selected, load its staff + disciplines + features
  const selectHospital = useCallback(async (h: Hospital) => {
    setSelectedHospital(h);
    setStaffLoading(true);
    setDisciplinesLoading(true);
    setFeaturesLoading(true);

    const [staffRes, discRes, featRes] = await Promise.all([
      supabase
        .from('hospital_doctors')
        .select('*')
        .eq('hospital_id', h.id)
        .order('display_order'),
      supabase
        .from('hospital_disciplines')
        .select('*')
        .eq('hospital_id', h.id),
      supabase
        .from('hospital_features')
        .select('*')
        .eq('hospital_id', h.id),
    ]);

    setStaffMembers((staffRes.data || []) as StaffMember[]);
    setHospitalDisciplines((discRes.data || []) as HospitalDiscipline[]);
    setHospitalFeatures((featRes.data || []) as HospitalFeature[]);
    setStaffLoading(false);
    setDisciplinesLoading(false);
    setFeaturesLoading(false);
  }, []);

  // Hospital CRUD
  const openCreate = () => {
    setEditingHospital(null);
    setFormName('');
    setFormSlug('');
    setFormPrimaryColor('#6b2d5b');
    setFormIsActive(true);
    setLogoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (h: Hospital) => {
    setEditingHospital(h);
    setFormName(h.name);
    setFormSlug(h.slug);
    setFormPrimaryColor(h.branding?.primary_color || '#6b2d5b');
    setFormIsActive(h.is_active);
    setLogoFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formSlug.trim()) {
      toast({ title: 'Vul alle velden in', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let logoUrl = editingHospital?.logo_url || null;

    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `hospital-logos/${formSlug}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(path, logoFile, { upsert: true });
      if (uploadError) {
        toast({ title: 'Logo upload mislukt', description: uploadError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('public-assets').getPublicUrl(path);
      logoUrl = urlData.publicUrl;
    }

    const payload = {
      name: formName.trim(),
      slug: formSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
      logo_url: logoUrl,
      branding: { primary_color: formPrimaryColor },
      is_active: formIsActive,
    };

    if (editingHospital) {
      const { error } = await supabase.from('hospitals').update(payload).eq('id', editingHospital.id);
      if (error) {
        toast({ title: 'Fout bij bijwerken', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Ziekenhuis bijgewerkt' });
        if (selectedHospital?.id === editingHospital.id) {
          setSelectedHospital({ ...editingHospital, ...payload, branding: payload.branding as Hospital['branding'] });
        }
      }
    } else {
      const { error } = await supabase.from('hospitals').insert(payload);
      if (error) {
        toast({ title: 'Fout bij aanmaken', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Ziekenhuis aangemaakt' });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchHospitals();
  };

  const handleDelete = async (h: Hospital) => {
    if (!confirm(`Weet je zeker dat je "${h.name}" wilt verwijderen?`)) return;
    const { error } = await supabase.from('hospitals').delete().eq('id', h.id);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ziekenhuis verwijderd' });
      if (selectedHospital?.id === h.id) setSelectedHospital(null);
      fetchHospitals();
    }
  };

  // Staff management
  const addStaffMember = async () => {
    if (!newStaffName.trim() || !selectedHospital) return;
    const filtered = staffMembers.filter(s => s.staff_type === activeStaffTab);
    const { error } = await supabase.from('hospital_doctors').insert({
      hospital_id: selectedHospital.id,
      name: newStaffName.trim(),
      specialization: newStaffSpec.trim() || null,
      staff_type: activeStaffTab,
      display_order: filtered.length,
    });
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      setNewStaffName('');
      setNewStaffSpec('');
      selectHospital(selectedHospital);
    }
  };

  const removeStaffMember = async (id: string) => {
    await supabase.from('hospital_doctors').delete().eq('id', id);
    if (selectedHospital) selectHospital(selectedHospital);
  };

  // Discipline management - toggle individual sub-discipline
  const toggleDiscipline = async (diseaseArea: string) => {
    if (!selectedHospital) return;
    const existing = hospitalDisciplines.find(d => d.disease_area === diseaseArea);
    if (existing) {
      const { error } = await supabase
        .from('hospital_disciplines')
        .update({ is_enabled: !existing.is_enabled })
        .eq('id', existing.id);
      if (!error) {
        setHospitalDisciplines(prev =>
          prev.map(d => d.id === existing.id ? { ...d, is_enabled: !d.is_enabled } : d)
        );
      }
    } else {
      const { data, error } = await supabase
        .from('hospital_disciplines')
        .insert({
          hospital_id: selectedHospital.id,
          disease_area: diseaseArea,
          is_enabled: true,
        })
        .select()
        .single();
      if (!error && data) {
        setHospitalDisciplines(prev => [...prev, data as HospitalDiscipline]);
      }
    }
  };

  // Toggle all sub-disciplines in a category
  const toggleCategoryAll = async (cat: DisciplineCategory, enable: boolean) => {
    if (!selectedHospital || cat.isPlaceholder) return;
    for (const sub of cat.subDisciplines) {
      const existing = hospitalDisciplines.find(d => d.disease_area === sub.key);
      if (enable && !existing) {
        await supabase.from('hospital_disciplines').insert({
          hospital_id: selectedHospital.id, disease_area: sub.key, is_enabled: true,
        });
      } else if (enable && existing && !existing.is_enabled) {
        await supabase.from('hospital_disciplines').update({ is_enabled: true }).eq('id', existing.id);
      } else if (!enable && existing && existing.is_enabled) {
        await supabase.from('hospital_disciplines').update({ is_enabled: false }).eq('id', existing.id);
      }
    }
    selectHospital(selectedHospital);
  };

  const toggleExpandCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const allSubDisciplineKeys = DISCIPLINE_CATEGORIES
    .filter(c => !c.isPlaceholder)
    .flatMap(c => c.subDisciplines.map(s => s.key));

  const enableAllDisciplines = async () => {
    if (!selectedHospital) return;
    const toCreate = allSubDisciplineKeys
      .filter(key => !hospitalDisciplines.find(d => d.disease_area === key));
    if (toCreate.length > 0) {
      await supabase.from('hospital_disciplines').insert(
        toCreate.map(area => ({
          hospital_id: selectedHospital.id,
          disease_area: area,
          is_enabled: true,
        }))
      );
    }
    const toEnable = hospitalDisciplines.filter(d => !d.is_enabled).map(d => d.id);
    if (toEnable.length > 0) {
      await supabase.from('hospital_disciplines').update({ is_enabled: true }).in('id', toEnable);
    }
    selectHospital(selectedHospital);
  };

  const disableAllDisciplines = async () => {
    if (!selectedHospital) return;
    const toDisable = hospitalDisciplines.filter(d => d.is_enabled).map(d => d.id);
    if (toDisable.length > 0) {
      await supabase.from('hospital_disciplines').update({ is_enabled: false }).in('id', toDisable);
    }
    selectHospital(selectedHospital);
  };

  // Feature management
  const toggleFeature = async (featureKey: string) => {
    if (!selectedHospital) return;
    const existing = hospitalFeatures.find(f => f.feature_key === featureKey);
    if (existing) {
      const { error } = await supabase
        .from('hospital_features')
        .update({ is_enabled: !existing.is_enabled })
        .eq('id', existing.id);
      if (!error) {
        setHospitalFeatures(prev =>
          prev.map(f => f.id === existing.id ? { ...f, is_enabled: !f.is_enabled } : f)
        );
      }
    } else {
      const { data, error } = await supabase
        .from('hospital_features')
        .insert({
          hospital_id: selectedHospital.id,
          feature_key: featureKey,
          is_enabled: true,
        })
        .select()
        .single();
      if (!error && data) {
        setHospitalFeatures(prev => [...prev, data as HospitalFeature]);
      }
    }
  };

  const enabledCount = hospitalDisciplines.filter(d => d.is_enabled).length;
  const enabledFeatureCount = hospitalFeatures.filter(f => f.is_enabled).length;

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              Ziekenhuisbeheer
            </h1>
            <p className="text-muted-foreground mt-1">
              Beheer ziekenhuizen, medewerkers en beschikbare disciplines
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuw Ziekenhuis
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hospital list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Ziekenhuizen ({hospitals.length})
            </h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : hospitals.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Geen ziekenhuizen gevonden</p>
            ) : (
              hospitals.map(h => (
                <Card
                  key={h.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedHospital?.id === h.id ? 'ring-2 ring-primary shadow-md' : ''
                  }`}
                  onClick={() => selectHospital(h)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {h.logo_url ? (
                        <img src={h.logo_url} alt={h.name} className="h-10 w-auto max-w-[60px] object-contain" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{h.name}</p>
                          <Badge variant={h.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                            {h.is_active ? 'Actief' : 'Inactief'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{h.slug}</p>
                      </div>
                      {h.branding?.primary_color && (
                        <div
                          className="h-5 w-5 rounded-full border shrink-0"
                          style={{ backgroundColor: h.branding.primary_color }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            {!selectedHospital ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Selecteer een ziekenhuis om de details te beheren</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Hospital info header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {selectedHospital.logo_url ? (
                          <img src={selectedHospital.logo_url} alt={selectedHospital.name} className="h-14 w-auto max-w-[100px] object-contain" />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                            <Building2 className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h2 className="text-xl font-bold">{selectedHospital.name}</h2>
                          <p className="text-sm text-muted-foreground">Slug: {selectedHospital.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(selectedHospital)} className="gap-1">
                          <Pencil className="h-3.5 w-3.5" />
                          Bewerken
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(selectedHospital)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Verwijderen
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Disciplines section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <BookOpen className="h-5 w-5" />
                          Disciplines
                        </CardTitle>
                        <CardDescription>
                          Bepaal welke oncologische disciplines en subdisciplines beschikbaar zijn.
                          {enabledCount > 0 && (
                            <Badge variant="outline" className="ml-2">
                              {enabledCount} / {allSubDisciplineKeys.length} actief
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={enableAllDisciplines}>
                          Alles aan
                        </Button>
                        <Button variant="outline" size="sm" onClick={disableAllDisciplines}>
                          Alles uit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {disciplinesLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                      <div className="space-y-2">
                        {DISCIPLINE_CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          const isExpanded = expandedCategories.has(cat.key);
                          const enabledSubs = cat.subDisciplines.filter(s =>
                            hospitalDisciplines.find(d => d.disease_area === s.key && d.is_enabled)
                          ).length;
                          const allEnabled = !cat.isPlaceholder && enabledSubs === cat.subDisciplines.length && cat.subDisciplines.length > 0;
                          const someEnabled = enabledSubs > 0;

                          return (
                            <div key={cat.key} className={`rounded-lg border transition-colors ${
                              cat.isPlaceholder
                                ? 'border-dashed border-muted opacity-60'
                                : allEnabled
                                  ? 'bg-primary/5 border-primary/20'
                                  : someEnabled
                                    ? 'bg-primary/[0.02] border-primary/10'
                                    : 'bg-muted/30 border-border'
                            }`}>
                              {/* Category header */}
                              <div className="flex items-center justify-between p-4">
                                <button
                                  className="flex items-center gap-3 flex-1 text-left"
                                  onClick={() => !cat.isPlaceholder && toggleExpandCategory(cat.key)}
                                  disabled={cat.isPlaceholder}
                                >
                                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                                    someEnabled ? 'bg-primary/10' : 'bg-muted'
                                  }`}>
                                    <Icon className={`h-4 w-4 ${someEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm font-medium ${cat.isPlaceholder ? 'text-muted-foreground' : ''}`}>
                                        {cat.label}
                                      </p>
                                      {cat.isPlaceholder && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-dashed">
                                          Binnenkort
                                        </Badge>
                                      )}
                                      {!cat.isPlaceholder && someEnabled && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          {enabledSubs}/{cat.subDisciplines.length}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                                  </div>
                                  {!cat.isPlaceholder && (
                                    isExpanded
                                      ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                                      : <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                                  )}
                                </button>
                                {!cat.isPlaceholder && (
                                  <Switch
                                    checked={allEnabled}
                                    onCheckedChange={(checked) => toggleCategoryAll(cat, checked)}
                                    className="ml-3"
                                  />
                                )}
                              </div>

                              {/* Sub-disciplines (expanded) */}
                              {isExpanded && !cat.isPlaceholder && (
                                <div className="border-t border-border/50 px-4 pb-3 pt-2 space-y-1">
                                  {cat.subDisciplines.map(sub => {
                                    const disc = hospitalDisciplines.find(d => d.disease_area === sub.key);
                                    const subEnabled = disc?.is_enabled ?? false;
                                    return (
                                      <div
                                        key={sub.key}
                                        className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${
                                          subEnabled ? 'bg-primary/5' : 'hover:bg-muted/50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {subEnabled ? (
                                            <Check className="h-3.5 w-3.5 text-primary" />
                                          ) : (
                                            <div className="h-3.5 w-3.5" />
                                          )}
                                          <span className={`text-sm ${!subEnabled ? 'text-muted-foreground' : ''}`}>
                                            {sub.label}
                                          </span>
                                        </div>
                                        <Switch
                                          checked={subEnabled}
                                          onCheckedChange={() => toggleDiscipline(sub.key)}
                                          className="scale-90"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Op termijn wordt dit een betalende optie: betaal per discipline
                    </p>
                  </CardContent>
                </Card>

                {/* Features section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <ToggleRight className="h-5 w-5" />
                          Premium Functies
                        </CardTitle>
                        <CardDescription>
                          Schakel betaalde functies in of uit voor dit ziekenhuis.
                          {enabledFeatureCount > 0 && (
                            <Badge variant="outline" className="ml-2">
                              {enabledFeatureCount} / {AVAILABLE_FEATURES.length} actief
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {featuresLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                      <div className="space-y-3">
                        {AVAILABLE_FEATURES.map(feat => {
                          const existing = hospitalFeatures.find(f => f.feature_key === feat.key);
                          const isEnabled = existing?.is_enabled ?? false;
                          const Icon = feat.icon;
                          return (
                            <div
                              key={feat.key}
                              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                                isEnabled
                                  ? 'bg-primary/5 border-primary/20'
                                  : 'bg-muted/30 border-border'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                                  isEnabled ? 'bg-primary/10' : 'bg-muted'
                                }`}>
                                  <Icon className={`h-4.5 w-4.5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${!isEnabled ? 'text-muted-foreground' : ''}`}>
                                    {feat.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{feat.description}</p>
                                </div>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={() => toggleFeature(feat.key)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Betalende opties: functies worden per ziekenhuis gefactureerd
                    </p>
                  </CardContent>
                </Card>

                {/* Staff section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserPlus className="h-5 w-5" />
                      Medewerkers
                    </CardTitle>
                    <CardDescription>Beheer artsen, verpleging en apothekers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {staffLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                      <Tabs value={activeStaffTab} onValueChange={v => setActiveStaffTab(v as StaffType)}>
                        <TabsList className="w-full">
                          {(Object.keys(staffTypeLabels) as StaffType[]).map(type => {
                            const Icon = staffTypeIcons[type];
                            const count = staffMembers.filter(s => s.staff_type === type).length;
                            return (
                              <TabsTrigger key={type} value={type} className="flex-1 gap-1.5">
                                <Icon className="h-3.5 w-3.5" />
                                {staffTypeLabels[type]} ({count})
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                        {(Object.keys(staffTypeLabels) as StaffType[]).map(type => {
                          const filtered = staffMembers.filter(s => s.staff_type === type);
                          return (
                            <TabsContent key={type} value={type} className="space-y-3 mt-4">
                              {filtered.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Nog geen {staffTypeLabels[type].toLowerCase()} toegevoegd
                                </p>
                              )}
                              {filtered.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium text-sm">{member.name}</p>
                                    {member.specialization && <p className="text-xs text-muted-foreground">{member.specialization}</p>}
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => removeStaffMember(member.id)} className="text-destructive h-8 w-8">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <div className="border-t pt-4 space-y-3">
                                <p className="text-sm font-medium">Toevoegen</p>
                                <div className="flex gap-2">
                                  <Input placeholder="Naam" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="flex-1" />
                                  <Input placeholder="Specialisatie / functie" value={newStaffSpec} onChange={e => setNewStaffSpec(e.target.value)} className="flex-1" />
                                  <Button onClick={addStaffMember} size="icon" disabled={!newStaffName.trim()}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Hospital Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHospital ? 'Ziekenhuis Bewerken' : 'Nieuw Ziekenhuis'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="bijv. RZ Tienen" />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL-vriendelijk)</Label>
                <Input value={formSlug} onChange={e => setFormSlug(e.target.value)} placeholder="bijv. rztienen" />
              </div>
              <div className="space-y-2">
                <Label>Logo uploaden</Label>
                <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                {editingHospital?.logo_url && !logoFile && (
                  <p className="text-xs text-muted-foreground">Huidig logo behouden</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Huisstijlkleur</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formPrimaryColor}
                    onChange={e => setFormPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded cursor-pointer border"
                  />
                  <Input value={formPrimaryColor} onChange={e => setFormPrimaryColor(e.target.value)} className="w-32" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                <Label>Actief</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingHospital ? 'Bijwerken' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
