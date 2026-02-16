import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, LogIn, Plus, Pencil, Trash2, Download, CalendarIcon, Search, ChevronLeft, ChevronRight, Mail, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  email_sent: <Mail className="h-4 w-4" />,
  password_reset: <KeyRound className="h-4 w-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  login: 'Ingelogd',
  create: 'Aangemaakt',
  update: 'Bijgewerkt',
  delete: 'Verwijderd',
  email_sent: 'E-mail verstuurd',
  password_reset: 'Wachtwoord reset',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  email_sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  password_reset: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function AuditLog() {
  const { t } = useTranslation();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-log', filterAction, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }
      if (dateFrom) {
        query = query.gte('created_at', startOfDay(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', endOfDay(dateTo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditEntry[];
    },
  });

  const filteredLogs = useMemo(() => {
    if (!logs || !searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(entry =>
      (entry.username?.toLowerCase().includes(q)) ||
      (entry.entity_name?.toLowerCase().includes(q)) ||
      (entry.action.toLowerCase().includes(q)) ||
      (entry.entity_type?.toLowerCase().includes(q)) ||
      (entry.details && JSON.stringify(entry.details).toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  const totalItems = filteredLogs?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    if (!filteredLogs) return [];
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, safePage]);

  // Reset page when filters change
  const handleSearchChange = (val: string) => { setSearchQuery(val); setCurrentPage(1); };
  const handleFilterChange = (val: string) => { setFilterAction(val); setCurrentPage(1); };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const FIELD_LABELS: Record<string, string> = {
    generic_name: 'Naam',
    drug_class: 'Klasse',
    disease_areas: 'Ziektegebieden',
    approved_indications: 'Indicaties',
    side_effects: 'Bijwerkingen',
    dosing_info: 'Dosering',
    is_on_zvz: 'RIZIV-status',
    mechanism_of_action: 'Werkingsmechanisme',
    administration_route: 'Toedieningsweg',
    contraindications: 'Contra-indicaties',
    monitoring_requirements: 'Monitoring',
    unit_price: 'Eenheidsprijs',
    brand_names: 'Merknamen',
    common_regimens: 'Behandelschema\'s',
    reference_links: 'Referenties',
    type: 'Type',
  };

  const formatValue = (key: string, value: any): string => {
    if (key === 'is_on_zvz') return value ? 'Ja' : 'Nee';
    if (key === 'unit_price') return value != null ? `€${value}` : '–';
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '–';
    return String(value);
  };

  const renderDetails = (entry: AuditEntry) => {
    if (!entry.details || Object.keys(entry.details).length === 0) return null;
    if (entry.action === 'login') return null;

    const details = entry.details;
    const changes: string[] = [];

    for (const [key, value] of Object.entries(details)) {
      const label = FIELD_LABELS[key] || key;
      if (typeof value === 'object' && value !== null && 'old' in value && 'new' in value) {
        changes.push(`${label}: ${formatValue(key, value.old)} → ${formatValue(key, value.new)}`);
      } else if (typeof value === 'string' && value === 'gewijzigd') {
        changes.push(`${label} gewijzigd`);
      } else if (typeof value === 'string') {
        changes.push(`${label}: ${value}`);
      } else if (Array.isArray(value)) {
        changes.push(`${label}: ${value.join(', ')}`);
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
    const header = [t('auditLog.csvDate'), t('auditLog.csvUser'), t('auditLog.csvAction'), t('auditLog.csvType'), t('auditLog.csvName'), t('auditLog.csvDetails')];
    const entityLabel = (type: string | null) =>
      type === 'drug' ? t('auditLog.drug') : type === 'patient_folder' ? t('auditLog.patientFolder') : type === 'trial' ? t('auditLog.trial') : type === 'session' ? t('auditLog.login') : (type || '');
    const actionLabel = (action: string) =>
      action === 'login' ? t('auditLog.login') : action === 'create' ? t('auditLog.created') : action === 'update' ? t('auditLog.updated') : action === 'delete' ? t('auditLog.deleted') : action;
    const rows = logs.map((e) => {
      const detailStr = e.details ? JSON.stringify(e.details) : '';
      return [
        formatDate(e.created_at),
        e.username || t('auditLog.unknown'),
        actionLabel(e.action),
        entityLabel(e.entity_type),
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
            <CardTitle>{t('auditLog.title')}</CardTitle>
            <CardDescription>{t('auditLog.description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('auditLog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : t('auditLog.from')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus locale={nl} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy') : t('auditLog.to')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus locale={nl} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setCurrentPage(1); }}>
                Reset
              </Button>
            )}
            <Select value={filterAction} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
                 <SelectContent className="bg-popover">
                    <SelectItem value="all">{t('auditLog.allActivities')}</SelectItem>
                    <SelectItem value="login">{t('auditLog.logins')}</SelectItem>
                    <SelectItem value="create">{t('auditLog.created')}</SelectItem>
                    <SelectItem value="update">{t('auditLog.updated')}</SelectItem>
                    <SelectItem value="delete">{t('auditLog.deleted')}</SelectItem>
                    <SelectItem value="email_sent">E-mail verstuurd</SelectItem>
                    <SelectItem value="password_reset">Wachtwoord reset</SelectItem>
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
        ) : !filteredLogs || filteredLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {searchQuery ? t('auditLog.noResults') : t('auditLog.noActivity')}
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {paginatedLogs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {ACTION_ICONS[entry.action] || <Pencil className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{entry.username || t('auditLog.unknown')}</span>
                      <Badge variant="outline" className={`text-xs ${ACTION_COLORS[entry.action] || ''}`}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </Badge>
                      {entry.entity_type && entry.entity_type !== 'session' && (
                        <span className="text-xs text-muted-foreground">
                          {entry.entity_type === 'drug' ? t('auditLog.drug') : entry.entity_type === 'patient_folder' ? t('auditLog.patientFolder') : entry.entity_type === 'trial' ? t('auditLog.trial') : entry.entity_type}
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

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  {totalItems} {t('auditLog.results')} · {t('auditLog.page')} {safePage} {t('auditLog.of')} {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (safePage <= 3) {
                      page = i + 1;
                    } else if (safePage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = safePage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={page === safePage ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
