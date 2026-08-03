import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useDischargeTemplates } from '@/hooks/useDischargeTemplates';
import { useTemplateFavorites } from '@/hooks/useTemplateFavorites';
import { useTemplateMostUsed } from '@/hooks/useTemplateMostUsed';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Copy, Check, FileText, Loader2, Star, Pin, Search, ClipboardList, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TemplateShortcutsSection } from '@/components/home/TemplateShortcutsSection';

export default function DischargeTemplatesPage() {
  const { discipline } = useParams<{ discipline: string }>();
  const { permissions, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { data, isLoading } = useDischargeTemplates();
  const { isFavorite, toggleFavorite } = useTemplateFavorites();
  const { isMostUsed, toggleMostUsed } = useTemplateMostUsed();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const canView = isAdmin || isSuperAdmin || !!permissions?.is_physician;

  const decoded = decodeURIComponent(discipline || '');
  const isOverview = !discipline;
  const disciplines = useMemo(
    () => Array.from(new Set((data?.templates || []).map(t => t.discipline))).sort(),
    [data]
  );
  const items = useMemo(
    () => isOverview ? (data?.templates || []) : (data?.templates || []).filter(t => t.discipline === decoded),
    [data, decoded, isOverview]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      t => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Gekopieerd naar klembord');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Kopiëren mislukt');
    }
  };

  if (authLoading) {
    return <Layout><div className="container py-10 flex justify-center"><Loader2 className="animate-spin" /></div></Layout>;
  }
  if (!canView) return <Navigate to="/home" replace />;

  return (
    <Layout>
      <div className="container max-w-6xl py-5 sm:py-6">
        {!isOverview && (
          <Link to="/discharge-templates" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Alle ontslagbriefsjablonen
          </Link>
        )}

        {/* Header banner */}
        <div className="relative mb-4 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{isOverview ? 'Ontslagbriefsjablonen' : decoded}</h1>
                {!isLoading && (
                  <Badge variant="secondary" className="rounded-full">
                    {items.length} {items.length === 1 ? 'sjabloon' : 'sjablonen'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isOverview ? 'Selecteer een discipline of zoek een sjabloon.' : 'Standaardteksten voor ontslagbrieven — klik op een sjabloon om te kopiëren.'}
              </p>
              {data?.document && (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 border">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground/80">{data.document.document_title}</span>
                  </span>
                  <span className="inline-flex items-center rounded-full bg-background/70 px-2.5 py-1 border">
                    Bijgewerkt {format(new Date(data.document.uploaded_at), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {isOverview && disciplines.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {disciplines.map(item => (
              <Button key={item} variant="outline" size="sm" asChild className="h-8 rounded-full px-3 text-xs">
                <Link to={`/discharge-templates/${encodeURIComponent(item)}`}>{item}</Link>
              </Button>
            ))}
          </div>
        )}

        {isOverview && <TemplateShortcutsSection className="mb-5" />}

        {/* Search */}
        {!isLoading && items.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Zoek in sjablonen..."
              className="h-9 pl-9"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-3 opacity-40" />
            Geen sjablonen beschikbaar voor deze discipline.
          </CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Geen sjablonen gevonden voor "{query}".
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => {
              const fav = isFavorite(t.id);
              const used = isMostUsed(t.id);
              const expanded = expandedIds.has(t.id);
              return (
                <Collapsible
                  key={t.id}
                  open={expanded}
                  onOpenChange={(open) => setExpandedIds((current) => {
                    const next = new Set(current);
                    if (open) next.add(t.id); else next.delete(t.id);
                    return next;
                  })}
                  asChild
                >
                <Card className="group overflow-hidden border-l-4 border-l-primary/40 transition-all hover:border-l-primary hover:shadow-sm">
                  <div className="flex w-full flex-row items-center justify-between gap-3 bg-muted/20 px-4 py-2.5 hover:bg-muted/40">
                    <CollapsibleTrigger asChild>
                    <button type="button" className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </span>
                        <h3 className="truncate pt-0.5 text-sm font-semibold leading-snug sm:text-base">{t.title}</h3>
                      </div>
                    </button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(event) => { event.stopPropagation(); toggleFavorite(t.id); }}
                        title={fav ? 'Verwijder uit favorieten' : 'Markeer als favoriet'}
                      >
                        <Star className={`h-4 w-4 ${fav ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(event) => { event.stopPropagation(); toggleMostUsed(t.id); }}
                        title={used ? 'Verwijder uit meest gebruikt' : 'Markeer als meest gebruikt'}
                      >
                        <Pin className={`h-4 w-4 ${used ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant={copiedId === t.id ? 'default' : 'outline'}
                        onClick={(event) => { event.stopPropagation(); handleCopy(t.id, t.content); }}
                      >
                        {copiedId === t.id ? (
                          <><Check className="h-4 w-4 mr-1" /> Gekopieerd</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-1" /> Kopieer</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                  <CardContent className="border-t p-0">
                    <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap px-4 py-3 font-sans text-sm leading-relaxed text-foreground/80">
                      {t.content}
                    </pre>
                  </CardContent>
                  </CollapsibleContent>
                </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
