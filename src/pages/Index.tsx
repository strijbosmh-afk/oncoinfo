import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { Heart, Stethoscope, Baby, MoreHorizontal, UtensilsCrossed, Wind, Palette, Ear, Search, Layers, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDrugs } from '@/hooks/useDrugs';
import { useTranslation } from 'react-i18next';
import { useHospital } from '@/contexts/HospitalContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSpecialtyOrder } from '@/hooks/useSpecialtyOrder';
import { useNewDrugsNotification } from '@/hooks/useNewDrugsNotification';
import { NewDrugsDialog } from '@/components/home/NewDrugsDialog';
import { SortableSpecialtyCard } from '@/components/home/SortableSpecialtyCard';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { DischargeTemplatesAnnouncement } from '@/components/home/DischargeTemplatesAnnouncement';

const CATEGORY_DISCIPLINE_MAP: Record<string, string[]> = {
  breast: ['Borstkanker'],
  urology: ['Prostaatkanker', 'Blaaskanker', 'Niercelcarcinoom', 'Testiskanker', 'Peniskanker'],
  gynecology: ['Ovariumkanker', 'Endometriumkanker', 'Cervixkanker', 'Vulvakanker'],
  respiratory: ['NSCLC', 'SCLC', 'Mesothelioom'],
  digestive: ['Colorectaal carcinoom', 'Maagcarcinoom', 'Oesofaguscarcinoom', 'Pancreascarcinoom', 'Hepatocellulair carcinoom', 'Galwegcarcinoom'],
  skin: ['Melanoom', 'Merkelcelcarcinoom', 'Cutaan plaveiselcelcarcinoom'],
  head_neck: ['Hoofd-halscarcinoom', 'Nasofarynxcarcinoom', 'Speekselkliercarcinoom'],
  other: ['Supportive Care', 'Anti-emetica', 'Groeifactoren', 'Erytropoietines', 'Trombopoietine-agonisten', 'Antiresorptiva'],
};

const LIBRARY_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  breast: { icon: Heart, color: 'text-primary', bgColor: 'bg-primary/10' },
  urology: { icon: Stethoscope, color: 'text-primary', bgColor: 'bg-primary/10' },
  gynecology: { icon: Baby, color: 'text-primary', bgColor: 'bg-primary/10' },
  respiratory: { icon: Wind, color: 'text-primary', bgColor: 'bg-primary/10' },
  digestive: { icon: UtensilsCrossed, color: 'text-primary', bgColor: 'bg-primary/10' },
  skin: { icon: Palette, color: 'text-primary', bgColor: 'bg-primary/10' },
  head_neck: { icon: Ear, color: 'text-primary', bgColor: 'bg-primary/10' },
  other: { icon: MoreHorizontal, color: 'text-primary', bgColor: 'bg-primary/10' },
};

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { data: searchResults } = useDrugs(searchQuery.length >= 2 ? { search: searchQuery } : undefined);
  const searchRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { hospital } = useHospital();
  const { user } = useAuth();
  const { newDrugs, showPopup, dismissPopup } = useNewDrugsNotification(user?.id);
  const [disciplines, setDisciplines] = useState<{ disease_area: string; is_enabled: boolean }[] | null>(null);
  const { order: specialtyOrder, saveOrder, loaded: orderLoaded } = useSpecialtyOrder();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    if (!hospital?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('hospital_disciplines')
        .select('disease_area, is_enabled')
        .eq('hospital_id', hospital.id);
      setDisciplines(data || []);
    };
    fetch();
  }, [hospital?.id]);

  // Close search results on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const disabledCategories = useMemo(() => {
    if (!disciplines || disciplines.length === 0) return new Set<string>();
    const enabledAreas = new Set(disciplines.filter(d => d.is_enabled).map(d => d.disease_area));
    const disabled = new Set<string>();
    for (const [category, areas] of Object.entries(CATEGORY_DISCIPLINE_MAP)) {
      if (!areas.some(area => enabledAreas.has(area))) disabled.add(category);
    }
    return disabled;
  }, [disciplines]);

  const sortedLibraries = useMemo(() => {
    return specialtyOrder.map(key => {
      const config = LIBRARY_CONFIG[key];
      if (!config) return null;
      return {
        key,
        title: t(`home.${key === 'head_neck' ? 'headNeck' : key}`),
        description: t(`home.${key === 'head_neck' ? 'headNeck' : key}Desc`),
        icon: config.icon,
        href: `/drugs?category=${key}`,
        color: config.color,
        bgColor: config.bgColor,
      };
    }).filter(Boolean) as Array<{ key: string; title: string; description: string; icon: LucideIcon; href: string; color: string; bgColor: string }>;
  }, [specialtyOrder, t]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = specialtyOrder.indexOf(active.id as string);
    const newIndex = specialtyOrder.indexOf(over.id as string);
    const newOrder = [...specialtyOrder];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as string);
    saveOrder(newOrder);
  }, [specialtyOrder, saveOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/drugs?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleResultClick = (drugId: string) => {
    navigate(`/drugs/${drugId}`);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleDisabledCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.info(t('drugs.disciplineDisabled'), { duration: 3000 });
  };

  return (
    <Layout>
      <NewDrugsDialog open={showPopup} onClose={dismissPopup} drugs={newDrugs} />
      <DischargeTemplatesAnnouncement />
      <section className="flex-1 py-6 md:py-10">
        <div className="container max-w-7xl">
          <div className="relative mb-4 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Chemotherapiesjablonen</h1>
                <p className="mt-1 text-sm text-muted-foreground">Selecteer een discipline of zoek een schema.</p>
              </div>
            </div>
          </div>
          <div className="mb-5 w-full" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="text" placeholder={t('home.searchPlaceholder')} value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                  onFocus={() => setShowResults(true)}
                  className="h-11 rounded-lg border bg-card pl-10 pr-4 text-sm shadow-sm focus-visible:border-primary" />
                {showResults && searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                    {searchResults.slice(0, 8).map((drug) => (
                      <button key={drug.id} type="button" onClick={() => handleResultClick(drug.id)} className="search-result flex w-full items-center justify-between border-b px-4 py-3 text-left last:border-b-0">
                        <div><p className="font-medium">{drug.generic_name}</p>{drug.brand_names && drug.brand_names.length > 0 && <p className="text-sm text-muted-foreground">{drug.brand_names.join(', ')}</p>}</div>
                        <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{drug.drug_class}</span>
                      </button>
                    ))}
                    {searchResults.length > 8 && <button type="submit" className="w-full px-4 py-3 text-center font-medium text-primary hover:bg-muted/50">{t('drugs.viewAllResults', { count: searchResults.length })} →</button>}
                  </div>
                )}
                {showResults && searchQuery.length >= 2 && searchResults && searchResults.length === 0 && <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border bg-popover p-4 text-center text-muted-foreground shadow-lg">{t('drugs.noResultsFor')} "{searchQuery}"</div>}
              </form>
          </div>

          {/* Specialty cards — browse by category */}
          <h2 className="text-xl font-bold mb-6">
            {t('home.chooseSpecialty')}
          </h2>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={specialtyOrder} strategy={rectSortingStrategy}>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {sortedLibraries.map((library) => (
                  <SortableSpecialtyCard
                    key={library.key}
                    id={library.key}
                    title={library.title}
                    description={library.description}
                    icon={library.icon}
                    href={library.href}
                    color={library.color}
                    bgColor={library.bgColor}
                    isDisabled={disabledCategories.has(library.key)}
                    isReordering={!!user}
                    onDisabledClick={handleDisabledCategoryClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="border border-destructive/30 rounded-md bg-destructive/5 p-3 text-center">
          <p className="text-[11px] text-destructive font-semibold mb-0.5">⚠ {t('footer.disclaimerTitle')}</p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            {t('footer.disclaimerFull')}
          </p>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center mt-3">© Michiel Strijbos</p>
      </div>
    </Layout>
  );
};

export default Index;
