import { useState, useRef } from 'react';
import mammoth from 'mammoth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDischargeTemplates } from '@/hooks/useDischargeTemplates';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function DischargeTemplatesUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ count: number; disciplines: string[] } | null>(null);
  const { data } = useDischargeTemplates();
  const queryClient = useQueryClient();

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Alleen .docx bestanden worden ondersteund');
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: text } = await mammoth.extractRawText({ arrayBuffer });
      if (!text || text.length < 100) {
        toast.error('Document lijkt leeg of onleesbaar');
        setUploading(false);
        return;
      }

      const documentTitle = file.name.replace(/\.docx$/i, '');

      const { data: resp, error } = await supabase.functions.invoke('extract-discharge-templates', {
        body: { documentText: text, documentTitle },
      });

      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);

      setResult({ count: resp.count, disciplines: resp.disciplines });
      toast.success(`${resp.count} sjablonen geëxtraheerd uit ${resp.disciplines.length} disciplines`);
      queryClient.invalidateQueries({ queryKey: ['discharge-templates'] });
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || 'Upload mislukt');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Ontslagbrief-sjablonen
        </CardTitle>
        <CardDescription>
          Upload een .docx document met standaardteksten. De AI extraheert automatisch elk sjabloon
          per ziektebeeld. Een nieuwe upload vervangt de huidige versie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.document && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Actuele versie
            </div>
            <div className="mt-1 text-muted-foreground">
              <span className="font-medium text-foreground">{data.document.document_title}</span>
              <span className="mx-2">·</span>
              <span>Geüpload op {format(new Date(data.document.uploaded_at), 'dd/MM/yyyy HH:mm')}</span>
              <span className="mx-2">·</span>
              <span>{data.templates.length} sjablonen</span>
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Bezig met extraheren…' : 'Nieuwe versie uploaden'}
        </Button>

        {uploading && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Dit kan tot een minuut duren voor grote documenten.
          </p>
        )}

        {result && (
          <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-sm">
            <p className="font-medium text-green-900 dark:text-green-100">
              ✓ {result.count} sjablonen geëxtraheerd
            </p>
            <p className="text-xs text-green-800 dark:text-green-200 mt-1">
              Disciplines: {result.disciplines.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
