import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Pencil, Trash2, Building2, UserPlus, X, Stethoscope, Heart, Pill, Users, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useUserManagement } from '@/hooks/useUserManagement';

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

export function HospitalManagement() {
  const { toast } = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [doctorsDialogOpen, setDoctorsDialogOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeStaffTab, setActiveStaffTab] = useState<StaffType | 'users'>('users');
  const [userSearch, setUserSearch] = useState('');
  const { users, updateHospitals, refetch: refetchUsers } = useUserManagement();

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formPrimaryColor, setFormPrimaryColor] = useState('#6b2d5b');
  const [formIsActive, setFormIsActive] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Staff form
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffSpec, setNewStaffSpec] = useState('');

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

  useEffect(() => { fetchHospitals(); }, [fetchHospitals]);

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

    // Upload logo if provided
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
      const { error } = await supabase
        .from('hospitals')
        .update(payload)
        .eq('id', editingHospital.id);
      if (error) {
        toast({ title: 'Fout bij bijwerken', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Ziekenhuis bijgewerkt' });
      }
    } else {
      const { error } = await supabase
        .from('hospitals')
        .insert(payload);
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
    if (!confirm(`Weet je zeker dat je "${h.name}" wilt verwijderen? Dit verwijdert ook alle gekoppelde artsen.`)) return;
    const { error } = await supabase.from('hospitals').delete().eq('id', h.id);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ziekenhuis verwijderd' });
      fetchHospitals();
    }
  };

  // Staff management
  const openStaff = async (h: Hospital) => {
    setSelectedHospital(h);
    setDoctorsDialogOpen(true);
    setStaffLoading(true);
    const { data } = await supabase
      .from('hospital_doctors')
      .select('*')
      .eq('hospital_id', h.id)
      .order('display_order');
    setStaffMembers((data || []) as StaffMember[]);
    setStaffLoading(false);
  };

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
      openStaff(selectedHospital);
    }
  };

  const removeStaffMember = async (id: string) => {
    await supabase.from('hospital_doctors').delete().eq('id', id);
    if (selectedHospital) openStaff(selectedHospital);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Ziekenhuizen Beheren
              </CardTitle>
              <CardDescription>Beheer ziekenhuizen, logo's en branding voor het platform</CardDescription>
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuw Ziekenhuis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hospitals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Geen ziekenhuizen gevonden</p>
          ) : (
            <div className="space-y-3">
              {hospitals.map(h => (
                <div key={h.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {h.logo_url ? (
                      <img src={h.logo_url} alt={h.name} className="h-10 w-auto max-w-[80px] object-contain" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{h.name}</p>
                        <Badge variant={h.is_active ? 'default' : 'secondary'} className="text-xs">
                          {h.is_active ? 'Actief' : 'Inactief'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Slug: {h.slug}</p>
                    </div>
                    {h.branding?.primary_color && (
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: h.branding.primary_color }}
                        title={h.branding.primary_color}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openStaff(h)} className="gap-1">
                      <UserPlus className="h-3.5 w-3.5" />
                      Medewerkers
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(h)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(h)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                <p className="text-xs text-muted-foreground">Huidig logo behouden (laat leeg om niet te wijzigen)</p>
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

      {/* Staff Dialog */}
      <Dialog open={doctorsDialogOpen} onOpenChange={setDoctorsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Medewerkers – {selectedHospital?.name}</DialogTitle>
          </DialogHeader>
          {staffLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Tabs value={activeStaffTab} onValueChange={v => setActiveStaffTab(v as StaffType | 'users')}>
              <TabsList className="w-full">
                <TabsTrigger value="users" className="flex-1 gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Gekoppelde gebruikers ({
                    (users || []).filter(u => selectedHospital && (u.hospital_id === selectedHospital.id || (u.linked_hospital_ids || []).includes(selectedHospital.id))).length
                  })
                </TabsTrigger>
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

              <TabsContent value="users" className="space-y-3 mt-4">
                {selectedHospital && (() => {
                  const hid = selectedHospital.id;
                  const linked = (users || []).filter(u => u.hospital_id === hid || (u.linked_hospital_ids || []).includes(hid));
                  const q = userSearch.trim().toLowerCase();
                  const notLinked = (users || []).filter(u => u.hospital_id !== hid && !(u.linked_hospital_ids || []).includes(hid));
                  const filtered = q ? notLinked.filter(u =>
                    [u.first_name, u.last_name, u.email, u.username].filter(Boolean).some(v => String(v).toLowerCase().includes(q))
                  ) : [];
                  return (
                    <>
                      <div>
                        <p className="text-xs font-medium mb-2 text-muted-foreground">Gekoppelde gebruikers ({linked.length})</p>
                        {linked.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-3">Nog geen gebruikers gekoppeld</p>
                        ) : (
                          <div className="space-y-2">
                            {linked.map(u => {
                              const isPrimary = u.hospital_id === hid;
                              return (
                                <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {u.email}{u.function ? ` · ${u.function}` : ''}{u.discipline ? ` · ${u.discipline}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant={isPrimary ? 'default' : 'secondary'} className="text-xs">
                                      {isPrimary ? 'Primair' : 'Gekoppeld'}
                                    </Badge>
                                    {!isPrimary && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={async () => {
                                          const next = (u.linked_hospital_ids || []).filter(id => id !== hid);
                                          await updateHospitals.mutateAsync({ user_id: u.id, hospital_ids: next });
                                          refetchUsers();
                                        }}
                                        title="Loskoppelen"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t">
                        <p className="text-xs font-medium mb-2 text-muted-foreground">Bestaande gebruiker koppelen</p>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                            placeholder="Zoek op naam of e-mail…"
                            className="pl-8"
                          />
                        </div>
                        {q && (
                          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                            {filtered.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-3">Geen gebruikers gevonden</p>
                            ) : filtered.slice(0, 20).map(u => (
                              <div key={u.id} className="flex items-center justify-between p-2 border rounded-lg">
                                <div className="min-w-0">
                                  <p className="text-sm truncate">
                                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {u.email}{u.hospital_name ? ` · primair: ${u.hospital_name}` : ''}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    const next = Array.from(new Set([...(u.linked_hospital_ids || []), hid]));
                                    await updateHospitals.mutateAsync({ user_id: u.id, hospital_ids: next });
                                    setUserSearch('');
                                    refetchUsers();
                                  }}
                                  className="gap-1 shrink-0"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Koppelen
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

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
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Medewerkers kunnen worden beheerd via Gebruikersbeheer
                    </p>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
