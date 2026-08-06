import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookMarked, ExternalLink, Loader2, Search, ShieldCheck } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Language = 'nl' | 'fr' | 'en' | 'de';

interface GuidelineSource {
  name: string;
  description: Record<Language, string>;
  url: string;
  scope: 'belgian' | 'european' | 'international';
  areas: string[];
  access?: 'free' | 'account';
}

const areas: Record<Language, Record<string, string>> = {
  nl: { all: 'Alle', general: 'Algemeen', breast: 'Borst', thoracic: 'Thoracaal', digestive: 'Digestief', genitourinary: 'Urogenitaal', gynecologic: 'Gynaecologisch', skin: 'Huid', headNeck: 'Hoofd-hals', hematology: 'Hematologie', supportive: 'Supportieve zorg' },
  fr: { all: 'Tous', general: 'Général', breast: 'Sein', thoracic: 'Thoracique', digestive: 'Digestif', genitourinary: 'Urogénital', gynecologic: 'Gynécologique', skin: 'Peau', headNeck: 'Tête et cou', hematology: 'Hématologie', supportive: 'Soins de support' },
  en: { all: 'All', general: 'General', breast: 'Breast', thoracic: 'Thoracic', digestive: 'Digestive', genitourinary: 'Genitourinary', gynecologic: 'Gynecologic', skin: 'Skin', headNeck: 'Head and neck', hematology: 'Hematology', supportive: 'Supportive care' },
  de: { all: 'Alle', general: 'Allgemein', breast: 'Brust', thoracic: 'Thorakal', digestive: 'Gastrointestinal', genitourinary: 'Urogenital', gynecologic: 'Gynäkologisch', skin: 'Haut', headNeck: 'Kopf-Hals', hematology: 'Hämatologie', supportive: 'Supportivtherapie' },
};

const copy: Record<Language, Record<string, string>> = {
  nl: { title: 'Oncologische richtlijnen', subtitle: 'Snel naar betrouwbare, actuele richtlijnen per ziektegebied.', search: 'Zoek op bron of onderwerp...', belgian: 'Belgische bronnen', european: 'Europese bronnen', international: 'Internationale bronnen', free: 'Vrij toegankelijk', account: 'Account vereist', empty: 'Geen richtlijnen gevonden voor deze selectie.', noticeTitle: 'Gebruik de actuele bronversie', notice: 'Deze pagina is een navigatiehulp en geen medisch beslissysteem. Controleer steeds publicatiedatum, updates en lokale ziekenhuisafspraken.' },
  fr: { title: 'Recommandations oncologiques', subtitle: 'Accédez rapidement aux recommandations fiables et actuelles par domaine.', search: 'Rechercher une source ou un sujet...', belgian: 'Sources belges', european: 'Sources européennes', international: 'Sources internationales', free: 'Accès libre', account: 'Compte requis', empty: 'Aucune recommandation trouvée pour cette sélection.', noticeTitle: 'Utilisez la version actuelle de la source', notice: "Cette page est une aide à la navigation et non un système de décision médicale. Vérifiez toujours la date de publication, les mises à jour et les accords locaux de l'hôpital." },
  en: { title: 'Oncology guidelines', subtitle: 'Quick access to reliable, current guidelines by disease area.', search: 'Search by source or topic...', belgian: 'Belgian sources', european: 'European sources', international: 'International sources', free: 'Open access', account: 'Account required', empty: 'No guidelines found for this selection.', noticeTitle: 'Use the current source version', notice: 'This page is a navigation aid, not a medical decision system. Always check the publication date, updates and local hospital policies.' },
  de: { title: 'Onkologische Leitlinien', subtitle: 'Schneller Zugang zu zuverlässigen, aktuellen Leitlinien nach Krankheitsbereich.', search: 'Nach Quelle oder Thema suchen...', belgian: 'Belgische Quellen', european: 'Europäische Quellen', international: 'Internationale Quellen', free: 'Frei zugänglich', account: 'Konto erforderlich', empty: 'Keine Leitlinien für diese Auswahl gefunden.', noticeTitle: 'Aktuelle Quellenversion verwenden', notice: 'Diese Seite ist eine Navigationshilfe und kein medizinisches Entscheidungssystem. Prüfen Sie stets Publikationsdatum, Aktualisierungen und lokale Krankenhausvorgaben.' },
};

const allClinicalAreas = ['breast', 'thoracic', 'digestive', 'genitourinary', 'gynecologic', 'skin', 'headNeck', 'hematology', 'supportive'];

const sources: GuidelineSource[] = [
  {
    name: 'KCE - Federaal Kenniscentrum voor de Gezondheidszorg',
    description: {
      nl: 'Belgische klinische praktijkrichtlijnen, rapporten en kwaliteitsindicatoren voor kankerzorg.',
      fr: 'Guides de pratique clinique, rapports et indicateurs de qualité belges pour les soins oncologiques.',
      en: 'Belgian clinical practice guidelines, reports and quality indicators for cancer care.',
      de: 'Belgische Praxisleitlinien, Berichte und Qualitätsindikatoren für die Krebsversorgung.',
    },
    url: 'https://kce.fgov.be/nl/over-ons/wat-is-het-kce/onze-activiteitsdomeinen/good-clinical-practice',
    scope: 'belgian', areas: ['general', ...allClinicalAreas], access: 'free',
  },
  {
    name: 'Belgian Society for Medical Oncology (BSMO)',
    description: {
      nl: 'Belgisch professioneel netwerk met wetenschappelijke informatie en nationale oncologische initiatieven.',
      fr: "Réseau professionnel belge proposant des informations scientifiques et des initiatives oncologiques nationales.",
      en: 'Belgian professional network with scientific information and national oncology initiatives.',
      de: 'Belgisches Fachnetzwerk mit wissenschaftlichen Informationen und nationalen Onkologie-Initiativen.',
    },
    url: 'https://www.bsmo.be/', scope: 'belgian', areas: ['general'], access: 'free',
  },
  {
    name: 'ESMO Clinical Practice Guidelines',
    description: {
      nl: 'Europese diagnose-, behandelings- en follow-uprichtlijnen, inclusief regelmatig bijgewerkte living guidelines.',
      fr: 'Recommandations européennes pour le diagnostic, le traitement et le suivi, y compris des living guidelines actualisées.',
      en: 'European diagnosis, treatment and follow-up guidance, including regularly updated living guidelines.',
      de: 'Europäische Empfehlungen zu Diagnose, Behandlung und Nachsorge, einschließlich aktualisierter Living Guidelines.',
    },
    url: 'https://www.esmo.org/guidelines', scope: 'european', areas: ['general', ...allClinicalAreas], access: 'free',
  },
  {
    name: 'EHA Guidelines',
    description: {
      nl: 'Europese evidence-based richtlijnen voor hematologische aandoeningen en maligniteiten.',
      fr: 'Recommandations européennes fondées sur les preuves pour les maladies et malignités hématologiques.',
      en: 'European evidence-based guidance for hematologic diseases and malignancies.',
      de: 'Europäische evidenzbasierte Leitlinien für hämatologische Erkrankungen und Malignome.',
    },
    url: 'https://ehaweb.org/clinical-practice/guidelines-by-areas-of-disease', scope: 'european', areas: ['hematology'], access: 'free',
  },
  {
    name: 'European Association of Urology (EAU)',
    description: {
      nl: 'Europese richtlijnen voor prostaat-, blaas-, nier- en andere urologische tumoren.',
      fr: 'Recommandations européennes pour les tumeurs de la prostate, de la vessie, du rein et autres tumeurs urologiques.',
      en: 'European guidance for prostate, bladder, kidney and other urologic cancers.',
      de: 'Europäische Leitlinien für Prostata-, Blasen-, Nieren- und andere urologische Tumoren.',
    },
    url: 'https://uroweb.org/guidelines', scope: 'european', areas: ['genitourinary'], access: 'free',
  },
  {
    name: 'ASCO Guidelines',
    description: {
      nl: 'Evidence-based aanbevelingen voor systemische therapie, biomarkers, follow-up en supportieve zorg.',
      fr: 'Recommandations fondées sur les preuves pour les traitements systémiques, biomarqueurs, suivi et soins de support.',
      en: 'Evidence-based recommendations for systemic therapy, biomarkers, follow-up and supportive care.',
      de: 'Evidenzbasierte Empfehlungen zu systemischer Therapie, Biomarkern, Nachsorge und Supportivtherapie.',
    },
    url: 'https://www.asco.org/guidelines', scope: 'international', areas: ['general', ...allClinicalAreas], access: 'free',
  },
  {
    name: 'NCCN Clinical Practice Guidelines in Oncology',
    description: {
      nl: 'Uitgebreide multidisciplinaire richtlijnen en beslisalgoritmen per tumortype.',
      fr: 'Recommandations multidisciplinaires détaillées et algorithmes décisionnels par type de tumeur.',
      en: 'Detailed multidisciplinary guidelines and decision algorithms by tumour type.',
      de: 'Umfassende multidisziplinäre Leitlinien und Entscheidungsalgorithmen nach Tumorart.',
    },
    url: 'https://www.nccn.org/guidelines/category_1', scope: 'international', areas: ['general', ...allClinicalAreas], access: 'account',
  },
  {
    name: 'MASCC Guidelines',
    description: {
      nl: 'Internationale aanbevelingen voor supportive care, toxiciteitsmanagement en symptoomcontrole.',
      fr: 'Recommandations internationales pour les soins de support, la gestion des toxicités et le contrôle des symptômes.',
      en: 'International recommendations for supportive care, toxicity management and symptom control.',
      de: 'Internationale Empfehlungen zu Supportivtherapie, Toxizitätsmanagement und Symptomkontrolle.',
    },
    url: 'https://mascc.org/resources/mascc-guidelines/', scope: 'international', areas: ['supportive'], access: 'account',
  },
];

function currentLanguage(language: string): Language {
  const code = language.split('-')[0] as Language;
  return ['nl', 'fr', 'en', 'de'].includes(code) ? code : 'nl';
}

export default function GuidelinesPage() {
  const { i18n } = useTranslation();
  const { permissions, isAdmin, isSuperAdmin, loading } = useAuth();
  const language = currentLanguage(i18n.resolvedLanguage || i18n.language);
  const text = copy[language];
  const areaLabels = areas[language];
  const [activeArea, setActiveArea] = useState('all');
  const [query, setQuery] = useState('');
  const canView = isAdmin || isSuperAdmin || !!permissions?.is_physician;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language);
    return sources.filter((source) => {
      const matchesArea = activeArea === 'all' || source.areas.includes(activeArea);
      const searchable = `${source.name} ${source.description[language]} ${source.areas.map(area => areaLabels[area]).join(' ')}`.toLocaleLowerCase(language);
      return matchesArea && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeArea, areaLabels, language, query]);

  if (loading) return <Layout><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Layout>;
  if (!canView) return <Navigate to="/home" replace />;

  const sections = [
    { scope: 'belgian', title: text.belgian },
    { scope: 'european', title: text.european },
    { scope: 'international', title: text.international },
  ] as const;

  return (
    <Layout>
      <div className="container max-w-6xl py-5 sm:py-6">
        <header className="mb-5 rounded-lg border bg-primary/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <BookMarked className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{text.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{text.subtitle}</p>
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-10 -mx-1 mb-5 space-y-3 border-b bg-background/95 px-1 pb-3 pt-1 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.search} className="h-10 pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(areaLabels).map(([key, label]) => (
              <Button key={key} type="button" size="sm" variant={activeArea === key ? 'default' : 'outline'} className="h-8 shrink-0 rounded-full" onClick={() => setActiveArea(key)}>
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div><p className="font-semibold">{text.noticeTitle}</p><p className="mt-0.5 text-muted-foreground">{text.notice}</p></div>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">{text.empty}</CardContent></Card>
        ) : (
          <div className="space-y-7">
            {sections.map(section => {
              const sectionSources = filtered.filter(source => source.scope === section.scope);
              if (!sectionSources.length) return null;
              return (
                <section key={section.scope}>
                  <h2 className="mb-3 text-base font-semibold">{section.title}</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {sectionSources.map(source => (
                      <Card key={source.name} className="rounded-lg transition-colors hover:border-primary/40">
                        <CardContent className="flex h-full flex-col p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold leading-snug">{source.name}</h3>
                            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{source.description[language]}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {source.areas.filter(area => area !== 'general').slice(0, 4).map(area => <Badge key={area} variant="secondary" className="font-normal">{areaLabels[area]}</Badge>)}
                            {source.access && <Badge variant="outline" className="font-normal">{source.access === 'free' ? text.free : text.account}</Badge>}
                          </div>
                          <Button asChild variant="link" className="mt-2 h-auto justify-start p-0 text-sm">
                            <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
