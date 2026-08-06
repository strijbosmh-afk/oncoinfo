import { useTranslation } from 'react-i18next';
import { ExternalLink, ShieldCheck, Wrench } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
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
    eviqDescription: 'Evidence-based behandelprotocollen, doseeradviezen en toxiciteitsmanagement, ontwikkeld voor de Australische context.',
    predictDescription: 'Prognose- en behandelvoordeelcalculator voor patiënten met vroege invasieve borstkanker.',
    trialsDescription: 'Doorzoekbaar internationaal register van klinische studies, met filters voor aandoening, locatie en studiestatus.',
    protocols: 'Behandelprotocollen',
    prognosis: 'Prognose',
    research: 'Klinische studies',
    openTool: 'Open tool',
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
    eviqDescription: 'Protocoles fondés sur les preuves, conseils de dosage et gestion des toxicités, développés pour le contexte australien.',
    predictDescription: 'Calculateur de pronostic et de bénéfice thérapeutique pour le cancer du sein invasif précoce.',
    trialsDescription: "Registre international consultable des études cliniques, avec filtres par maladie, lieu et statut de l'étude.",
    protocols: 'Protocoles de traitement',
    prognosis: 'Pronostic',
    research: 'Études cliniques',
    openTool: "Ouvrir l'outil",
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
    eviqDescription: 'Evidence-based treatment protocols, dosing guidance and toxicity management, developed for the Australian context.',
    predictDescription: 'Prognosis and treatment benefit calculator for patients with early invasive breast cancer.',
    trialsDescription: 'Searchable international clinical study registry with filters for condition, location and recruitment status.',
    protocols: 'Treatment protocols',
    prognosis: 'Prognosis',
    research: 'Clinical studies',
    openTool: 'Open tool',
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
    eviqDescription: 'Evidenzbasierte Behandlungsprotokolle, Dosierungshinweise und Toxizitätsmanagement für den australischen Kontext.',
    predictDescription: 'Prognose- und Therapienutzenrechner für frühes invasives Mammakarzinom.',
    trialsDescription: 'Durchsuchbares internationales Studienregister mit Filtern nach Erkrankung, Ort und Rekrutierungsstatus.',
    protocols: 'Behandlungsprotokolle',
    prognosis: 'Prognose',
    research: 'Klinische Studien',
    openTool: 'Tool öffnen',
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
  const language = currentLanguage(i18n.resolvedLanguage || i18n.language);
  const text = copy[language];

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

            <Card className="rounded-lg transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col p-4 sm:p-5">
                <div className="flex min-h-16 items-center rounded-md bg-[#f4fbfd] px-4 py-2">
                  <span className="text-3xl font-bold tracking-normal text-[#007f95]">eviQ</span>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{text.eviqDescription}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-normal">{text.protocols}</Badge>
                  <Badge variant="outline" className="font-normal">{text.external}</Badge>
                </div>
                <Button asChild className="mt-4 w-full sm:w-fit">
                  <a href="https://www.eviq.org.au/" target="_blank" rel="noopener noreferrer">
                    {text.openTool}<ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-lg transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col p-4 sm:p-5">
                <div className="flex min-h-16 items-center rounded-md bg-[#f2f7fb] px-4 py-2">
                  <span className="text-2xl font-bold tracking-normal text-[#005eb8]">PREDICT Breast</span>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{text.predictDescription}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-normal">{text.prognosis}</Badge>
                  <Badge variant="outline" className="font-normal">{text.external}</Badge>
                </div>
                <Button asChild className="mt-4 w-full sm:w-fit">
                  <a href="https://breast.v3.predict.cam/tool" target="_blank" rel="noopener noreferrer">
                    {text.openTool}<ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-lg transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col p-4 sm:p-5">
                <div className="flex min-h-16 items-center rounded-md bg-[#f5f7fb] px-4 py-2">
                  <span className="text-2xl font-bold tracking-normal text-[#16365c]">ClinicalTrials.gov</span>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{text.trialsDescription}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-normal">{text.research}</Badge>
                  <Badge variant="outline" className="font-normal">{text.external}</Badge>
                </div>
                <Button asChild className="mt-4 w-full sm:w-fit">
                  <a href="https://clinicaltrials.gov/" target="_blank" rel="noopener noreferrer">
                    {text.openTool}<ExternalLink className="ml-2 h-4 w-4" />
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
