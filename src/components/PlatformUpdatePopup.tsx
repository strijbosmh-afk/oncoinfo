import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PlatformUpdate {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function PlatformUpdatePopup() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [unreadUpdate, setUnreadUpdate] = useState<PlatformUpdate | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || loading) return;

    const checkForUpdates = async () => {
      // Get the latest active update
      const { data: updates, error: updatesError } = await (supabase as any)
        .from('platform_updates')
        .select('id, title, content, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (updatesError || !updates || updates.length === 0) return;

      const latestUpdate = updates[0] as PlatformUpdate;

      // Check if the user has already read this update
      const { data: reads } = await (supabase as any)
        .from('platform_update_reads')
        .select('id')
        .eq('update_id', latestUpdate.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!reads) {
        setUnreadUpdate(latestUpdate);
        setOpen(true);
      }
    };

    checkForUpdates();
  }, [user, loading]);

  const handleDismiss = async () => {
    if (unreadUpdate && user) {
      await (supabase as any)
        .from('platform_update_reads')
        .insert({ update_id: unreadUpdate.id, user_id: user.id });
    }
    setOpen(false);
  };

  if (!unreadUpdate) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">{unreadUpdate.title}</DialogTitle>
          </div>
          <div className="text-left pt-2 text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_p]:mb-2 [&_li]:mb-1">
            <ReactMarkdown>{unreadUpdate.content}</ReactMarkdown>
          </div>
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
