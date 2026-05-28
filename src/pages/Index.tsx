import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Stethoscope, Baby, MoreHorizontal, UtensilsCrossed, Wind, Palette, Ear, Search, Lock, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDrugs } from '@/hooks/useDrugs';
import { useMostUsed } from '@/hooks/useMostUsed';
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
import { DischargeTemplatesSection } from '@/components/home/DischargeTemplatesSection';
import { TemplateShortcutsSection } from '@/components/home/TemplateShortcutsSection';
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

const LIBRARY_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  breast: { icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  urology: { icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  gynecology: { icon: Baby, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  respiratory: { icon: Wind, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  digestive: { icon: UtensilsCrossed, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  skin: { icon: Palette, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  head_neck: { icon: Ear, color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
  other: { icon: MoreHorizontal, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
};

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { data: searchResults } = useDrugs(searchQuery.length >= 2 ? { search: searchQuery } : undefined);
  const searchRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { hospital } = useHospital();
  const { user, profile } = useAuth();
  const { newDrugs, showPopup, dismissPopup } = useNewDrugsNotification(user?.id);
  const [disciplines, setDisciplines] = useState<{ disease_area: string; is_enabled: boolean }[] | null>(null);
  const { mostUsed, toggleMostUsed } = useMostUsed();
  const [mostUsedDrugs, setMostUsedDrugs] = useState<{ id: string; generic_name: string; drug_class: string }[]>([]);
  const { order: specialtyOrder, saveOrder, loaded: orderLoaded } = useSpecialtyOrder();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    if (mostUsed.length === 0) {
      setMostUsedDrugs([]);
      return;
    }
    const fetchDrugs = async () => {
      const { data } = await supabase
        .from('drugs')
        .select('id, generic_name, drug_class')
        .in('id', mostUsed.map(m => m.drug_id));
      if (data) {
        const ordered = mostUsed
          .map(m => data.find(d => d.id === m.drug_id))
          .filter(Boolean) as typeof data;
        setMostUsedDrugs(ordered);
      }
    };
    fetchDrugs();
  }, [mostUsed]);

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
    }).filter(Boolean) as Array<{ key: string; title: string; description: string; icon: any; href: string; color: string; bgColor: string }>;
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
      <section className="flex-1 flex items-center py-6 md:py-10">
        <div className="container">
          {/* Quick access: most used drugs — at the very top for power users */}
          {mostUsedDrugs.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-orange-400 fill-orange-400" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('home.mostUsed', 'Meest gebruikt')}
                </h3>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
                {mostUsedDrugs.map((drug) => (
                  <div key={drug.id} className="relative group flex items-center">
                    <Link to={`/drugs/${drug.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 pr-7 text-xs font-medium border-orange-200 !text-foreground hover:border-orange-400 hover:bg-orange-50 dark:border-orange-800 dark:hover:border-orange-600 dark:hover:bg-orange-950/30 transition-colors"
                      >
                        <Zap className="h-3 w-3 text-orange-400 fill-orange-400 shrink-0" />
                        {drug.generic_name}
                      </Button>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMostUsed(drug.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                      aria-label={t('mostUsed.remove')}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search — prominently placed for quick drug lookup */}
          <div className="max-w-2xl mx-auto mb-10" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('home.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                  onFocus={() => setShowResults(true)}
                  className="pl-12 pr-4 py-6 text-lg rounded-xl border-2 focus:border-primary"
                />
              </div>
              
              {showResults && searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border-2 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                  {searchResults.slice(0, 8).map((drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => handleResultClick(drug.id)}
                      className="search-result w-full px-4 py-3 text-left flex items-center justify-between border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium">{drug.generic_name}</p>
                        {drug.brand_names && drug.brand_names.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {drug.brand_names.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {drug.drug_class}
                      </span>
                    </button>
                  ))}
                  {searchResults.length > 8 && (
                    <button
                      type="submit"
                      className="w-full px-4 py-3 text-center text-primary hover:bg-muted/50 font-medium"
                    >
                      {t('drugs.viewAllResults', { count: searchResults.length })} →
                    </button>
                  )}
                </div>
              )}
              
              {showResults && searchQuery.length >= 2 && searchResults && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border-2 rounded-xl shadow-lg z-50 p-4 text-center text-muted-foreground">
                  {t('drugs.noResultsFor')} "{searchQuery}"
                </div>
              )}
            </form>
          </div>

          {/* Specialty cards — browse by category */}
          <h2 className="text-xl font-bold text-center mb-6">
            {t('home.chooseSpecialty')}
          </h2>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={specialtyOrder} strategy={rectSortingStrategy}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
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

          <DischargeTemplatesSection />
          <TemplateShortcutsSection />
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
