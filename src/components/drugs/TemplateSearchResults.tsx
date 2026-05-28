import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDischargeTemplates } from '@/hooks/useDischargeTemplates';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  query: string;
}

export function TemplateSearchResults({ query }: Props) {
  const { permissions, isAdmin, isSuperAdmin } = useAuth();
  const canView = isAdmin || isSuperAdmin || !!permissions?.is_physician;
  const { data } = useDischargeTemplates(canView);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2 || !data?.templates) return [];
    return data.templates.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      t.discipline.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query, data]);

  if (!canView || matches.length === 0) return null;

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Gekopieerd');
      setTimeout(() => setCopiedId(null), 1500);
    } catch { toast.error('Kopiëren mislukt'); }
  };

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const highlight = (text: string, q: string) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0 || q.length < 2) return text;
    return <>{text.slice(0, idx)}<mark className="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>;
  };

  return (
    <div className="mb-6 border border-primary/20 rounded-lg bg-primary/5 p-3">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Sjablonen ({matches.length})</h3>
      </div>
      <div className="space-y-2">
        {matches.map(t => {
          const isOpen = expanded.has(t.id);
          return (
            <Card key={t.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="mb-1 text-[10px]">{t.discipline}</Badge>
                  <div className="text-sm font-medium">{highlight(t.title, query.trim())}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copy(t.id, t.content)}>
                    {copiedId === t.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggle(t.id)}>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 border-t">
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/90 max-h-64 overflow-auto">
                    {t.content}
                  </pre>
                  <Link to={`/discharge-templates/${encodeURIComponent(t.discipline)}`} className="text-xs text-primary hover:underline mt-2 inline-block">
                    Open volledige sjablonenlijst →
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
