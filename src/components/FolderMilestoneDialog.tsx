import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FolderMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
}

export function FolderMilestoneDialog({ open, onOpenChange, count }: FolderMilestoneDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center">🎉🏆🎊</DialogTitle>
          <DialogDescription className="text-center text-lg font-semibold text-foreground pt-2">
            Folder #{count}!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-2xl font-bold text-primary">
            Gefeliciteerd! 🥳
          </p>
          <p className="text-muted-foreground">
            Je hebt zojuist je <span className="font-bold text-foreground">{count}e</span> patiëntenfolder afgedrukt!
          </p>
          <p className="text-sm text-muted-foreground italic">
            Als dit een videogame was, had je nu een achievement ontgrendeld. 🏅
          </p>
        </div>
        <Button onClick={() => onOpenChange(false)} className="w-full">
          Bedankt, ik ga door met redden van de wereld 💪
        </Button>
      </DialogContent>
    </Dialog>
  );
}
