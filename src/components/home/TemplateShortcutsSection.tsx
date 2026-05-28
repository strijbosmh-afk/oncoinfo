import { useState } from 'react';
import { Star, Pin, Copy, Check } from 'lucide-react';
import { useDischargeTemplates } from '@/hooks/useDischargeTemplates';
import { useTemplateFavorites } from '@/hooks/useTemplateFavorites';
import { useTemplateMostUsed } from '@/hooks/useTemplateMostUsed';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export function TemplateShortcutsSection() {
  const { permissions, isAdmin, isSuperAdmin } = useAuth();
  const canView = isAdmin || isSuperAdmin || !!permissions?.is_physician;
  const { data } = useDischargeTemplates(canView);
  const { favorites, toggleFavorite } = useTemplateFavorites();
  const { mostUsed, toggleMostUsed } = useTemplateMostUsed();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!canView || !data?.templates?.length) return null;

  const byId = new Map(data.templates.map(t => [t.id, t]));
  const favTemplates = favorites.map(id => byId.get(id)).filter(Boolean) as typeof data.templates;
  const mostUsedTemplates = mostUsed
    .map(m => byId.get(m.template_id))
    .filter(Boolean) as typeof data.templates;

  if (favTemplates.length === 0 && mostUsedTemplates.length === 0) return null;

  const copy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success('Gekopieerd');
      setTimeout(() => setCopiedId(null), 1500);
    } catch { toast.error('Kopiëren mislukt'); }
  };

  const renderItem = (t: typeof data.templates[number], kind: 'fav' | 'most') => (
    <Card key={`${kind}-${t.id}`} className="p-3 flex items-start justify-between gap-2 hover:border-primary/40 transition-colors">
      <Link
        to={`/discharge-templates/${encodeURIComponent(t.discipline)}`}
        className="flex-1 min-w-0"
      >
        <div className="text-xs text-muted-foreground truncate">{t.discipline}</div>
        <div className="text-sm font-medium truncate">{t.title}</div>
      </Link>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7"
          onClick={() => copy(t.id, t.content)}>
          {copiedId === t.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        {kind === 'fav' ? (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleFavorite(t.id)}>
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleMostUsed(t.id)}>
            <Pin className="h-3.5 w-3.5 fill-primary text-primary" />
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="mt-6 max-w-6xl mx-auto space-y-4">
      {favTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <h3 className="text-sm font-semibold">Favoriete sjablonen</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {favTemplates.map(t => renderItem(t, 'fav'))}
          </div>
        </div>
      )}
      {mostUsedTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Pin className="h-4 w-4 fill-primary text-primary" />
            <h3 className="text-sm font-semibold">Meest gebruikte sjablonen</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {mostUsedTemplates.map(t => renderItem(t, 'most'))}
          </div>
        </div>
      )}
    </div>
  );
}
