import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, LogIn, Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useState } from 'react';

interface AuditEntry {
  id: string;
  user_id: string;
  username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4" />,
  create: <Plus className="h-4 w-4" />,
  update: <Pencil className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  login: 'Ingelogd',
  create: 'Aangemaakt',
  update: 'Bijgewerkt',
  delete: 'Verwijderd',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function AuditLog() {
  const [filterAction, setFilterAction] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-log', filterAction],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditEntry[];
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDetails = (entry: AuditEntry) => {
    if (!entry.details || Object.keys(entry.details).length === 0) return null;
    if (entry.action === 'login') return null;

    const details = entry.details;
    const changes: string[] = [];

    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'object' && value !== null && 'old' in value && 'new' in value) {
        changes.push(`${key}: "${value.old}" → "${value.new}"`);
      } else if (typeof value === 'string') {
        changes.push(`${key}: ${value}`);
      } else if (key === 'drug_class') {
        changes.push(`Klasse: ${value}`);
      } else if (key === 'disease_areas' && Array.isArray(value)) {
        changes.push(`Gebieden: ${value.join(', ')}`);
      }
    }

    if (changes.length === 0) return null;
    return (
      <p className="text-xs text-muted-foreground mt-1">
        {changes.join(' · ')}
      </p>
    );
  };

  const exportCsv = () => {
    if (!logs || logs.length === 0) return;
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ['Datum', 'Gebruiker', 'Actie', 'Type', 'Naam', 'Details'];
    const rows = logs.map((e) => {
      const detailStr = e.details ? JSON.stringify(e.details) : '';
      const entityLabel = e.entity_type === 'drug' ? 'Medicijn' : e.entity_type === 'patient_folder' ? 'Patiëntenfolder' : e.entity_type === 'trial' ? 'Studie' : e.entity_type === 'session' ? 'Login' : (e.entity_type || '');
      return [
        formatDate(e.created_at),
        e.username || 'Onbekend',
        ACTION_LABELS[e.action] || e.action,
        entityLabel,
        e.entity_name || '',
        detailStr,
      ].map(escape).join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activiteitenlog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Activiteitenlog</CardTitle>
            <CardDescription>Overzicht van logins, wijzigingen en toevoegingen</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Alle activiteiten</SelectItem>
                <SelectItem value="login">Logins</SelectItem>
                <SelectItem value="create">Aangemaakt</SelectItem>
                <SelectItem value="update">Bijgewerkt</SelectItem>
                <SelectItem value="delete">Verwijderd</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={exportCsv}
              disabled={!logs || logs.length === 0}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !logs || logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nog geen activiteiten gelogd. Activiteiten worden vanaf nu bijgehouden.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {logs.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {ACTION_ICONS[entry.action] || <Pencil className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{entry.username || 'Onbekend'}</span>
                    <Badge variant="outline" className={`text-xs ${ACTION_COLORS[entry.action] || ''}`}>
                      {ACTION_LABELS[entry.action] || entry.action}
                    </Badge>
                    {entry.entity_type && entry.entity_type !== 'session' && (
                      <span className="text-xs text-muted-foreground">
                        {entry.entity_type === 'drug' ? 'Medicijn' : entry.entity_type === 'patient_folder' ? 'Patiëntenfolder' : entry.entity_type === 'trial' ? 'Studie' : entry.entity_type}
                        {entry.entity_name && `: ${entry.entity_name}`}
                      </span>
                    )}
                  </div>
                  {renderDetails(entry)}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                  {formatDate(entry.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
