import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Loader2, ShieldCheck, Wrench } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Language = 'nl' | 'fr' | 'en' | 'de';

const copy: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Oncologische tools',
    subtitle: 'Betrouwbare externe hulpmiddelen voor de dagelijkse oncologische praktijk.',
    description: 'Professioneel platform met klinische calculators, prognostische scores, TNM-stadiëring, toxiciteitscriteria en medicatie-informatie.',
    professional: 'Voor zorgprofessionals',
    external: 'Externe tool',
    open: 'Open ONCOassist',
    noticeTitle: 'Gebruik als professioneel hulpmiddel',
    notice: 'Externe tools ondersteunen, maar vervangen geen klinische beoordeling. Controleer uitkomsten steeds aan de hand van actuele richtlijnen en lokale ziekenhuisafspraken.',
  },
  fr: {
    title: 'Outils oncologiques',
    subtitle: 'Outils externes fiables pour la pratique oncologique quotidienne.',
    description: 'Plateforme professionnelle proposant des calculateurs cliniques, scores pronostiques, classification TNM, critères de toxicité et informations sur les médicaments.',
    professional: 'Pour les professionnels de santé',
    external: 'Outil externe',
    open: 'Ouvrir ONCOassist',
    noticeTitle: 'Utiliser comme outil professionnel',
    notice: "Les outils externes soutiennent mais ne remplacent pas le jugement clinique. Vérifiez toujours les résultats à l'aide des recommandations actuelles et des accords locaux de l'hôpital.",
  },
  en: {
    title: 'Oncology tools',
    subtitle: 'Reliable external tools for day-to-day oncology practice.',
    description: 'Professional platform with clinical calculators, prognostic scores, TNM staging, toxicity criteria and drug information.',
    professional: 'For healthcare professionals',
    external: 'External tool',
    open: 'Open ONCOassist',
    noticeTitle: 'Use as a professional aid',
    notice: 'External tools support but do not replace clinical judgement. Always verify results against current guidelines and local hospital policies.',
  },
  de: {
    title: 'Onkologische Tools',
    subtitle: 'Zuverlässige externe Hilfsmittel für den onkologischen Alltag.',
    description: 'Professionelle Plattform mit klinischen Rechnern, Prognosescores, TNM-Klassifikation, Toxizitätskriterien und Arzneimittelinformationen.',
    professional: 'Für medizinisches Fachpersonal',
    external: 'Externes Tool',
    open: 'ONCOassist öffnen',
    noticeTitle: 'Als professionelles Hilfsmittel verwenden',
    notice: 'Externe Tools unterstützen die klinische Beurteilung, ersetzen sie jedoch nicht. Prüfen Sie Ergebnisse stets anhand aktueller Leitlinien und lokaler Krankenhausvorgaben.',
  },
};

function currentLanguage(language: string): Language {
  const code = language.split('-')[0] as Language;
  return ['nl', 'fr', 'en', 'de'].includes(code) ? code : 'nl';
}

export default function ToolsPage() {
  const { i18n } = useTranslation();
  const { permissions, isAdmin, isSuperAdmin, loading } = useAuth();
  const language = currentLanguage(i18n.resolvedLanguage || i18n.language);
  const text = copy[language];
  const canView = isAdmin || isSuperAdmin || !!permissions?.is_physician;

  if (loading) {
    return <Layout><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Layout>;
  }
  if (!canView) return <Navigate to="/home" replace />;

  return (
    <Layout>
      <div className="container max-w-6xl py-5 sm:py-6">
        <header className="mb-5 rounded-lg border bg-primary/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{text.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{text.subtitle}</p>
            </div>
          </div>
        </header>

        <div className="mb-6 flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{text.noticeTitle}</p>
            <p className="mt-0.5 text-muted-foreground">{text.notice}</p>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-base font-semibold">Tools</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="rounded-lg transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col p-4 sm:p-5">
                <div className="flex min-h-16 items-center rounded-md bg-white px-3 py-2">
                  <img
                    src="/images/tools/oncoassist-logo.png"
                    alt="ONCOassist"
                    width="500"
                    height="118"
                    className="h-auto w-full max-w-[270px]"
                  />
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{text.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-normal">{text.professional}</Badge>
                  <Badge variant="outline" className="font-normal">{text.external}</Badge>
                </div>
                <Button asChild className="mt-4 w-full sm:w-fit">
                  <a href="https://oncoassist.com/" target="_blank" rel="noopener noreferrer">
                    {text.open}<ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </Layout>
  );
}
