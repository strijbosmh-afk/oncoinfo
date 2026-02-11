import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Stethoscope, Baby, MoreHorizontal, Utensils, Wind, Sun, CircleUser, Lock, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDrugs } from '@/hooks/useDrugs';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults } = useDrugs(searchQuery.length >= 2 ? { search: searchQuery } : undefined);
  const { t } = useTranslation();

  const drugLibraries = [
    { title: t('home.breast'), description: t('home.breastDesc'), icon: Heart, href: '/drugs?category=breast', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
    { title: t('home.urology'), description: t('home.urologyDesc'), icon: Stethoscope, href: '/drugs?category=urology', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: t('home.gynecology'), description: t('home.gynecologyDesc'), icon: Baby, href: '/drugs?category=gynecology', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { title: t('home.respiratory'), description: t('home.respiratoryDesc'), icon: Wind, href: '/drugs?category=respiratory', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
    { title: t('home.other'), description: t('home.otherDesc'), icon: MoreHorizontal, href: '/drugs?category=other', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  ];

  const upcomingLibraries = [
    { title: t('home.digestive'), description: t('home.digestiveDesc'), icon: Utensils, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: t('home.skin'), description: t('home.skinDesc'), icon: Sun, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { title: t('home.headNeck'), description: t('home.headNeckDesc'), icon: CircleUser, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
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

  return (
    <Layout>
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-10">
            {t('home.chooseSpecialty')}
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {drugLibraries.map((library) => (
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
            ))}
            {upcomingLibraries.map((library) => (
              <Card key={library.title} className="h-full relative overflow-hidden border-2 border-dashed border-muted-foreground/30 opacity-60">
                <div className="absolute top-3 right-3">
                  <Lock className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <CardHeader className="relative pb-2">
                  <div className={`h-14 w-14 rounded-xl ${library.bgColor} flex items-center justify-center mb-4`}>
                    <library.icon className={`h-7 w-7 ${library.color}`} />
                  </div>
                  <CardTitle className="text-xl text-muted-foreground">{library.title}</CardTitle>
                  <CardDescription>{library.description}</CardDescription>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <Button variant="ghost" className="w-full" disabled>
                    {t('common.comingSoon')}
                  </Button>
                </CardContent>
              </Card>
            ))}
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

      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground/60">© Michiel Strijbos</p>
      </div>
    </Layout>
  );
};

export default Index;