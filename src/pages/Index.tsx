import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { Pill, ArrowRight, Heart, Stethoscope, Baby, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const drugLibraries = [
  {
    title: 'Borstkanker',
    description: 'Medicijnen voor behandeling van borstkanker',
    icon: Heart,
    href: '/drugs?category=breast',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    drugClasses: ['Chemotherapie', 'Hormoontherapie', 'HER2-remmers', 'CDK4/6i', 'IO/ICI'],
    stages: ['Neoadjuvant/Adjuvant', 'Gemetastaseerd'],
    subtypes: ['Hormoongevoelig (HR+)', 'HER2-positief', 'Triple negatief']
  },
  {
    title: 'Urologie',
    description: 'Medicijnen voor urologische oncologie',
    icon: Stethoscope,
    href: '/drugs?category=urology',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    drugClasses: ['ARPI', 'Chemotherapie', 'IO/ICI', 'TKI', 'PARPi', 'Radioligand'],
    stages: null,
    subtypes: null
  },
  {
    title: 'Gynaecologie',
    description: 'Medicijnen voor gynaecologische oncologie',
    icon: Baby,
    href: '/drugs?category=gynecology',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    drugClasses: ['Chemotherapie', 'PARPi', 'Antiangiogenese', 'IO/ICI', 'Hormoontherapie'],
    stages: null,
    subtypes: null
  },
  {
    title: 'Overige',
    description: 'Ondersteunende en overige medicatie',
    icon: MoreHorizontal,
    href: '/drugs?category=other',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    drugClasses: ['Antiresorptiva', 'Anti-emetica', 'G-CSF', 'Bisfosfonaten'],
    stages: null,
    subtypes: null
  }
];

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              <span className="text-primary">OncoInfo</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Uw complete medicijnbibliotheek voor oncologie. Patiëntvriendelijke informatie 
              over medicijnen, doseringen en bijwerkingen.
            </p>
          </div>
        </div>
      </section>

      {/* Drug Library Cards */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-10">
            Kies uw Specialisme
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
                  <CardContent className="relative">
                    {/* Drug Classes */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Medicijnklassen</p>
                      <div className="flex flex-wrap gap-1">
                        {library.drugClasses.slice(0, 4).map((drugClass) => (
                          <span 
                            key={drugClass} 
                            className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                          >
                            {drugClass}
                          </span>
                        ))}
                        {library.drugClasses.length > 4 && (
                          <span className="text-xs px-2 py-0.5 text-muted-foreground">
                            +{library.drugClasses.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stages - only for breast cancer */}
                    {library.stages && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Stadia</p>
                        <div className="flex flex-wrap gap-1">
                          {library.stages.map((stage) => (
                            <Badge key={stage} variant="outline" className="text-xs font-normal">
                              {stage}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subtypes - only for breast cancer */}
                    {library.subtypes && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Subtypen</p>
                        <div className="flex flex-wrap gap-1">
                          {library.subtypes.map((subtype) => (
                            <span 
                              key={subtype} 
                              className="text-xs px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full"
                            >
                              {subtype}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button variant="ghost" className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground">
                      Bekijk medicijnen
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Info Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-semibold mb-4">Voor Zorgverleners & Patiënten</h2>
            <p className="text-muted-foreground">
              OncoInfo is ontwikkeld als hulpmiddel voor oncologen en hun patiënten. 
              De medicijnbibliotheek biedt begrijpelijke informatie over doseringen, 
              bijwerkingen en counselingpunten. Genereer eenvoudig patiëntfolders.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
