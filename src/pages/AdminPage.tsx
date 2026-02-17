import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDrugs } from '@/hooks/useDrugs';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pill, Layers, FileText, Users, Plus, ClipboardList, Sparkles, ChevronLeft, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DRUG_CLASSES } from '@/types/drug';
import { UserManagement } from '@/components/admin/UserManagement';
import { AuditLog } from '@/components/admin/AuditLog';
import { RegimenSearch } from '@/components/admin/RegimenSearch';
import { AutoUpdateTherapies } from '@/components/admin/AutoUpdateTherapies';
import { ScheduleAutoUpdate } from '@/components/admin/ScheduleAutoUpdate';
import { CalendarClock, Building2, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UsageDashboard } from '@/components/admin/UsageDashboard';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user, isAdmin, isApotheker, isSuperAdmin, loading } = useAuth();
  const { data: drugs, isLoading: drugsLoading, refetch: refetchDrugs } = useDrugs({});
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [regimenDialogOpen, setRegimenDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'users' | 'audit' | 'auto-update' | 'schedule' | 'dashboard' | null>(null);
  const navigate = useNavigate();

  const [drugToDelete, setDrugToDelete] = useState<{ id: string; name: string } | null>(null);
  const [drugToArchive, setDrugToArchive] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedDrugs, setArchivedDrugs] = useState<any[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const [hasAutoUpdate, setHasAutoUpdate] = useState(false);
  const [hasScheduledUpdates, setHasScheduledUpdates] = useState(false);

  useEffect(() => {
    if (!user || isSuperAdmin) {
      setHasAutoUpdate(true);
      setHasScheduledUpdates(true);
      return;
    }
    supabase
      .from('hospital_features')
      .select('feature_key, is_enabled')
      .then(({ data }) => {
        if (data) {
          setHasAutoUpdate(data.some(f => f.feature_key === 'auto_update' && f.is_enabled));
          setHasScheduledUpdates(data.some(f => f.feature_key === 'scheduled_updates' && f.is_enabled));
        }
      });
  }, [user, isSuperAdmin]);

  const totalDrugs = drugs?.length || 0;
  const combinationDrugs = drugs?.filter(d => d.drug_class === 'Combinatietherapie').length || 0;
  const individualDrugs = totalDrugs - combinationDrugs;

  const filteredDrugs = useMemo(() => {
    if (!drugs) return [];
    return drugs.filter(drug => {
      const matchesSearch = !searchQuery || 
        drug.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.brand_names?.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesClass = filterClass === 'all' || drug.drug_class === filterClass;
      return matchesSearch && matchesClass;
    });
  }, [drugs, searchQuery, filterClass]);

  const handleDeleteDrug = useCallback(async () => {
    if (!drugToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from('patient_folder_content').delete().eq('drug_id', drugToDelete.id);
      await supabase.from('hospital_drug_visibility').delete().eq('drug_id', drugToDelete.id);
      await supabase.from('user_favorites').delete().eq('drug_id', drugToDelete.id);
      await supabase.from('user_most_used').delete().eq('drug_id', drugToDelete.id);
      await supabase.from('user_drug_order').delete().eq('drug_id', drugToDelete.id);

      const { error } = await supabase.from('drugs').delete().eq('id', drugToDelete.id);
      if (error) throw error;
      toast.success(`"${drugToDelete.name}" is permanent verwijderd`);
      await refetchDrugs();
      fetchArchivedDrugs();
    } catch (err: any) {
      toast.error(t('common.error') + ': ' + (err.message || 'Onbekende fout'));
    } finally {
      setIsDeleting(false);
      setDrugToDelete(null);
    }
  }, [drugToDelete, refetchDrugs, t]);

  const handleArchiveDrug = useCallback(async () => {
    if (!drugToArchive) return;
    setIsArchiving(true);
    try {
      const { error } = await supabase.from('drugs').update({ is_archived: true } as any).eq('id', drugToArchive.id);
      if (error) throw error;
      toast.success(`"${drugToArchive.name}" is gearchiveerd`);
      await refetchDrugs();
      fetchArchivedDrugs();
    } catch (err: any) {
      toast.error(t('common.error') + ': ' + (err.message || 'Onbekende fout'));
    } finally {
      setIsArchiving(false);
      setDrugToArchive(null);
    }
  }, [drugToArchive, refetchDrugs, t]);

  const handleRestoreDrug = useCallback(async (drugId: string, drugName: string) => {
    try {
      const { error } = await supabase.from('drugs').update({ is_archived: false } as any).eq('id', drugId);
      if (error) throw error;
      toast.success(`"${drugName}" is hersteld`);
      await refetchDrugs();
      fetchArchivedDrugs();
    } catch (err: any) {
      toast.error(t('common.error') + ': ' + (err.message || 'Onbekende fout'));
    }
  }, [refetchDrugs, t]);

  const fetchArchivedDrugs = useCallback(async () => {
    setArchivedLoading(true);
    const { data } = await supabase.from('drugs').select('id, generic_name, drug_class, disease_areas, updated_at').eq('is_archived', true).order('updated_at', { ascending: false });
    setArchivedDrugs(data || []);
    setArchivedLoading(false);
  }, []);

  useEffect(() => {
    if (showArchived) fetchArchivedDrugs();
  }, [showArchived, fetchArchivedDrugs]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin && !isApotheker) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('auth.accessDenied')}</h1>
          <p className="text-muted-foreground">{t('auth.accessDeniedDescription')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <button 
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('drugs.backToCategories', 'Terug naar specialiteiten')}
        </button>
        <h1 className="text-3xl font-bold mb-2">{t('admin.title')}</h1>
        <p className="text-muted-foreground mb-8">{t('admin.description')}</p>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="stat-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.totalDrugs')}</p>
                  <p className="text-3xl font-bold">{totalDrugs}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center stat-icon">
                  <Pill className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.combinationRegimens')}</p>
                  <p className="text-3xl font-bold">{combinationDrugs}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center stat-icon">
                  <Layers className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.individualDrugs')}</p>
                  <p className="text-3xl font-bold">{individualDrugs}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center stat-icon">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation — grouped by function */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
          <div className="flex flex-wrap gap-2 flex-1">
            {isAdmin && (
              <Button 
                variant={activeSection === 'users' ? 'default' : 'outline'}
                onClick={() => setActiveSection(activeSection === 'users' ? null : 'users')}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                {t('admin.userManagement')}
              </Button>
            )}
            {isSuperAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate('/admin/hospitals')}
                className="gap-2"
              >
                <Building2 className="h-4 w-4" />
                {t('admin.hospitals')}
              </Button>
            )}
            <Button 
              variant={activeSection === 'audit' ? 'default' : 'outline'}
              onClick={() => setActiveSection(activeSection === 'audit' ? null : 'audit')}
              className="gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              {t('admin.activityLog')}
            </Button>
            {isSuperAdmin && (
              <Button
                variant={activeSection === 'dashboard' ? 'default' : 'outline'}
                onClick={() => setActiveSection(activeSection === 'dashboard' ? null : 'dashboard')}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {t('dashboard.title', 'Gebruiksoverzicht')}
              </Button>
            )}
          </div>

          <div className="hidden sm:block w-px h-8 bg-border self-center" />

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => setRegimenDialogOpen(true)} 
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('admin.addTherapy')}
            </Button>
            <Button
              variant={activeSection === 'auto-update' ? 'default' : 'outline'}
              onClick={() => hasAutoUpdate && setActiveSection(activeSection === 'auto-update' ? null : 'auto-update')}
              className="gap-2"
              disabled={!hasAutoUpdate}
              title={!hasAutoUpdate ? t('admin.featureNotActive') : undefined}
            >
              <Sparkles className="h-4 w-4" />
              {t('admin.autoUpdate')}
              {!hasAutoUpdate ? (
                <Badge variant="outline" className="text-muted-foreground border-muted text-[10px] px-1.5 py-0 ml-1">
                  {t('admin.notActive')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 text-[10px] px-1.5 py-0 ml-1">
                  {t('admin.beta')}
                </Badge>
              )}
            </Button>
            {isSuperAdmin && (
              <Button
                variant={activeSection === 'schedule' ? 'default' : 'outline'}
                onClick={() => hasScheduledUpdates && setActiveSection(activeSection === 'schedule' ? null : 'schedule')}
                className="gap-2"
                disabled={!hasScheduledUpdates}
                title={!hasScheduledUpdates ? t('admin.featureNotActive') : undefined}
              >
                <CalendarClock className="h-4 w-4" />
                {t('admin.scheduledUpdates')}
                {!hasScheduledUpdates && (
                  <Badge variant="outline" className="text-muted-foreground border-muted text-[10px] px-1.5 py-0 ml-1">
                    {t('admin.notActive')}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Active Section */}
        {activeSection === 'users' && isAdmin && (
          <div className="mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <UserManagement />
          </div>
        )}

        {activeSection === 'audit' && (
          <div className="mb-8">
            <AuditLog />
          </div>
        )}

        {activeSection === 'auto-update' && (
          <div className="mb-8">
            <AutoUpdateTherapies />
          </div>
        )}

        {activeSection === 'schedule' && isSuperAdmin && (
          <div className="mb-8">
            <ScheduleAutoUpdate />
          </div>
        )}

        {activeSection === 'dashboard' && isSuperAdmin && (
          <div className="mb-8">
            <UsageDashboard />
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">{t('admin.overview')}</TabsTrigger>
            <TabsTrigger value="drugs">{t('admin.drugsTab')} ({totalDrugs})</TabsTrigger>
            <TabsTrigger value="archived" onClick={() => setShowArchived(true)} className="gap-1.5">
              <Archive className="h-3.5 w-3.5" />
              Archief
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.libraryOverview')}</CardTitle>
                <CardDescription>
                  {t('admin.libraryDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('admin.libraryStats', { total: totalDrugs, combos: combinationDrugs, individual: individualDrugs })}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drugs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.manageDrugs')}</CardTitle>
                <CardDescription>{t('admin.manageDrugsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input 
                    placeholder={t('drugs.searchPlaceholder')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={t('drugs.allClasses')} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">{t('drugs.allClasses')}</SelectItem>
                      {DRUG_CLASSES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {drugsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">{t('drugs.found', { count: filteredDrugs.length })}</p>
                    {filteredDrugs.slice(0, 50).map(drug => (
                      <div key={drug.id} className="drug-row flex justify-between items-center p-3 border rounded-lg cursor-default group/row hover:border-destructive/30 transition-colors">
                        <div className="flex items-center gap-3">
                          {drug.drug_class === 'Combinatietherapie' ? (
                            <Layers className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Pill className="h-4 w-4 text-primary" />
                          )}
                          <div>
                            <p className="font-medium">{drug.generic_name}</p>
                            <p className="text-xs text-muted-foreground">{drug.drug_class}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {drug.disease_areas?.join(', ')}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => setDrugToArchive({ id: drug.id, name: drug.generic_name })}
                            title="Archiveren"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredDrugs.length > 50 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        {t('drugs.andMore', { count: filteredDrugs.length - 50 })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Gearchiveerde geneesmiddelen
                </CardTitle>
                <CardDescription>
                  Gearchiveerde geneesmiddelen zijn niet zichtbaar voor gebruikers. U kunt ze herstellen of permanent verwijderen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {archivedLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : archivedDrugs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Geen gearchiveerde geneesmiddelen</p>
                ) : (
                  <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">{archivedDrugs.length} gearchiveerd</p>
                    {archivedDrugs.map(drug => (
                      <div key={drug.id} className="flex justify-between items-center p-3 border rounded-lg border-dashed border-muted-foreground/30 group/row hover:border-primary/40 transition-colors">
                        <div className="flex items-center gap-3">
                          {drug.drug_class === 'Combinatietherapie' ? (
                            <Layers className="h-4 w-4 text-amber-600/50" />
                          ) : (
                            <Pill className="h-4 w-4 text-primary/50" />
                          )}
                          <div>
                            <p className="font-medium text-muted-foreground">{drug.generic_name}</p>
                            <p className="text-xs text-muted-foreground/70">{drug.drug_class} · {drug.disease_areas?.join(', ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-primary hover:text-primary"
                            onClick={() => handleRestoreDrug(drug.id, drug.generic_name)}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            Herstellen
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDrugToDelete({ id: drug.id, name: drug.generic_name })}
                            title="Permanent verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Therapy Dialog */}
        <Dialog open={regimenDialogOpen} onOpenChange={setRegimenDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('admin.addTherapy')}</DialogTitle>
            </DialogHeader>
            <RegimenSearch />
          </DialogContent>
        </Dialog>

        {/* Archive Confirmation Dialog */}
        <AlertDialog open={!!drugToArchive} onOpenChange={(open) => !open && setDrugToArchive(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Geneesmiddel archiveren</AlertDialogTitle>
              <AlertDialogDescription>
                Weet u zeker dat u <strong>"{drugToArchive?.name}"</strong> wilt archiveren?
                Het geneesmiddel wordt niet meer getoond aan gebruikers, maar kan op elk moment worden hersteld.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isArchiving}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchiveDrug}
                disabled={isArchiving}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {isArchiving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                Archiveren
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanent Delete Confirmation Dialog */}
        <AlertDialog open={!!drugToDelete} onOpenChange={(open) => !open && setDrugToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanent verwijderen</AlertDialogTitle>
              <AlertDialogDescription>
                Weet u zeker dat u <strong>"{drugToDelete?.name}"</strong> permanent wilt verwijderen?
                Dit verwijdert ook alle bijbehorende patiëntenfolders, zichtbaarheidsinstellingen en gebruikersvoorkeuren.
                Deze actie kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDrug}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Permanent verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
