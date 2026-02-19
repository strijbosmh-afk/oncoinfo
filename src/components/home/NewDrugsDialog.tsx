import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { NewDrugInfo } from '@/hooks/useNewDrugsNotification';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface NewDrugsDialogProps {
  open: boolean;
  onClose: () => void;
  drugs: NewDrugInfo[];
}

export function NewDrugsDialog({ open, onClose, drugs }: NewDrugsDialogProps) {
  const { t } = useTranslation();

  if (drugs.length === 0) return null;

  const description = drugs.length === 1
    ? t('newDrugs.descriptionOne')
    : t('newDrugs.descriptionMultiple', { count: drugs.length });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {t('newDrugs.title')}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6 py-2">
          <ul className="space-y-3">
            {drugs.map((drug) => (
              <li key={drug.id}>
                <Link
                  to={`/drugs/${drug.id}`}
                  onClick={onClose}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{drug.generic_name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {drug.disease_areas.slice(0, 3).map((area) => (
                          <Badge key={area} variant="outline" className="text-[10px] px-1.5 py-0">
                            {area}
                          </Badge>
                        ))}
                        {drug.disease_areas.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{drug.disease_areas.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                      {drug.drug_class}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3 border-t">
          <Button onClick={onClose} className="w-full" size="sm">
            {t('newDrugs.understood')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
