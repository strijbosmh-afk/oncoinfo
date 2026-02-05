import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Stethoscope, Baby, MoreHorizontal, Utensils, Wind, Sun, CircleUser, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const drugLibraries = [
  {
    title: 'Borstkanker',
    description: 'Medicijnen voor behandeling van borstkanker',
    icon: Heart,
    href: '/drugs?category=breast',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  },
  {
    title: 'Urologie',
    description: 'Medicijnen voor urologische oncologie',
    icon: Stethoscope,
    href: '/drugs?category=urology',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    title: 'Gynaecologie',
    description: 'Medicijnen voor gynaecologische oncologie',
    icon: Baby,
    href: '/drugs?category=gynecology',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  {
    title: 'Overige',
    description: 'Ondersteunende en overige medicatie',
    icon: MoreHorizontal,
    href: '/drugs?category=other',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10'
  }
];

const upcomingLibraries = [
  {
    title: 'Digestieve',
    description: 'Gastro-intestinale tumoren',
    icon: Utensils,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  {
    title: 'Respiratoire',
    description: 'Long- en luchtwegentumoren',
    icon: Wind,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10'
  },
  {
    title: 'Huid',
    description: 'Dermatologische oncologie',
    icon: Sun,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  {
    title: 'Hoofd & Hals',
    description: 'Hoofd-halstumoren',
    icon: CircleUser,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10'
  }
];

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-8 md:py-12 overflow-hidden">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        <div className="container relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-primary">
              OncoInfo
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
              Compleet geneesmiddelenoverzicht voor oncologie
            </p>
          </div>
        </div>
      </section>

      {/* Drug Library Cards */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-10">
            Kies Specialiteit
          </h2>

          {/* Available specialties */}
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
                      Bekijk medicijnen
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Upcoming specialties - second row */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mt-6">
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
                    Binnenkort beschikbaar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Copyright */}
      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground/60">© Michiel Strijbos</p>
      </div>
    </Layout>
  );
};

export default Index;
