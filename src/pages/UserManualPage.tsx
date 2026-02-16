import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, LogIn, Home, Search, Star, Zap, Layers, Pill, 
  FileText, GripVertical, Filter, Users, Shield, Download, 
  Printer, Settings2, Heart, Baby, Stethoscope, Eye, FlaskConical,
  ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

function Section({ icon: Icon, title, children, defaultOpen = false }: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="flex-1">{title}</span>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 prose prose-sm max-w-none dark:prose-invert">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start py-1.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
        {n}
      </span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function KeyCombo({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
    </span>
  );
}

function IconLabel({ icon: Icon, label, className = '' }: { icon: React.ElementType; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${className}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

export default function UserManualPage() {
  return (
    <Layout>
      <div className="container max-w-4xl py-6 sm:py-10">
        <Link to="/home">
          <Button variant="ghost" size="sm" className="mb-4 gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Terug naar home
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📖 Gebruikershandleiding</h1>
          <p className="text-muted-foreground text-lg">
            Welkom bij OncoInfo — uw digitale medicijnbibliotheek voor oncologische therapieën.
            Hieronder vindt u een overzicht van alle functionaliteiten.
          </p>
        </div>

        <div className="space-y-4">

          {/* 1. INLOGGEN */}
          <Section icon={LogIn} title="1. Inloggen" defaultOpen={true}>
            <p>U opent OncoInfo via uw browser (desktop, tablet of smartphone).</p>
            <Step n={1}>Selecteer uw <strong>ziekenhuis</strong> in het dropdownmenu.</Step>
            <Step n={2}>Voer uw <strong>gebruikersnaam</strong> in (niet uw e-mailadres).</Step>
            <Step n={3}>Voer uw <strong>wachtwoord</strong> in.</Step>
            <Step n={4}>Klik op <strong>Inloggen</strong>.</Step>
            <div className="bg-muted/50 rounded-lg p-3 mt-3">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Het laatst gekozen ziekenhuis wordt automatisch onthouden bij uw volgende bezoek.
                Onderaan de inlogpagina kunt u de interfacetaal wijzigen (🇳🇱 🇫🇷 🇩🇪 🇬🇧).
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                🔑 <strong>Eerste login:</strong> Na uw eerste login wordt u gevraagd om uw wachtwoord te wijzigen. 
                Dit is verplicht voor de veiligheid van uw account.
              </p>
            </div>
          </Section>

          {/* 2. STARTPAGINA */}
          <Section icon={Home} title="2. Startpagina (Home)">
            <p>Na het inloggen komt u op de startpagina terecht. Hier vindt u:</p>
            
            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400 fill-orange-400" />
              Meest gebruikte schema's (snelkoppelingen)
            </h4>
            <p>
              Bovenaan verschijnen uw persoonlijke snelkoppelingen — maximaal 8 medicijnen die u als 
              "meest gebruikt" hebt gemarkeerd. Klik op een snelkoppeling om direct naar het medicijn te navigeren.
            </p>

            <h4 className="font-semibold mt-4 mb-2">Specialismen</h4>
            <p>Kies een oncologisch specialisme om de bijbehorende medicijnen te bekijken:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
              {[
                { icon: Heart, label: 'Borstkanker', color: 'text-pink-500' },
                { icon: Stethoscope, label: 'Urologie', color: 'text-blue-500' },
                { icon: Baby, label: 'Gynaecologie', color: 'text-purple-500' },
                { icon: Pill, label: 'En meer...', color: 'text-muted-foreground' },
              ].map(({ icon: I, label, color }) => (
                <div key={label} className="flex items-center gap-2 text-sm p-2 rounded-lg border">
                  <I className={`h-4 w-4 ${color}`} />
                  {label}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              🔒 Specialismen die niet zijn geactiveerd voor uw ziekenhuis zijn uitgegrijsd en niet aanklikbaar.
            </p>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Zoekbalk
            </h4>
            <p>
              Onderaan de startpagina kunt u een medicijn zoeken op naam of merknaam. 
              Resultaten verschijnen direct terwijl u typt (vanaf 2 tekens).
            </p>
          </Section>

          {/* 3. MEDICIJNOVERZICHT */}
          <Section icon={Pill} title="3. Medicijnoverzicht">
            <p>
              Na het kiezen van een specialisme ziet u alle beschikbare medicijnen, 
              onderverdeeld in twee secties:
            </p>
            
            <div className="flex gap-3 my-3">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
                <Layers className="h-3.5 w-3.5" />
                Combinatieschema's
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Pill className="h-3.5 w-3.5" />
                Individuele medicijnen
              </Badge>
            </div>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </h4>
            <p>Gebruik de filterbalk bovenaan om te filteren op:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li><strong>Subtype</strong> — bijv. HR+, HER2+, TNBC (bij borstkanker)</li>
              <li><strong>Stadium</strong> — Neoadjuvant/Adjuvant of Gemetastaseerd</li>
              <li><strong>Ziektegebied</strong> — bijv. Prostaatkanker, Blaaskanker (bij urologie)</li>
              <li><strong>Medicijnklasse</strong> — bijv. IO/ICI, TKI, ARPI</li>
              <li><strong>Weergavemodus</strong> — Alles, Alleen combinaties, Alleen individueel</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">Medicijnkaarten</h4>
            <p>Elke kaart toont:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li>Generieke naam en merknaam</li>
              <li>Medicijnklasse (gekleurde badge)</li>
              <li>RIZIV-status (✓ groen of ✗ rood)</li>
              <li>Goedgekeurde indicaties</li>
              <li>Toedieningsweg</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              Favorieten
            </h4>
            <p>
              Klik op het <IconLabel icon={Star} label="ster-icoon" className="text-yellow-500" /> op een medicijnkaart 
              om het als favoriet te markeren. Favorieten verschijnen in een speciale sectie bovenaan het overzicht.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                📤 <strong>Export:</strong> U kunt al uw favorieten exporteren als één PDF via de 
                knop "Exporteer favorieten". U kunt kiezen of dosering en bijwerkingen worden opgenomen.
              </p>
            </div>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400 fill-orange-400" />
              Meest gebruikt
            </h4>
            <p>
              Klik op het <IconLabel icon={Zap} label="bliksem-icoon" className="text-orange-400" /> om een medicijn 
              als "meest gebruikt" te markeren (max. 8). Deze verschijnen als snelkoppelingen op de startpagina.
            </p>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <GripVertical className="h-4 w-4" />
              Volgorde aanpassen
            </h4>
            <p>
              Via de knop <strong>"Volgorde aanpassen"</strong> in de balk kunt u de medicijnen 
              herordenen door ze te slepen (drag-and-drop). Uw persoonlijke volgorde wordt opgeslagen 
              en blijft behouden op alle apparaten.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                🔄 <strong>Reset:</strong> U kunt uw aangepaste volgorde resetten naar de standaardvolgorde 
                via de knop "Standaard herstellen" in de bewerkingsmodus.
              </p>
            </div>
          </Section>

          {/* 4. MEDICIJNDETAILPAGINA */}
          <Section icon={FileText} title="4. Medicijndetailpagina">
            <p>Klik op een medicijnkaart om de volledige informatie te bekijken.</p>
            
            <h4 className="font-semibold mt-4 mb-2">Overzicht</h4>
            <p>De detailpagina bevat verschillende tabbladen:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li><strong>Overzicht</strong> — Indicaties, werkingsmechanisme, RIZIV-status, toedieningsweg</li>
              <li><strong>Dosering</strong> — Doseringsinformatie, cyclusduur, schema's</li>
              <li><strong>Bijwerkingen</strong> — Veelvoorkomende en ernstige bijwerkingen</li>
              <li><strong>Contra-indicaties</strong> — Wanneer het medicijn niet mag worden gebruikt</li>
              <li><strong>Monitoring</strong> — Vereiste laboratoriumonderzoeken en controles</li>
              <li><strong>Referenties</strong> — Links naar externe bronnen en studies</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Patiëntenfolder
            </h4>
            <p>
              Vanuit de detailpagina kunt u een <strong>patiëntenfolder</strong> genereren — 
              een afdrukbaar informatieblad voor de patiënt.
            </p>
            <Step n={1}>Klik op <strong>"Patiëntenfolder"</strong>.</Step>
            <Step n={2}>Selecteer de <strong>behandelend arts</strong> en <strong>contactverpleegkundige</strong>.</Step>
            <Step n={3}>Kies de <strong>taal</strong> van de folder (NL/FR/DE/EN).</Step>
            <Step n={4}>
              Kies de <strong>modus</strong>: 
              <em> Compact</em> (beknopt, 1-2 pagina's) of <em>Uitgebreid</em> (volledige informatie).
            </Step>
            <Step n={5}>Optioneel: voeg <strong>premedicatie</strong> toe en pas opties aan.</Step>
            <Step n={6}>Klik op <strong>"Genereer folder"</strong> om de preview te zien.</Step>
            <Step n={7}>
              <strong>Afdrukken</strong> via de printknop of <strong>downloaden</strong> als PDF.
            </Step>
            <div className="bg-muted/50 rounded-lg p-3 mt-3">
              <p className="text-sm text-muted-foreground">
                🏥 De folder bevat automatisch het logo en de huisstijlkleur van uw ziekenhuis, 
                evenals de contactgegevens van de geselecteerde medewerkers.
              </p>
            </div>
          </Section>

          {/* 5. FAVORIETEN & MEEST GEBRUIKT */}
          <Section icon={Star} title="5. Favorieten & Meest gebruikt">
            <p>OncoInfo biedt twee manieren om snel toegang te krijgen tot uw veelgebruikte medicijnen:</p>
            
            <div className="grid sm:grid-cols-2 gap-4 my-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <h4 className="font-semibold">Favorieten</h4>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Onbeperkt aantal</li>
                  <li>• Verschijnen als aparte sectie op overzichtspagina</li>
                  <li>• Exporteerbaar als gebundelde PDF</li>
                  <li>• Markeren via ster-icoon (⭐)</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-orange-400 fill-orange-400" />
                  <h4 className="font-semibold">Meest gebruikt</h4>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Maximaal 8 stuks</li>
                  <li>• Verschijnen als snelkoppelingen op startpagina</li>
                  <li>• Snelle navigatie met één klik</li>
                  <li>• Markeren via bliksem-icoon (⚡)</li>
                </ul>
              </div>
            </div>
            <p className="text-sm">
              Beide worden opgeslagen op uw account en zijn beschikbaar op al uw apparaten.
            </p>
          </Section>

          {/* 6. GEBRUIKERSROLLEN */}
          <Section icon={Shield} title="6. Gebruikersrollen & Rechten">
            <p>OncoInfo kent verschillende rollen met elk hun eigen rechten:</p>
            
            <div className="space-y-3 my-4">
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className="bg-gray-100 text-gray-700 border-gray-300 gap-1 shrink-0">
                  <Eye className="h-3 w-3" />
                  Viewer
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Kan medicijnen bekijken, favorieten beheren, patiëntenfolders genereren en de volgorde aanpassen.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 gap-1 shrink-0">
                  <Stethoscope className="h-3 w-3" />
                  Arts
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Dezelfde rechten als Viewer. Naam verschijnt automatisch als behandelend arts bij patiëntenfolders.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className="bg-green-100 text-green-700 border-green-300 gap-1 shrink-0">
                  <FlaskConical className="h-3 w-3" />
                  Apotheker
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Kan daarnaast medicijninformatie bewerken en patiëntenfolders aanpassen via het beheerpaneel.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className="bg-purple-100 text-purple-700 border-purple-300 gap-1 shrink-0">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Volledige toegang tot het beheerpaneel: gebruikersbeheer, activiteitenlog, medicijnen toevoegen/bewerken 
                  en de globale volgorde aanpassen.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Uw huidige rol is zichtbaar in de navigatiebalk naast uw naam. 
              Hover over de badge voor een overzicht van uw rechten.
            </p>
          </Section>

          {/* 7. ADMIN PANEEL */}
          <Section icon={Settings2} title="7. Beheerpaneel (Admin/Apotheker)">
            <p>
              Admins en apothekers hebben toegang tot het beheerpaneel via het 
              gebruikersmenu (klik op uw profielicoon → <strong>Beheer</strong>).
            </p>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gebruikersbeheer (alleen Admin)
            </h4>
            <p>Beheer de gebruikers van uw ziekenhuis:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li>Nieuwe gebruikers aanmaken (met automatische welkomstmail)</li>
              <li>Rollen en rechten toewijzen</li>
              <li>Wachtwoorden resetten</li>
              <li>Gebruikers activeren/deactiveren</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">Activiteitenlog</h4>
            <p>
              Bekijk een overzicht van alle wijzigingen aan medicijnen, patiëntenfolders en gebruikers 
              binnen uw ziekenhuis.
            </p>

            <h4 className="font-semibold mt-4 mb-2">Therapie toevoegen</h4>
            <p>
              Zoek en importeer nieuwe therapieën/behandelschema's via de knop "Therapie toevoegen". 
              Het systeem doorzoekt medische databases en voegt het medicijn toe aan uw bibliotheek.
            </p>

            <h4 className="font-semibold mt-4 mb-2">Automatische updates (Beta)</h4>
            <p>
              Indien geactiveerd voor uw ziekenhuis, kan het systeem automatisch nieuwe therapieën 
              en updates detecteren op basis van wetenschappelijke publicaties.
            </p>
          </Section>

          {/* 8. MEERTALIGHEID */}
          <Section icon={LogIn} title="8. Taalinstellingen">
            <p>OncoInfo ondersteunt vier talen:</p>
            <div className="flex flex-wrap gap-2 my-3">
              <Badge variant="outline">🇳🇱 Nederlands</Badge>
              <Badge variant="outline">🇫🇷 Français</Badge>
              <Badge variant="outline">🇩🇪 Deutsch</Badge>
              <Badge variant="outline">🇬🇧 English</Badge>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>De <strong>interfacetaal</strong> wordt automatisch ingesteld op basis van de standaardtaal van uw ziekenhuis.</li>
              <li>U kunt de taal wijzigen op de <strong>inlogpagina</strong> (vlaggetjes onderaan) of via het gebruikersmenu (super-admins).</li>
              <li>De <strong>patiëntenfolder</strong> kan in een andere taal worden gegenereerd dan de interfacetaal.</li>
              <li>Medische termen worden automatisch vertaald waar mogelijk.</li>
            </ul>
          </Section>

          {/* 9. MULTI-DEVICE */}
          <Section icon={Eye} title="9. Gebruik op meerdere apparaten">
            <p>
              OncoInfo werkt volledig in de browser en is geoptimaliseerd voor desktop, tablet en smartphone. 
              U kunt met hetzelfde account tegelijkertijd op meerdere apparaten inloggen.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li>Uw favorieten, meest gebruikte schema's en aangepaste volgorde worden gesynchroniseerd via uw account.</li>
              <li>Wijzigingen op het ene apparaat zijn na een refresh zichtbaar op het andere apparaat.</li>
              <li>De app is geïnstalleerd als Progressive Web App (PWA) — u kunt hem "toevoegen aan beginscherm" op uw smartphone.</li>
            </ul>
          </Section>

          {/* 10. TIPS */}
          <Section icon={Zap} title="10. Tips & veelgestelde vragen">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Hoe wijzig ik mijn wachtwoord?</h4>
                <p className="text-sm text-muted-foreground">
                  Na uw eerste login wordt u automatisch gevraagd om uw wachtwoord te wijzigen. 
                  Daarna kan uw admin het wachtwoord resetten indien nodig.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Ik zie bepaalde specialismen niet?</h4>
                <p className="text-sm text-muted-foreground">
                  Uw ziekenhuis heeft mogelijk niet alle disciplines geactiveerd. 
                  Neem contact op met uw admin om disciplines in te schakelen.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Hoe druk ik een patiëntenfolder af?</h4>
                <p className="text-sm text-muted-foreground">
                  Ga naar een medicijndetailpagina → Patiëntenfolder → Selecteer arts en verpleegkundige → 
                  Genereer → Gebruik de afdruk- of downloadknop.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Kan ik de app op mijn telefoon installeren?</h4>
                <p className="text-sm text-muted-foreground">
                  Ja! Open OncoInfo in uw mobiele browser en kies "Toevoegen aan beginscherm" 
                  (via het deelmenu op iOS of het browsermenu op Android).
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Worden mijn favorieten bewaard als ik uitlog?</h4>
                <p className="text-sm text-muted-foreground">
                  Ja. Favorieten en meest gebruikte schema's worden opgeslagen op uw account 
                  en zijn beschikbaar wanneer u opnieuw inlogt, ook op een ander apparaat.
                </p>
              </div>
            </div>
          </Section>

          {/* DISCLAIMER */}
          <div className="border border-destructive/30 rounded-md bg-destructive/5 p-4 mt-6">
            <p className="text-xs text-destructive font-semibold mb-1">⚠ Belangrijke mededeling</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              OncoInfo is uitsluitend bedoeld als informatief hulpmiddel en is geen medisch hulpmiddel 
              (MDR 2017/745). De inhoud kan fouten bevatten en mag niet als enige basis voor klinische 
              beslissingen dienen. Raadpleeg altijd uw behandelend arts of apotheker.
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            © Michiel Strijbos — Versie februari 2026
          </p>
        </div>
      </div>
    </Layout>
  );
}
