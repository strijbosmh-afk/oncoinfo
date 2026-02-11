import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, CalendarClock, Trash2, Plus } from 'lucide-react';
import { DRUG_DISEASE_AREAS, DRUG_CATEGORIES } from '@/types/drug';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

// Map discipline to disease areas
const DISCIPLINE_MAP: Record<string, { label: string; areas: string[] }> = {
  all: { label: 'Alle disciplines', areas: [...DRUG_DISEASE_AREAS] },
  breast: { label: 'Borstkanker', areas: ['Borstkanker'] },
  urology: { label: 'Urologie', areas: ['Prostaatkanker', 'Blaaskanker', 'Niercelcarcinoom', 'Testiskanker', 'Peniskanker'] },
  gynecology: { label: 'Gynaecologie', areas: ['Ovariumcarcinoom', 'Endometriumcarcinoom', 'Cervixcarcinoom', 'Vulvacarcinoom'] },
  respiratory: { label: 'Respiratoire', areas: ['NSCLC', 'SCLC', 'Mesothelioom'] },
  supportive: { label: 'Supportive Care', areas: ['Supportive Care'] },
};

interface Schedule {
  id: string;
  schedule_interval: string;
  disease_areas: string[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  last_result: any;
  created_at: string;
}

const INTERVAL_LABELS: Record<string, string> = {
  weekly: 'Wekelijks',
  monthly: 'Maandelijks',
  quarterly: 'Per kwartaal',
};

function calculateNextRun(interval: string): string {
  const now = new Date();
  switch (interval) {
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      break;
  }
  return now.toISOString();
}

export function ScheduleAutoUpdate() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInterval, setNewInterval] = useState<string>('monthly');
  const [newDiscipline, setNewDiscipline] = useState<string>('all');
  const [newAreas, setNewAreas] = useState<string[]>([...DRUG_DISEASE_AREAS]);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const fetchSchedules = async () => {
    const { data, error } = await (supabase as any)
      .from('scheduled_auto_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schedules:', error);
    } else {
      setSchedules(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');

      const { error } = await (supabase as any)
        .from('scheduled_auto_updates')
        .insert({
          created_by: user.id,
          schedule_interval: newInterval,
          disease_areas: newAreas,
          is_active: true,
          next_run_at: calculateNextRun(newInterval),
        });

      if (error) throw error;

      toast({ title: 'Schema aangemaakt', description: `Auto-update ${INTERVAL_LABELS[newInterval]} ingepland.` });
      setShowForm(false);
      setNewAreas([]);
      setNewInterval('monthly');
      fetchSchedules();
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const updateData: any = { is_active: !isActive };
    if (!isActive) {
      const schedule = schedules.find(s => s.id === id);
      if (schedule) {
        updateData.next_run_at = calculateNextRun(schedule.schedule_interval);
      }
    }

    const { error } = await (supabase as any)
      .from('scheduled_auto_updates')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      fetchSchedules();
    }
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await (supabase as any)
      .from('scheduled_auto_updates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Verwijderd', description: 'Schema verwijderd.' });
      fetchSchedules();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Geplande Auto-Updates
            </CardTitle>
            <CardDescription>
              Plan verplichte automatische database-updates op vaste intervallen
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-primary border-primary/40 bg-primary/5 text-[10px] px-1.5 py-0">
            SUPER ADMIN
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing schedules */}
        {schedules.length > 0 && (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-sm">{INTERVAL_LABELS[schedule.schedule_interval]}</span>
                      {schedule.disease_areas.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {schedule.disease_areas.join(', ')}
                        </p>
                      )}
                      {schedule.disease_areas.length === 0 && (
                        <p className="text-xs text-muted-foreground">Alle ziektegebieden</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={() => toggleActive(schedule.id, schedule.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteSchedule(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  {schedule.next_run_at && schedule.is_active && (
                    <span>Volgende run: {format(new Date(schedule.next_run_at), 'dd MMM yyyy HH:mm', { locale: nl })}</span>
                  )}
                  {schedule.last_run_at && (
                    <span>Laatste run: {format(new Date(schedule.last_run_at), 'dd MMM yyyy HH:mm', { locale: nl })}</span>
                  )}
                  <span>Runs: {schedule.run_count}</span>
                </div>

                {schedule.last_result && (
                  <div className="text-xs bg-muted/50 rounded p-2">
                    {schedule.last_result.added?.length > 0 && (
                      <span className="text-green-600">{schedule.last_result.added.length} toegevoegd</span>
                    )}
                    {schedule.last_result.skipped?.length > 0 && (
                      <span className="text-muted-foreground ml-2">{schedule.last_result.skipped.length} overgeslagen</span>
                    )}
                    {schedule.last_result.errors?.length > 0 && (
                      <span className="text-destructive ml-2">{schedule.last_result.errors.length} fouten</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {schedules.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">Nog geen geplande updates ingesteld.</p>
        )}

        {/* New schedule form */}
        {showForm ? (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Interval</Label>
                <Select value={newInterval} onValueChange={setNewInterval}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="weekly">Wekelijks</SelectItem>
                    <SelectItem value="monthly">Maandelijks</SelectItem>
                    <SelectItem value="quarterly">Per kwartaal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Discipline</Label>
                <Select
                  value={newDiscipline}
                  onValueChange={(val) => {
                    setNewDiscipline(val);
                    const disc = DISCIPLINE_MAP[val];
                    if (disc) setNewAreas(disc.areas);
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {Object.entries(DISCIPLINE_MAP).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Geselecteerde ziektegebieden</Label>
              <div className="flex flex-wrap gap-2">
                {DRUG_DISEASE_AREAS.map((area) => (
                  <Button
                    key={area}
                    variant={newAreas.includes(area) ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      setNewAreas((prev) =>
                        prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
                      )
                    }
                  >
                    {area}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{newAreas.length} van {DRUG_DISEASE_AREAS.length} geselecteerd</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving || newAreas.length === 0} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Schema aanmaken
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setNewDiscipline('all'); setNewAreas([...DRUG_DISEASE_AREAS]); }}>
                Annuleren
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuw schema toevoegen
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
