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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Loader2, Plus, Pencil, Trash2, Building2, UserPlus, X,
  Stethoscope, Heart, Pill, ArrowLeft, BookOpen, Check, Lock,
  Sparkles, CalendarClock, ToggleRight, ChevronDown, ChevronRight,
  Utensils, Sun, CircleUser, Wind, Search, FileText, Save,
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

interface BillingInfo {
  billing_name: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_postal_code: string;
  billing_city: string;
  billing_country: string;
  billing_vat_number: string;
  billing_email: string;
  billing_phone: string;
  billing_contact_person: string;
  billing_peppol_id: string;
  billing_peppol_scheme: string;
  billing_iban: string;
  billing_bic: string;
  billing_po_number: string;
}

const emptyBilling: BillingInfo = {
  billing_name: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_postal_code: '',
  billing_city: '',
  billing_country: 'België',
  billing_vat_number: '',
  billing_email: '',
  billing_phone: '',
  billing_contact_person: '',
  billing_peppol_id: '',
  billing_peppol_scheme: '0208',
  billing_iban: '',
  billing_bic: '',
  billing_po_number: '',
};

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

function LogoPreview({ 
  logoUrl, hospitalName, primaryColor, 
  onConfirm, onReject, showActions 
}: { 
  logoUrl: string; hospitalName: string; primaryColor: string;
  onConfirm?: () => void; onReject?: () => void; showActions?: boolean;
}) {
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setImgStatus('loading');
  }, [logoUrl]);

  if (!logoUrl && !hospitalName) return null;

  const initials = hospitalName
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
      <div
        className="h-16 w-16 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border"
        style={{ backgroundColor: imgStatus !== 'loaded' ? `${primaryColor}20` : 'transparent' }}
      >
        {logoUrl && imgStatus !== 'error' ? (
          <img
            src={logoUrl}
            alt="Logo preview"
            className={`h-full w-full object-contain ${imgStatus === 'loading' ? 'opacity-0' : 'opacity-100'} transition-opacity`}
            onLoad={() => setImgStatus('loaded')}
            onError={() => setImgStatus('error')}
          />
        ) : (
          <span className="text-lg font-bold" style={{ color: primaryColor }}>{initials || '?'}</span>
        )}
        {logoUrl && imgStatus === 'loading' && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground absolute" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {imgStatus === 'loaded' && <p className="text-sm font-medium text-green-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Logo gevonden</p>}
        {imgStatus === 'error' && logoUrl && <p className="text-sm text-destructive">Logo niet bereikbaar</p>}
        {!logoUrl && <p className="text-sm text-muted-foreground">Geen logo gevonden</p>}
        {logoUrl && <p className="text-xs text-muted-foreground truncate">{logoUrl}</p>}
        {showActions && imgStatus === 'loaded' && (
          <div className="flex gap-2 mt-2">
            <Button type="button" size="sm" variant="default" className="gap-1 h-7 text-xs" onClick={onConfirm}>
              <Check className="h-3 w-3" /> Akkoord
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={onReject}>
              <X className="h-3 w-3" /> Ander logo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Collapsible section wrapper
function CollapsibleSection({ 
  title, icon: Icon, badge, children, defaultOpen = false, actions 
}: { 
  title: string; icon: typeof BookOpen; badge?: React.ReactNode; 
  children: React.ReactNode; defaultOpen?: boolean; actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {title}
                </CardTitle>
                {badge}
              </div>
              {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

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
  const [formSlugManual, setFormSlugManual] = useState(false);
  const [formPrimaryColor, setFormPrimaryColor] = useState('#6b2d5b');
  const [formIsActive, setFormIsActive] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLookupLoading, setAiLookupLoading] = useState(false);
  const [logoConfirmed, setLogoConfirmed] = useState<boolean | null>(null);

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

  // Billing
  const [billing, setBilling] = useState<BillingInfo>(emptyBilling);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);

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

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // When a hospital is selected, load its staff + disciplines + features + billing
  const selectHospital = useCallback(async (h: Hospital) => {
    setSelectedHospital(h);
    setStaffLoading(true);
    setDisciplinesLoading(true);
    setFeaturesLoading(true);
    setBillingLoading(true);

    const [staffRes, discRes, featRes, billingRes] = await Promise.all([
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
      supabase
        .from('hospitals')
        .select('billing_name, billing_address_line1, billing_address_line2, billing_postal_code, billing_city, billing_country, billing_vat_number, billing_email, billing_phone, billing_contact_person, billing_peppol_id, billing_peppol_scheme, billing_iban, billing_bic, billing_po_number')
        .eq('id', h.id)
        .single(),
    ]);

    setStaffMembers((staffRes.data || []) as StaffMember[]);
    setHospitalDisciplines((discRes.data || []) as HospitalDiscipline[]);
    setHospitalFeatures((featRes.data || []) as HospitalFeature[]);
    if (billingRes.data) {
      setBilling({
        billing_name: billingRes.data.billing_name || '',
        billing_address_line1: billingRes.data.billing_address_line1 || '',
        billing_address_line2: billingRes.data.billing_address_line2 || '',
        billing_postal_code: billingRes.data.billing_postal_code || '',
        billing_city: billingRes.data.billing_city || '',
        billing_country: billingRes.data.billing_country || 'België',
        billing_vat_number: billingRes.data.billing_vat_number || '',
        billing_email: billingRes.data.billing_email || '',
        billing_phone: billingRes.data.billing_phone || '',
        billing_contact_person: billingRes.data.billing_contact_person || '',
        billing_peppol_id: billingRes.data.billing_peppol_id || '',
        billing_peppol_scheme: billingRes.data.billing_peppol_scheme || '0208',
        billing_iban: billingRes.data.billing_iban || '',
        billing_bic: billingRes.data.billing_bic || '',
        billing_po_number: billingRes.data.billing_po_number || '',
      });
    } else {
      setBilling(emptyBilling);
    }
    setStaffLoading(false);
    setDisciplinesLoading(false);
    setFeaturesLoading(false);
    setBillingLoading(false);
  }, []);

  const saveBilling = async () => {
    if (!selectedHospital) return;
    setBillingSaving(true);
    const { error } = await supabase
      .from('hospitals')
      .update(billing)
      .eq('id', selectedHospital.id);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Facturatiegegevens opgeslagen' });
    }
    setBillingSaving(false);
  };

  const updateBillingField = (field: keyof BillingInfo, value: string) => {
    setBilling(prev => ({ ...prev, [field]: value }));
  };

  // Hospital CRUD
  const generateUniqueColor = () => {
    const palette = [
      '#6b2d5b', '#1e6f9f', '#2d6b3f', '#9f5b1e', '#5b2d6b',
      '#1e9f6f', '#9f1e3f', '#3f5b9f', '#6b9f1e', '#9f3f1e',
      '#2d5b6b', '#6b1e9f', '#1e3f9f', '#9f6b1e', '#3f9f5b',
    ];
    const usedColors = hospitals.map(h => h.branding?.primary_color?.toLowerCase());
    return palette.find(c => !usedColors.includes(c)) || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`;
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleAiLookup = async () => {
    if (!formName.trim()) return;
    setAiLookupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-hospital', {
        body: { query: formName.trim() },
      });
      if (error) throw error;
      if (data?.official_name) setFormName(data.official_name);
      if (data?.official_name && !formSlugManual) setFormSlug(slugify(data.official_name));
      if (data?.brand_color) setFormPrimaryColor(data.brand_color);
      if (data?.logo_url) {
        setFormLogoUrl(data.logo_url);
        setLogoFile(null);
        setLogoConfirmed(null);
      } else {
        setFormLogoUrl('');
        setLogoConfirmed(false);
      }
      toast({ title: 'Ziekenhuis gevonden', description: `${data?.official_name || formName} — bevestig het logo` });
    } catch (e: any) {
      console.error('Lookup failed:', e);
      toast({ title: 'Zoeken mislukt', description: e?.message || 'Probeer het opnieuw', variant: 'destructive' });
      setLogoConfirmed(false);
    } finally {
      setAiLookupLoading(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!formSlugManual && !editingHospital) {
      setFormSlug(slugify(name));
    }
  };

  const openCreate = () => {
    setEditingHospital(null);
    setFormName('');
    setFormSlug('');
    setFormSlugManual(false);
    setFormPrimaryColor(generateUniqueColor());
    setFormIsActive(true);
    setLogoFile(null);
    setFormLogoUrl('');
    setLogoConfirmed(null);
    setDialogOpen(true);
  };

  const openEdit = (h: Hospital) => {
    setEditingHospital(h);
    setFormName(h.name);
    setFormSlug(h.slug);
    setFormSlugManual(true);
    setFormPrimaryColor(h.branding?.primary_color || '#6b2d5b');
    setFormIsActive(h.is_active);
    setLogoFile(null);
    setFormLogoUrl(h.logo_url || '');
    setLogoConfirmed(h.logo_url ? true : null);
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
    } else if (formLogoUrl.trim()) {
      logoUrl = formLogoUrl.trim();
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

  const toggleHospitalActive = async (h: Hospital) => {
    const newActive = !h.is_active;
    const { error } = await supabase.from('hospitals').update({ is_active: newActive }).eq('id', h.id);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: newActive ? 'Ziekenhuis geactiveerd' : 'Ziekenhuis gedeactiveerd' });
      setHospitals(prev => prev.map(x => x.id === h.id ? { ...x, is_active: newActive } : x));
      if (selectedHospital?.id === h.id) {
        setSelectedHospital(prev => prev ? { ...prev, is_active: newActive } : prev);
      }
    }
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

  // Discipline management
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
                  } ${!h.is_active ? 'opacity-60' : ''}`}
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
                        </div>
                        <p className="text-xs text-muted-foreground">{h.slug}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {h.branding?.primary_color && (
                          <div
                            className="h-5 w-5 rounded-full border"
                            style={{ backgroundColor: h.branding.primary_color }}
                          />
                        )}
                        <Switch
                          checked={h.is_active}
                          onCheckedChange={() => toggleHospitalActive(h)}
                          aria-label={h.is_active ? 'Deactiveer' : 'Activeer'}
                        />
                      </div>
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
              <div className="space-y-4">
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

                {/* Billing section */}
                <CollapsibleSection title="Facturatiegegevens" icon={FileText} defaultOpen={false}>
                  {billingLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : (
                    <div className="space-y-6">
                      {/* Company info */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Bedrijfsgegevens</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Facturatienaam</Label>
                            <Input value={billing.billing_name} onChange={e => updateBillingField('billing_name', e.target.value)} placeholder="Officiële naam voor factuur" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">BTW-nummer</Label>
                            <Input value={billing.billing_vat_number} onChange={e => updateBillingField('billing_vat_number', e.target.value)} placeholder="BE0123.456.789" />
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Adres</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Adresregel 1</Label>
                            <Input value={billing.billing_address_line1} onChange={e => updateBillingField('billing_address_line1', e.target.value)} placeholder="Straat en huisnummer" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Adresregel 2</Label>
                            <Input value={billing.billing_address_line2} onChange={e => updateBillingField('billing_address_line2', e.target.value)} placeholder="Gebouw, afdeling, ..." />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Postcode</Label>
                              <Input value={billing.billing_postal_code} onChange={e => updateBillingField('billing_postal_code', e.target.value)} placeholder="3300" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Gemeente</Label>
                              <Input value={billing.billing_city} onChange={e => updateBillingField('billing_city', e.target.value)} placeholder="Tienen" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Land</Label>
                              <Input value={billing.billing_country} onChange={e => updateBillingField('billing_country', e.target.value)} placeholder="België" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Contactpersoon facturatie</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Contactpersoon</Label>
                            <Input value={billing.billing_contact_person} onChange={e => updateBillingField('billing_contact_person', e.target.value)} placeholder="Naam contactpersoon" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">E-mail</Label>
                            <Input type="email" value={billing.billing_email} onChange={e => updateBillingField('billing_email', e.target.value)} placeholder="facturatie@hospital.be" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Telefoon</Label>
                            <Input value={billing.billing_phone} onChange={e => updateBillingField('billing_phone', e.target.value)} placeholder="+32 ..." />
                          </div>
                        </div>
                      </div>

                      {/* Banking */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Bankgegevens</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">IBAN</Label>
                            <Input value={billing.billing_iban} onChange={e => updateBillingField('billing_iban', e.target.value)} placeholder="BE68 5390 0754 7034" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">BIC</Label>
                            <Input value={billing.billing_bic} onChange={e => updateBillingField('billing_bic', e.target.value)} placeholder="TRIOBEXX" />
                          </div>
                        </div>
                      </div>

                      {/* PEPPOL */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">PEPPOL / e-facturatie</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">PEPPOL-ID</Label>
                            <Input value={billing.billing_peppol_id} onChange={e => updateBillingField('billing_peppol_id', e.target.value)} placeholder="0208:0123456789" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">PEPPOL-schema</Label>
                            <Input value={billing.billing_peppol_scheme} onChange={e => updateBillingField('billing_peppol_scheme', e.target.value)} placeholder="0208" />
                            <p className="text-[10px] text-muted-foreground">0208 = Belgisch KBO-nummer</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">PO-nummer</Label>
                            <Input value={billing.billing_po_number} onChange={e => updateBillingField('billing_po_number', e.target.value)} placeholder="Bestelbonnummer" />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button onClick={saveBilling} disabled={billingSaving} className="gap-2">
                          {billingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Opslaan
                        </Button>
                      </div>
                    </div>
                  )}
                </CollapsibleSection>

                {/* Disciplines section */}
                <CollapsibleSection
                  title="Disciplines"
                  icon={BookOpen}
                  badge={enabledCount > 0 ? (
                    <Badge variant="outline" className="text-xs">
                      {enabledCount} / {allSubDisciplineKeys.length} actief
                    </Badge>
                  ) : undefined}
                  actions={
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={enableAllDisciplines}>Alles aan</Button>
                      <Button variant="outline" size="sm" onClick={disableAllDisciplines}>Alles uit</Button>
                    </div>
                  }
                >
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
                </CollapsibleSection>

                {/* Features section */}
                <CollapsibleSection
                  title="Premium Functies"
                  icon={ToggleRight}
                  badge={enabledFeatureCount > 0 ? (
                    <Badge variant="outline" className="text-xs">
                      {enabledFeatureCount} / {AVAILABLE_FEATURES.length} actief
                    </Badge>
                  ) : undefined}
                >
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
                </CollapsibleSection>

                {/* Staff section */}
                <CollapsibleSection
                  title="Medewerkers"
                  icon={UserPlus}
                  badge={staffMembers.length > 0 ? (
                    <Badge variant="outline" className="text-xs">{staffMembers.length}</Badge>
                  ) : undefined}
                >
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
                </CollapsibleSection>
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
                <div className="flex gap-2">
                  <Input value={formName} onChange={e => handleNameChange(e.target.value)} placeholder="bijv. RZ Tienen" className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAiLookup}
                    disabled={!formName.trim() || aiLookupLoading}
                    title="Zoek logo"
                  >
                    {aiLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Typ een naam en klik 🔍 om automatisch het ziekenhuis te identificeren en logo te vinden</p>
              </div>
              <div className="space-y-2">
                <Label>Slug (URL-vriendelijk)</Label>
                <Input
                  value={formSlug}
                  onChange={e => { setFormSlug(e.target.value); setFormSlugManual(true); }}
                  placeholder="bijv. rz-tienen"
                />
                {!formSlugManual && formSlug && (
                  <p className="text-xs text-muted-foreground">Automatisch gegenereerd uit naam</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                {aiLookupLoading ? (
                  <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Logo zoeken...</p>
                  </div>
                ) : logoFile ? (
                  <LogoPreview
                    logoUrl={URL.createObjectURL(logoFile)}
                    hospitalName={formName}
                    primaryColor={formPrimaryColor}
                    showActions={false}
                  />
                ) : formLogoUrl && logoConfirmed !== false ? (
                  <LogoPreview
                    logoUrl={formLogoUrl}
                    hospitalName={formName}
                    primaryColor={formPrimaryColor}
                    showActions={logoConfirmed === null}
                    onConfirm={() => setLogoConfirmed(true)}
                    onReject={() => {
                      setLogoConfirmed(false);
                      setFormLogoUrl('');
                    }}
                  />
                ) : (
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {logoConfirmed === false ? 'Upload een eigen logo:' : 'Geen logo gevonden — upload een bestand:'}
                    </p>
                    <Input type="file" accept="image/*" onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setLogoFile(file);
                      if (file) setLogoConfirmed(true);
                    }} />
                    <p className="text-xs text-muted-foreground">Of voer een URL in:</p>
                    <Input
                      value={formLogoUrl}
                      onChange={e => { setFormLogoUrl(e.target.value); if (e.target.value) setLogoConfirmed(null); }}
                      placeholder="https://..."
                    />
                  </div>
                )}
                {editingHospital?.logo_url && !logoFile && !formLogoUrl && (
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
                  <div
                    className="h-10 px-3 rounded flex items-center text-xs font-medium text-white"
                    style={{ backgroundColor: formPrimaryColor }}
                  >
                    Preview
                  </div>
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
