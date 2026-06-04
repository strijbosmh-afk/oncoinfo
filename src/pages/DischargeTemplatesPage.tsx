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
import { ArrowLeft, Copy, Check, FileText, Loader2, Star, Pin, Search, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DischargeTemplatesPage() {
  const { discipline } = useParams<{ discipline: string }>();
  const { permissions, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { data, isLoading } = useDischargeTemplates();
  const { isFavorite, toggleFavorite } = useTemplateFavorites();
  const { isMostUsed, toggleMostUsed } = useTemplateMostUsed();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const canView = isAdmin || isSuperAdmin || !!permissions?.is_physician;

  const decoded = decodeURIComponent(discipline || '');
  const items = useMemo(
    () => (data?.templates || []).filter(t => t.discipline === decoded),
    [data, decoded]
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
      <div className="container max-w-4xl py-8">
        <Link to="/home" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Terug
        </Link>

        {/* Header banner */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{decoded}</h1>
                {!isLoading && (
                  <Badge variant="secondary" className="rounded-full">
                    {items.length} {items.length === 1 ? 'sjabloon' : 'sjablonen'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Standaardteksten voor ontslagbrieven — klik op een sjabloon om te kopiëren.
              </p>
              {data?.document && (
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
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

        {/* Search */}
        {!isLoading && items.length > 0 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Zoek in sjablonen..."
              className="pl-9"
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
          <div className="space-y-4">
            {filtered.map(t => {
              const fav = isFavorite(t.id);
              const used = isMostUsed(t.id);
              return (
                <Card
                  key={t.id}
                  className="group overflow-hidden border-l-4 border-l-primary/40 transition-all hover:border-l-primary hover:shadow-md"
                >
                  <div className="flex flex-row items-start justify-between gap-3 px-5 pt-4 pb-3 border-b bg-muted/30">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </span>
                      <h3 className="text-base font-semibold leading-snug pt-0.5">{t.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => toggleFavorite(t.id)}
                        title={fav ? 'Verwijder uit favorieten' : 'Markeer als favoriet'}
                      >
                        <Star className={`h-4 w-4 ${fav ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => toggleMostUsed(t.id)}
                        title={used ? 'Verwijder uit meest gebruikt' : 'Markeer als meest gebruikt'}
                      >
                        <Pin className={`h-4 w-4 ${used ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant={copiedId === t.id ? 'default' : 'outline'}
                        onClick={() => handleCopy(t.id, t.content)}
                      >
                        {copiedId === t.id ? (
                          <><Check className="h-4 w-4 mr-1" /> Gekopieerd</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-1" /> Kopieer</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/80 px-5 py-4 max-h-72 overflow-auto">
                      {t.content}
                    </pre>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
