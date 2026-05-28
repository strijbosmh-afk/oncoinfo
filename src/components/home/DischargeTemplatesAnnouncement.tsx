import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Stethoscope } from 'lucide-react';

const STORAGE_KEY = 'discharge_templates_announce_seen';

export function DischargeTemplatesAnnouncement() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(STORAGE_KEY);
    if (!alreadySeen) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">{t('home.dischargeAnnouncementTitle')}</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-1">
            <p>{t('home.dischargeAnnouncementDesc')}</p>
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Stethoscope className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-foreground">
                {t('home.dischargeAnnouncementPhysicianOnly')}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleDismiss} className="w-full">
            {t('newDrugs.understood', 'Begrepen')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
