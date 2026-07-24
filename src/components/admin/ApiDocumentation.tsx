import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Eye, EyeOff, Globe, Lock, Search, FileText } from 'lucide-react';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

const endpoints = [
  {
    method: 'GET',
    path: '/drugs',
    description: 'Lijst van alle platform-medicijnen (niet-gearchiveerd)',
    params: [
      { name: 'q', type: 'string', desc: 'Zoek op naam of klasse' },
      { name: 'disease_area', type: 'string', desc: 'Filter op ziektegebied' },
      { name: 'drug_class', type: 'string', desc: 'Filter op medicijnklasse' },
      { name: 'limit', type: 'number', desc: 'Max resultaten (standaard 100, max 500)' },
      { name: 'offset', type: 'number', desc: 'Paginatie offset' },
    ],
  },
  {
    method: 'GET',
    path: '/drugs/:id',
    description: 'Volledige details van één medicijn op UUID',
    params: [],
  },
  {
    method: 'GET',
    path: '/drugs/:id/leaflet',
    description: 'Patiëntenfolder-inhoud voor een medicijn',
    params: [],
  },
  {
    method: 'GET',
    path: '/search?q=...',
    description: 'Zoek medicijnen op naam of klasse',
    params: [{ name: 'q', type: 'string', desc: 'Zoekopdracht (verplicht)' }],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function ApiDocumentation() {
  const [showKey, setShowKey] = useState(false);
  const maskedKey = '••••••••••••••••••••••••••••••••';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">OncoInfo REST API</CardTitle>
              <CardDescription>Integratie met externe AI-assistenten zoals OpenClaw</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Base URL</p>
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 font-mono text-sm">
              <span className="flex-1 truncate">{API_BASE}</span>
              <CopyButton text={API_BASE} />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">API Key</p>
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 font-mono text-sm">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">
                {showKey ? 'Configureer via Supabase Edge Function Secrets (ONCOINFO_API_KEY)' : maskedKey}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Stuur de API-key mee als <code className="bg-muted px-1 rounded">X-API-Key</code> header bij elk verzoek.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4" />
            Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {endpoints.map((ep) => (
            <div key={ep.path} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                  {ep.method}
                </Badge>
                <code className="text-sm font-mono">/public-api{ep.path}</code>
              </div>
              <p className="text-sm text-muted-foreground">{ep.description}</p>
              {ep.params.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Parameters:</p>
                  <div className="grid gap-1">
                    {ep.params.map((p) => (
                      <div key={p.name} className="flex items-baseline gap-2 text-xs">
                        <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{p.name}</code>
                        <span className="text-muted-foreground">({p.type})</span>
                        <span className="text-muted-foreground">— {p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Usage Example */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Voorbeeld (cURL)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted rounded-lg p-4">
            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{`curl -H "X-API-Key: YOUR_API_KEY" \\
  "${API_BASE}/drugs?q=pembrolizumab&limit=10"`}</pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={`curl -H "X-API-Key: YOUR_API_KEY" "${API_BASE}/drugs?q=pembrolizumab&limit=10"`} />
            </div>
          </div>

          <div className="mt-4 p-4 border rounded-lg bg-card">
            <p className="text-sm font-medium mb-2">OpenClaw Integratie</p>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Kopieer de Base URL en API Key hierboven</li>
              <li>Configureer een nieuwe "Custom API" tool in OpenClaw</li>
              <li>Stel de authenticatie in als <code className="bg-muted px-1 rounded">Header: X-API-Key</code></li>
              <li>Voeg de endpoints toe die de AI-assistent mag gebruiken</li>
              <li>De API retourneert gestructureerde JSON, optimaal voor LLM-verwerking</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
