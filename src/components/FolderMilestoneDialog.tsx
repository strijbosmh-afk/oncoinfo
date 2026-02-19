import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FolderMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
}

function fireConfetti() {
  const end = Date.now() + 2500;
  const colors = ["#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6"];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function FolderMilestoneDialog({ open, onOpenChange, count }: FolderMilestoneDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (open) fireConfetti();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center">🎉🏆🎊</DialogTitle>
          <DialogDescription className="text-center text-lg font-semibold text-foreground pt-2">
            {t('milestone.title', { count })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-2xl font-bold text-primary">
            {t('milestone.congrats')}
          </p>
          <p
            className="text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: t('milestone.message', { count }) }}
          />
          <p className="text-sm text-muted-foreground italic">
            {t('milestone.joke')}
          </p>
        </div>
        <Button onClick={() => onOpenChange(false)} className="w-full">
          {t('milestone.dismiss')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
