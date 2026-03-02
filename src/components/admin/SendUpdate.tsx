import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PlatformUpdate {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export function SendUpdate() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data: updates, isLoading } = useQuery({
    queryKey: ['platform-updates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('platform_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as PlatformUpdate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('platform_updates')
        .insert({ title, content, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('platformUpdate.sent', 'Update verstuurd naar alle gebruikers'));
      setTitle('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['platform-updates'] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('platform_updates')
        .update({ is_active: !is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-updates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('platform_updates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-updates'] });
      toast.success(t('common.delete', 'Verwijderd'));
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createMutation.mutate();
  }, [title, content, createMutation]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          {t('platformUpdate.title', 'Update Versturen')}
        </CardTitle>
        <CardDescription>
          {t('platformUpdate.description', 'Stuur een update-melding naar alle gebruikers. De melding wordt één keer getoond bij het inloggen.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder={t('platformUpdate.titlePlaceholder', 'Titel van de update...')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div>
            <Textarea
              placeholder={t('platformUpdate.contentPlaceholder', 'Beschrijf de nieuwe features of wijzigingen...')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length}/2000 — {t('platformUpdate.markdownHint', 'Markdown ondersteund: **vet**, - opsomming, [link](url)')}
            </p>
          </div>
          <Button type="submit" disabled={!title.trim() || !content.trim() || createMutation.isPending} className="gap-2">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t('platformUpdate.send', 'Versturen')}
          </Button>
        </form>

        {/* Previous updates */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : updates && updates.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">{t('platformUpdate.previousUpdates', 'Eerdere updates')}</h4>
            {updates.map((update) => (
              <div key={update.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{update.title}</p>
                    <Badge variant={update.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {update.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{update.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(update.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleMutation.mutate({ id: update.id, is_active: update.is_active })}
                    title={update.is_active ? t('platformUpdate.deactivate', 'Deactiveren') : t('platformUpdate.activate', 'Activeren')}
                  >
                    {update.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(update.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
