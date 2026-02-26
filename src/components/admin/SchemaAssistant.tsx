import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Loader2, Save, RotateCcw, PenLine, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import type { Drug } from '@/types/drug';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schema-assistant`;

interface SchemaAssistantProps {
  existingDrugs?: Drug[];
}

export function SchemaAssistant({ existingDrugs = [] }: SchemaAssistantProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editDrugId, setEditDrugId] = useState<string>('');
  const [mode, setMode] = useState<'idle' | 'new' | 'edit'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      toast.error('Je bent niet ingelogd');
      return;
    }

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Onbekende fout' }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantSoFar = '';

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) upsertAssistant(content);
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) upsertAssistant(content);
        } catch { /* ignore */ }
      }
    }
  }, []);

  const send = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Msg = { role: 'user', content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Check if user wants to save
    const lowerMsg = messageText.toLowerCase();
    if (lowerMsg === 'opslaan' || lowerMsg === 'bewaren' || lowerMsg === 'save') {
      await handleSave(newMessages);
      setIsLoading(false);
      return;
    }

    try {
      await streamChat(newMessages);
    } catch (e: any) {
      console.error('Chat error:', e);
      toast.error(e.message || 'Chat fout');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSave = async (allMessages: Msg[]) => {
    setIsSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Niet ingelogd');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages, action: 'save' }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Opslaan mislukt');
      }

      const actionText = data.action === 'updated' ? 'bijgewerkt' : 'aangemaakt';
      const drugName = data.drug?.generic_name || 'Schema';
      toast.success(`${drugName} succesvol ${actionText}!`);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **${drugName}** is succesvol ${actionText} in de database!\n\nJe kunt nu een nieuw schema aanmaken of dit gesprek sluiten.`
      }]);

      queryClient.invalidateQueries({ queryKey: ['drugs'] });
    } catch (e: any) {
      toast.error(e.message || 'Opslaan mislukt');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Opslaan mislukt: ${e.message}. Probeer het opnieuw.`
      }]);
    } finally {
      setIsSaving(false);
    }
  };

  const startNew = () => {
    setMode('new');
    setMessages([]);
    setEditDrugId('');
    send('Ik wil een nieuw behandelschema aanmaken.');
  };

  const startEdit = async () => {
    if (!editDrugId) {
      toast.error('Selecteer een medicijn om te bewerken');
      return;
    }
    setMode('edit');
    setMessages([]);

    setIsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Niet ingelogd');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: 'load', drug_id: editDrugId }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Laden mislukt');

      const drug = data.drug;
      const drugSummary = `Ik wil het volgende bestaande behandelschema bewerken (ID: ${drug.id}):
- Naam: ${drug.generic_name}
- Klasse: ${drug.drug_class}
- Ziektegebied: ${(drug.disease_areas || []).join(', ')}
- Merknamen: ${(drug.brand_names || []).join(', ')}
- Toedieningsweg: ${drug.administration_route || 'Niet ingevuld'}
- Dosering: ${drug.dosing_info?.standard_dose || 'Niet ingevuld'}
- Frequentie: ${drug.dosing_info?.frequency || 'Niet ingevuld'}
- Cyclusduur: ${drug.cycle_length_days ? drug.cycle_length_days + ' dagen' : 'Niet ingevuld'}
- ZVZ: ${drug.is_on_zvz ? 'Ja' : 'Nee'}
- Registratiestudie: ${drug.registration_trial || 'Niet ingevuld'}

Wat wil ik aanpassen?`;

      const editMessages: Msg[] = [{ role: 'user', content: drugSummary }];
      setMessages(editMessages);
      await streamChat(editMessages);
    } catch (e: any) {
      toast.error(e.message || 'Laden mislukt');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMode('idle');
    setMessages([]);
    setInput('');
    setEditDrugId('');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Schema Assistent</CardTitle>
              <CardDescription className="text-xs">AI-gestuurde schema's aanmaken en bewerken</CardDescription>
            </div>
          </div>
          {mode !== 'idle' && (
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Opnieuw
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'idle' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={startNew} className="gap-2 h-auto py-4 flex-col" variant="outline">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-medium">Nieuw schema</span>
                <span className="text-xs text-muted-foreground">Maak een nieuw behandelschema aan</span>
              </Button>
              <div className="space-y-2">
                <Select value={editDrugId} onValueChange={setEditDrugId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecteer medicijn..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-64">
                    {existingDrugs.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.generic_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={startEdit}
                  disabled={!editDrugId}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <PenLine className="h-4 w-4" />
                  Schema bewerken
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode !== 'idle' && (
          <>
            <ScrollArea className="h-[400px] pr-3" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Typ je antwoord..."
                disabled={isLoading || isSaving}
                className="flex-1"
              />
              <Button
                onClick={() => send()}
                disabled={!input.trim() || isLoading || isSaving}
                size="icon"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {messages.length > 4 && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => send('Opslaan')}
                  disabled={isLoading || isSaving}
                  className="gap-2"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? 'Bezig met opslaan...' : 'Schema opslaan'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
