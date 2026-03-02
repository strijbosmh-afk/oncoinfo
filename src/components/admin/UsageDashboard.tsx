import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Activity, Users, BarChart3, TrendingUp, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { nl, fr, de, enUS } from 'date-fns/locale';

type AuditRow = {
  id: string;
  action: string;
  entity_type: string | null;
  username: string | null;
  created_at: string;
  hospital_id: string | null;
};

type ProfileRow = {
  username: string | null;
  discipline: string | null;
  function: string | null;
  hospital_id: string | null;
};

type HospitalRow = {
  id: string;
  name: string;
};

const COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(199, 89%, 48%)',
  'hsl(25, 95%, 53%)', 'hsl(330, 81%, 60%)',
];

const ACTION_LABEL_KEYS: Record<string, string> = {
  login: 'usageDashboard.actionLogin',
  update: 'usageDashboard.actionUpdate',
  create: 'usageDashboard.actionCreate',
  delete: 'usageDashboard.actionDelete',
  email_sent: 'usageDashboard.actionEmailSent',
  auto_update_scan: 'usageDashboard.actionAutoUpdateScan',
  print_folder: 'usageDashboard.actionPrintFolder',
};

export function UsageDashboard() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [period, setPeriod] = useState('30');
  const [hospitalFilter, setHospitalFilter] = useState('all');

  const dateFnsLocale = useMemo(() => {
    const map: Record<string, typeof nl> = { nl, fr, de, en: enUS };
    return map[i18n.language] || nl;
  }, [i18n.language]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const since = subDays(new Date(), parseInt(period)).toISOString();

      const [auditRes, profileRes, hospitalRes] = await Promise.all([
        supabase.from('audit_log').select('id, action, entity_type, username, created_at, hospital_id')
          .gte('created_at', since).order('created_at', { ascending: true }),
        supabase.from('profiles').select('username, discipline, function, hospital_id'),
        supabase.from('hospitals').select('id, name'),
      ]);

      setAuditData((auditRes.data as AuditRow[]) || []);
      setProfiles((profileRes.data as ProfileRow[]) || []);
      setHospitals((hospitalRes.data as HospitalRow[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach(p => { if (p.username) map.set(p.username, p); });
    return map;
  }, [profiles]);

  const hospitalMap = useMemo(() => {
    const map = new Map<string, string>();
    hospitals.forEach(h => map.set(h.id, h.name));
    return map;
  }, [hospitals]);

  const filtered = useMemo(() => {
    if (hospitalFilter === 'all') return auditData;
    return auditData.filter(row => {
      const profile = row.username ? profileMap.get(row.username) : null;
      const hid = row.hospital_id || profile?.hospital_id;
      return hid === hospitalFilter;
    });
  }, [auditData, hospitalFilter, profileMap]);

  // --- Chart data ---
  const timeData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), parseInt(period)),
      end: new Date(),
    });
    const countMap = new Map<string, number>();
    days.forEach(d => countMap.set(format(d, 'yyyy-MM-dd'), 0));
    filtered.forEach(row => {
      const day = format(parseISO(row.created_at), 'yyyy-MM-dd');
      countMap.set(day, (countMap.get(day) || 0) + 1);
    });
    return days.map(d => {
      const key = format(d, 'yyyy-MM-dd');
      return { date: format(d, 'dd MMM', { locale: dateFnsLocale }), count: countMap.get(key) || 0 };
    });
  }, [filtered, period, dateFnsLocale]);

  const actionData = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach(row => {
      const key = row.action;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([action, count]) => ({ action: t(ACTION_LABEL_KEYS[action] || action, action), count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const disciplineData = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach(row => {
      const profile = row.username ? profileMap.get(row.username) : null;
      const disc = profile?.discipline || t('dashboard.unknown', 'Onbekend');
      counts.set(disc, (counts.get(disc) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, profileMap, t]);

  const functionData = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach(row => {
      const profile = row.username ? profileMap.get(row.username) : null;
      const fn = profile?.function || t('dashboard.unknown', 'Onbekend');
      counts.set(fn, (counts.get(fn) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, profileMap, t]);

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach(row => { if (row.username) set.add(row.username); });
    return set.size;
  }, [filtered]);

  const totalLogins = useMemo(() => filtered.filter(r => r.action === 'login').length, [filtered]);
  const totalPrintedFolders = useMemo(() => filtered.filter(r => r.action === 'print_folder').length, [filtered]);

  // --- Export ---
  const exportCSV = () => {
    const header = ['Datum', 'Gebruiker', 'Actie', 'Type', 'Discipline', 'Functie', 'Ziekenhuis'];
    const rows = filtered.map(row => {
      const profile = row.username ? profileMap.get(row.username) : null;
      const hid = row.hospital_id || profile?.hospital_id;
      return [
        format(parseISO(row.created_at), 'yyyy-MM-dd HH:mm'),
        row.username || '',
        t(ACTION_LABEL_KEYS[row.action] || row.action, row.action),
        row.entity_type || '',
        profile?.discipline || '',
        profile?.function || '',
        hid ? (hospitalMap.get(hid) || '') : '',
      ].join(';');
    });
    const csv = [header.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-gebruik-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters & Export */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="7">{t('dashboard.last7days', 'Laatste 7 dagen')}</SelectItem>
            <SelectItem value="30">{t('dashboard.last30days', 'Laatste 30 dagen')}</SelectItem>
            <SelectItem value="90">{t('dashboard.last90days', 'Laatste 90 dagen')}</SelectItem>
            <SelectItem value="365">{t('dashboard.lastYear', 'Laatste jaar')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t('dashboard.allHospitals', 'Alle ziekenhuizen')} />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">{t('dashboard.allHospitals', 'Alle ziekenhuizen')}</SelectItem>
            {hospitals.map(h => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV} className="gap-2 ml-auto">
          <Download className="h-4 w-4" />
          {t('dashboard.exportCSV', 'Exporteer CSV')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalActions', 'Totaal acties')}</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/15 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.uniqueUsers', 'Unieke gebruikers')}</p>
                <p className="text-2xl font-bold">{uniqueUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/15 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.logins', 'Logins')}</p>
                <p className="text-2xl font-bold">{totalLogins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/15 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.printedFolders', 'Afgedrukte folders')}</p>
                <p className="text-2xl font-bold">{totalPrintedFolders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.avgPerDay', 'Gem. per dag')}</p>
                <p className="text-2xl font-bold">
                  {parseInt(period) > 0 ? Math.round(filtered.length / parseInt(period)) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage over time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.usageOverTime', 'Gebruik over tijd')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={false} name={t('dashboard.actions', 'Acties')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Action type + Discipline side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per action type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.perAction', 'Per actie')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="action" type="category" tick={{ fontSize: 12 }} width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} name={t('dashboard.count', 'Aantal')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Per discipline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.perDiscipline', 'Per discipline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={disciplineData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                    fontSize={11}
                  >
                    {disciplineData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per function (role) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.perFunction', 'Per functie')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={functionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name={t('dashboard.count', 'Aantal')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
