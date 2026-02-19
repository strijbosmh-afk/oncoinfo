import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface DemoRestrictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoRestrictionDialog({ open, onOpenChange }: DemoRestrictionDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          </div>
          <DialogTitle className="text-center">{t('demo.title')}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {t('demo.description')}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
          {t('demo.dismiss')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
