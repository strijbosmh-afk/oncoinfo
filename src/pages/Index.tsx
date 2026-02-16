import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Stethoscope, Baby, MoreHorizontal, UtensilsCrossed, Wind, Palette, Ear, Search, Lock, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDrugs } from '@/hooks/useDrugs';
import { useMostUsed } from '@/hooks/useMostUsed';
import { useTranslation } from 'react-i18next';
import { useHospital } from '@/contexts/HospitalContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Map each category to the discipline disease_area keys it requires
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

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults } = useDrugs(searchQuery.length >= 2 ? { search: searchQuery } : undefined);
  const { t } = useTranslation();
  const { hospital } = useHospital();
  const { profile } = useAuth();
  const [disciplines, setDisciplines] = useState<{ disease_area: string; is_enabled: boolean }[] | null>(null);
  const { mostUsed } = useMostUsed();
  const [mostUsedDrugs, setMostUsedDrugs] = useState<{ id: string; generic_name: string; drug_class: string }[]>([]);

  // Fetch drug details for most-used items
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
        // Maintain display_order
        const ordered = mostUsed
          .map(m => data.find(d => d.id === m.drug_id))
          .filter(Boolean) as typeof data;
        setMostUsedDrugs(ordered);
      }
    };
    fetchDrugs();
  }, [mostUsed]);

  // Fetch hospital disciplines
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

  // Determine which categories are disabled
  const disabledCategories = useMemo(() => {
    // If no disciplines configured at all, everything is enabled (backwards compatible)
    if (!disciplines || disciplines.length === 0) return new Set<string>();

    const enabledAreas = new Set(
      disciplines.filter(d => d.is_enabled).map(d => d.disease_area)
    );

    const disabled = new Set<string>();
    for (const [category, areas] of Object.entries(CATEGORY_DISCIPLINE_MAP)) {
      // A category is disabled if NONE of its discipline areas are enabled
      const hasAnyEnabled = areas.some(area => enabledAreas.has(area));
      if (!hasAnyEnabled) {
        disabled.add(category);
      }
    }
    return disabled;
  }, [disciplines]);

  const drugLibraries = [
    { key: 'breast', title: t('home.breast'), description: t('home.breastDesc'), icon: Heart, href: '/drugs?category=breast', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
    { key: 'urology', title: t('home.urology'), description: t('home.urologyDesc'), icon: Stethoscope, href: '/drugs?category=urology', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { key: 'gynecology', title: t('home.gynecology'), description: t('home.gynecologyDesc'), icon: Baby, href: '/drugs?category=gynecology', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { key: 'respiratory', title: t('home.respiratory'), description: t('home.respiratoryDesc'), icon: Wind, href: '/drugs?category=respiratory', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
    { key: 'digestive', title: t('home.digestive'), description: t('home.digestiveDesc'), icon: UtensilsCrossed, href: '/drugs?category=digestive', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { key: 'skin', title: t('home.skin'), description: t('home.skinDesc'), icon: Palette, href: '/drugs?category=skin', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { key: 'head_neck', title: t('home.headNeck'), description: t('home.headNeckDesc'), icon: Ear, href: '/drugs?category=head_neck', color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
    { key: 'other', title: t('home.other'), description: t('home.otherDesc'), icon: MoreHorizontal, href: '/drugs?category=other', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/drugs?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleResultClick = (drugId: string) => {
    navigate(`/drugs/${drugId}`);
    setSearchQuery('');
  };

  const handleDisabledCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.info('Deze functie werd uitgeschakeld voor uw instelling.', {
      duration: 3000,
    });
  };

  return (
    <Layout>
      <section className="flex-1 flex items-center py-8 md:py-12">
        <div className="container">
          {mostUsedDrugs.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-orange-400 fill-orange-400" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('home.mostUsed', 'Meest gebruikt')}
                </h3>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
                {mostUsedDrugs.map((drug) => (
                  <Link key={drug.id} to={`/drugs/${drug.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 text-xs font-medium border-orange-200 !text-foreground hover:border-orange-400 hover:bg-orange-50 dark:border-orange-800 dark:hover:border-orange-600 dark:hover:bg-orange-950/30 transition-colors"
                    >
                      <Zap className="h-3.5 w-3.5 text-orange-400 fill-orange-400 shrink-0" />
                      {drug.generic_name}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-center mb-10">
            {t('home.chooseSpecialty')}
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {drugLibraries.map((library) => {
              const isDisabled = disabledCategories.has(library.key);

              if (isDisabled) {
                return (
                  <div key={library.title} onClick={handleDisabledCategoryClick} className="cursor-not-allowed">
                    <Card className="h-full relative overflow-hidden border-2 border-muted opacity-50 grayscale">
                      <div className="absolute top-3 right-3 z-10">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardHeader className="relative pb-2">
                        <div className={`h-14 w-14 rounded-xl bg-muted flex items-center justify-center mb-4`}>
                          <library.icon className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl text-muted-foreground">{library.title}</CardTitle>
                        <CardDescription>{library.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="relative pt-0">
                        <Button variant="ghost" className="w-full" disabled>
                          {t('home.viewDrugs')}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                );
              }

              return (
                <Link key={library.title} to={library.href}>
                  <Card className="h-full group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="relative pb-2">
                      <div className={`h-14 w-14 rounded-xl ${library.bgColor} flex items-center justify-center mb-4`}>
                        <library.icon className={`h-7 w-7 ${library.color}`} />
                      </div>
                      <CardTitle className="text-xl">{library.title}</CardTitle>
                      <CardDescription>{library.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="relative pt-0">
                      <Button variant="ghost" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                        {t('home.viewDrugs')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <h2 className="text-2xl font-bold text-center mt-12 mb-6">
            {t('home.orChooseDrug')}
          </h2>

          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('home.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg rounded-xl border-2 focus:border-primary"
                />
              </div>
              
              {searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border-2 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                  {searchResults.slice(0, 8).map((drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => handleResultClick(drug.id)}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center justify-between border-b last:border-b-0"
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
              
              {searchQuery.length >= 2 && searchResults && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border-2 rounded-xl shadow-lg z-50 p-4 text-center text-muted-foreground">
                  {t('drugs.noResultsFor')} "{searchQuery}"
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="border border-destructive/30 rounded-md bg-destructive/5 p-3 text-center">
          <p className="text-[11px] text-destructive font-semibold mb-0.5">⚠ {t('disclaimer.title', 'Belangrijke mededeling')}</p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            {t('disclaimer.text', 'Dit platform is uitsluitend bedoeld als informatief hulpmiddel en is geen medisch hulpmiddel (MDR 2017/745). De inhoud kan fouten bevatten en mag niet als enige basis voor klinische beslissingen dienen. Raadpleeg altijd uw behandelend arts of apotheker.')}
          </p>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center mt-3">© Michiel Strijbos</p>
      </div>
    </Layout>
  );
};

export default Index;
