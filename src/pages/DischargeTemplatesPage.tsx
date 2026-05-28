import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useDischargeTemplates } from '@/hooks/useDischargeTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Copy, Check, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DischargeTemplatesPage() {
  const { discipline } = useParams<{ discipline: string }>();
  const { permissions, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { data, isLoading } = useDischargeTemplates();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canView = isAdmin || isSuperAdmin || !!permissions?.is_physician;

  const decoded = decodeURIComponent(discipline || '');
  const items = useMemo(
    () => (data?.templates || []).filter(t => t.discipline === decoded),
    [data, decoded]
  );

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
        <Link to="/home" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Terug
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{decoded}</h1>
          <p className="text-sm text-muted-foreground">
            Standaardteksten voor ontslagbrieven — klik op een sjabloon om te kopiëren.
          </p>
          {data?.document && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
              <FileText className="h-3.5 w-3.5" />
              <span className="font-medium">{data.document.document_title}</span>
              <span>·</span>
              <span>Laatst bijgewerkt {format(new Date(data.document.uploaded_at), 'dd/MM/yyyy')}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            Geen sjablonen beschikbaar voor deze discipline.
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {items.map(t => (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <CardTitle className="text-base leading-snug">{t.title}</CardTitle>
                  <Button
                    size="sm"
                    variant={copiedId === t.id ? 'default' : 'outline'}
                    onClick={() => handleCopy(t.id, t.content)}
                    className="shrink-0"
                  >
                    {copiedId === t.id ? (
                      <><Check className="h-4 w-4 mr-1" /> Gekopieerd</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-1" /> Kopieer</>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                    {t.content}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
