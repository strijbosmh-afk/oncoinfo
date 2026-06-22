import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ClipboardList, Printer, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "oncoinfo_release_2026_06_workflow_tools_seen";

export function ReleaseNotesDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted || !data.session || localStorage.getItem(STORAGE_KEY)) return;
      setOpen(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  const items = [
    {
      icon: Printer,
      title: t("releaseNotes.printTitle"),
      description: t("releaseNotes.printDescription"),
    },
    {
      icon: Zap,
      title: t("releaseNotes.speedTitle"),
      description: t("releaseNotes.speedDescription"),
    },
    {
      icon: ShieldCheck,
      title: t("releaseNotes.aiTitle"),
      description: t("releaseNotes.aiDescription"),
    },
    {
      icon: ClipboardList,
      title: t("releaseNotes.workflowTitle"),
      description: t("releaseNotes.workflowDescription"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) handleDismiss(); }}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary/12 via-background to-background px-6 pt-6">
          <DialogHeader>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">{t("releaseNotes.title")}</DialogTitle>
                <DialogDescription className="mt-1 text-left">
                  {t("releaseNotes.subtitle")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-6 pb-2">
          {items.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-lg border bg-card p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium leading-none">{item.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}

          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">{t("releaseNotes.footerNote")}</p>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button onClick={handleDismiss} className="w-full sm:w-auto">
            {t("releaseNotes.cta")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
