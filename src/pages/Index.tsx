import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { Database, Pill, ArrowRight, Search, BookOpen, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              <span className="text-primary">UroInfo</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Uw complete resource voor urologische oncologie. Toegang tot medicijninformatie 
              voor patiënten en een uitgebreide database van klinische studies.
            </p>
          </div>
        </div>
      </section>

      {/* Main Navigation Cards */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Drug Library Card */}
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Pill className="h-8 w-8" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Medicijnbibliotheek</CardTitle>
                <CardDescription className="text-base">
                  Patiëntvriendelijke informatie over GU-oncologie medicijnen
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Zoek op medicijnnaam of type
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Doseringen en bijwerkingen
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Genereer patiëntfolders
                  </li>
                </ul>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Categorieën: Chemotherapie, ARPI, PARPi, IO/ICI, TKI, ADC
                  </p>
                  <Link to="/drugs">
                    <Button className="w-full group-hover:bg-primary/90">
                      Naar Medicijnbibliotheek
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Trials Database Card */}
            <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Database className="h-8 w-8" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Klinische Studies Database</CardTitle>
                <CardDescription className="text-base">
                  Uitgebreid overzicht van GU-oncologie trials
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Filter op ziekte, fase, interventie
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Overlevingsdata en eindpunten
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Data uit PubMed en ClinicalTrials.gov
                  </li>
                </ul>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Ziektegebieden: Prostaat, Blaas, Nier, Testis, Penis
                  </p>
                  <Link to="/trials">
                    <Button className="w-full group-hover:bg-primary/90">
                      Naar Studies Database
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Info Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-semibold mb-4">Voor Zorgverleners & Patiënten</h2>
            <p className="text-muted-foreground">
              UroInfo is ontwikkeld als hulpmiddel voor urologen, oncologen en hun patiënten. 
              De medicijnbibliotheek biedt begrijpelijke informatie voor patiënten, terwijl de 
              studies database diepgaande klinische data bevat voor professionals.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
