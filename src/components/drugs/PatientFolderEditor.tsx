import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  PatientFolderContent, 
  usePatientFolderContent, 
  useSavePatientFolderContent,
  useResetPatientFolderContent 
} from '@/hooks/usePatientFolderContent';
import { Drug } from '@/types/drug';
import { Loader2, Save, RotateCcw, Edit, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PatientFolderEditorProps {
  drug: Drug;
  previewHtml: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onRefreshPreview: () => void;
}

export function PatientFolderEditor({ 
  drug, 
  previewHtml, 
  iframeRef,
  onRefreshPreview 
}: PatientFolderEditorProps) {
  const { t } = useTranslation();
  const { data: savedContent, isLoading } = usePatientFolderContent(drug.id);
  const saveMutation = useSavePatientFolderContent();
  const resetMutation = useResetPatientFolderContent();
  
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [formData, setFormData] = useState<Partial<PatientFolderContent>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Helper to format array to bullet list
  const formatArrayToBullets = (arr: string[] | undefined | null): string => {
    if (!arr || arr.length === 0) return '';
    return arr.map(item => `• ${item}`).join('\n');
  };

  // Initialize form data from saved content or drug defaults
  useEffect(() => {
    if (savedContent) {
      setFormData({
        introduction: savedContent.introduction ?? drug.mechanism_of_action ?? '',
        usage_info: savedContent.usage_info ?? formatArrayToBullets(drug.approved_indications),
        dosing_info: savedContent.dosing_info ?? formatDosingInfo(drug),
        contraindications: savedContent.contraindications ?? formatArrayToBullets(drug.contraindications),
        side_effects_common: savedContent.side_effects_common ?? formatArrayToBullets(drug.side_effects?.common),
        side_effects_serious: savedContent.side_effects_serious ?? formatArrayToBullets(drug.side_effects?.serious),
        tips: savedContent.tips ?? formatArrayToBullets(drug.patient_counseling_points),
        self_care_tips: savedContent.self_care_tips ?? '',
        monitoring: savedContent.monitoring ?? formatArrayToBullets(drug.monitoring_requirements),
      });
    } else {
      setFormData({
        introduction: drug.mechanism_of_action ?? '',
        usage_info: formatArrayToBullets(drug.approved_indications),
        dosing_info: formatDosingInfo(drug),
        contraindications: formatArrayToBullets(drug.contraindications),
        side_effects_common: formatArrayToBullets(drug.side_effects?.common),
        side_effects_serious: formatArrayToBullets(drug.side_effects?.serious),
        tips: formatArrayToBullets(drug.patient_counseling_points),
        self_care_tips: '',
        monitoring: formatArrayToBullets(drug.monitoring_requirements),
      });
    }
    setHasChanges(false);
  }, [savedContent, drug]);

  function formatDosingInfo(drug: Drug): string {
    const parts: string[] = [];
    if (drug.dosing_info?.standard_dose) parts.push(`Dosering: ${drug.dosing_info.standard_dose}`);
    if (drug.dosing_info?.frequency) parts.push(`Frequentie: ${drug.dosing_info.frequency}`);
    if (drug.dosing_info?.duration) parts.push(`Duur: ${drug.dosing_info.duration}`);
    if (drug.cycle_length_days) parts.push(`Cyclus: ${drug.cycle_length_days} dagen`);
    return parts.join('\n');
  }

  const handleChange = (field: keyof PatientFolderContent, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        drug_id: drug.id,
        ...formData,
      });
      toast.success(t('patientFolder.contentSaved'));
      setHasChanges(false);
      // Refresh the preview
      onRefreshPreview();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error(t('patientFolder.saveError'));
    }
  };

  const handleReset = async () => {
    if (!confirm(t('patientFolder.resetConfirm'))) {
      return;
    }
    
    try {
      await resetMutation.mutateAsync(drug.id);
      toast.success(t('patientFolder.contentReset'));
      setHasChanges(false);
      onRefreshPreview();
    } catch (error) {
      console.error('Error resetting content:', error);
      toast.error(t('patientFolder.resetError'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'edit')} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              {t('patientFolder.preview')}
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-2">
              <Edit className="h-4 w-4" />
              {t('common.edit')}
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'edit' && (
            <div className="flex items-center gap-2">
              {savedContent && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReset}
                  disabled={resetMutation.isPending}
                  className="gap-2"
                >
                  {resetMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {t('patientFolder.reset')}
                </Button>
              )}
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasChanges}
                className="gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('common.save')}
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="preview" className="flex-1 m-0">
          <div className="bg-muted rounded-md overflow-hidden" style={{ height: '60vh' }}>
            {previewHtml && (
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="Patiëntenfolder preview"
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="edit" className="flex-1 m-0">
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {hasChanges && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('patientFolder.unsavedChanges')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="introduction">{t('patientFolder.fieldIntroduction', { name: drug.generic_name })}</Label>
                <Textarea
                  id="introduction"
                  value={formData.introduction ?? ''}
                  onChange={(e) => handleChange('introduction', e.target.value)}
                  rows={3}
                  placeholder={t('patientFolder.introPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usage_info">{t('patientFolder.fieldUsage')}</Label>
                <Textarea
                  id="usage_info"
                  value={formData.usage_info ?? ''}
                  onChange={(e) => handleChange('usage_info', e.target.value)}
                  rows={3}
                  placeholder={t('patientFolder.indicationPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('patientFolder.useBullets')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosing_info">{t('patientFolder.fieldDosing')}</Label>
                <Textarea
                  id="dosing_info"
                  value={formData.dosing_info ?? ''}
                  onChange={(e) => handleChange('dosing_info', e.target.value)}
                  rows={3}
                  placeholder={t('patientFolder.dosingPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contraindications">{t('patientFolder.fieldContraindications')}</Label>
                <Textarea
                  id="contraindications"
                  value={formData.contraindications ?? ''}
                  onChange={(e) => handleChange('contraindications', e.target.value)}
                  rows={3}
                  placeholder={t('patientFolder.contraPlaceholder')}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="side_effects_common">{t('patientFolder.fieldCommonSideEffects')}</Label>
                  <Textarea
                    id="side_effects_common"
                    value={formData.side_effects_common ?? ''}
                    onChange={(e) => handleChange('side_effects_common', e.target.value)}
                    rows={4}
                    placeholder={t('patientFolder.sideEffectPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="side_effects_serious">{t('patientFolder.fieldSeriousSideEffects')}</Label>
                  <Textarea
                    id="side_effects_serious"
                    value={formData.side_effects_serious ?? ''}
                    onChange={(e) => handleChange('side_effects_serious', e.target.value)}
                    rows={4}
                    placeholder={t('patientFolder.sideEffectPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tips">{t('patientFolder.fieldTips')}</Label>
                <Textarea
                  id="tips"
                  value={formData.tips ?? ''}
                  onChange={(e) => handleChange('tips', e.target.value)}
                  rows={3}
                  placeholder={t('patientFolder.tipsPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="self_care_tips">{t('patientFolder.fieldSelfCare')}</Label>
                <Textarea
                  id="self_care_tips"
                  value={formData.self_care_tips ?? ''}
                  onChange={(e) => handleChange('self_care_tips', e.target.value)}
                  rows={4}
                  placeholder={t('patientFolder.selfCarePlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('patientFolder.fieldSelfCareHint')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monitoring">{t('patientFolder.fieldMonitoring')}</Label>
                <Textarea
                  id="monitoring"
                  value={formData.monitoring ?? ''}
                  onChange={(e) => handleChange('monitoring', e.target.value)}
                  rows={3}
                  placeholder={t('patientFolder.monitoringPlaceholder')}
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
