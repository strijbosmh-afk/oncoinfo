import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, LogIn, Home, Search, Star, Zap, Layers, Pill, 
  FileText, GripVertical, Filter, Users, Shield, Download, 
  Printer, Settings2, Heart, Baby, Stethoscope, Eye, FlaskConical,
  ChevronDown, Globe, Lock, Copy, Check, Loader2, Bot, Tags, Sparkles, Megaphone
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

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

function IconLabel({ icon: Icon, label, className = '' }: { icon: React.ElementType; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${className}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

function Html({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'br'],
    ALLOWED_ATTR: [],
  });
  return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

export default function UserManualPage() {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!contentRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      // Open all collapsible sections before capture
      const triggers = contentRef.current.querySelectorAll('[data-state="closed"]');
      triggers.forEach((el) => {
        if (el instanceof HTMLElement) el.click();
      });
      // Wait for animations to complete
      await new Promise((r) => setTimeout(r, 600));

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pdfW - margin * 2;
      const usableH = pdfH - margin * 2;

      // Capture each section (Card) separately for clean page breaks
      const sections = contentRef.current.querySelectorAll(':scope > *');
      let isFirstPage = true;
      let currentY = margin;

      for (const section of Array.from(sections)) {
        const el = section as HTMLElement;
        if (el.offsetHeight === 0) continue;

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 900,
        });

        const imgW = usableW;
        const imgH = (canvas.height * imgW) / canvas.width;
        const imgData = canvas.toDataURL('image/png');

        // If this section fits on the current page, add it there
        if (!isFirstPage && currentY + imgH > pdfH - margin) {
          // Section doesn't fit — start a new page
          pdf.addPage();
          currentY = margin;
        }

        if (isFirstPage) {
          isFirstPage = false;
        }

        // If section is taller than one page, split it across pages
        if (imgH > usableH) {
          let srcY = 0;
          const totalSrcH = canvas.height;
          const pxPerMm = canvas.height / imgH;

          while (srcY < totalSrcH) {
            if (currentY !== margin) {
              pdf.addPage();
              currentY = margin;
            }

            const remainingPageMm = usableH;
            const sliceHPx = Math.min(remainingPageMm * pxPerMm, totalSrcH - srcY);
            const sliceHMm = sliceHPx / pxPerMm;

            // Create a sliced canvas
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHPx;
            const ctx = sliceCanvas.getContext('2d')!;
            ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);

            const sliceData = sliceCanvas.toDataURL('image/png');
            pdf.addImage(sliceData, 'PNG', margin, currentY, imgW, sliceHMm);
            currentY += sliceHMm;
            srcY += sliceHPx;
          }
        } else {
          pdf.addImage(imgData, 'PNG', margin, currentY, imgW, imgH);
          currentY += imgH + 3; // small gap between sections
        }
      }

      pdf.save('OncoInfo-Handleiding.pdf');
      toast.success(t('manual.pdfSuccess', 'PDF gedownload'));
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error(t('manual.pdfError', 'PDF generatie mislukt'));
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, t]);

  return (
    <Layout>
      <div className="container max-w-4xl py-6 sm:py-10">
        <Link to="/home">
          <Button variant="ghost" size="sm" className="mb-4 gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            {t('manual.backToHome')}
          </Button>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('manual.title')}</h1>
            <p className="text-muted-foreground text-lg">{t('manual.subtitle')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t('manual.downloadPdf', 'Download PDF')}
          </Button>
        </div>

        <div ref={contentRef} className="space-y-4">

          {/* 1. LOGIN */}
          <Section icon={LogIn} title={t('manual.s1Title')} defaultOpen={true}>
            <p>{t('manual.s1Intro')}</p>
            <Step n={1}><Html html={t('manual.s1Step1')} /></Step>
            <Step n={2}><Html html={t('manual.s1Step2')} /></Step>
            <Step n={3}><Html html={t('manual.s1Step3')} /></Step>
            <Step n={4}><Html html={t('manual.s1Step4')} /></Step>
            <div className="bg-muted/50 rounded-lg p-3 mt-3">
              <p className="text-sm text-muted-foreground">
                💡 <strong>{t('manual.tip')}</strong> {t('manual.s1Tip')}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                🔑 <strong>{t('manual.firstLogin')}</strong> {t('manual.s1FirstLogin')}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                🔒 {t('manual.s1ForgotPassword')}
              </p>
            </div>
          </Section>

          {/* 2. HOME */}
          <Section icon={Home} title={t('manual.s2Title')}>
            <p>{t('manual.s2Intro')}</p>
            
            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400 fill-orange-400" />
              {t('manual.s2MostUsedTitle')}
            </h4>
            <p>{t('manual.s2MostUsedDesc')}</p>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s2SpecialtiesTitle')}</h4>
            <p>{t('manual.s2SpecialtiesDesc')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
              {[
                { icon: Heart, label: t('manual.breastCancer'), color: 'text-pink-500' },
                { icon: Stethoscope, label: t('manual.urology'), color: 'text-blue-500' },
                { icon: Baby, label: t('manual.gynecology'), color: 'text-purple-500' },
                { icon: Pill, label: t('manual.andMore'), color: 'text-muted-foreground' },
              ].map(({ icon: I, label, color }) => (
                <div key={label} className="flex items-center gap-2 text-sm p-2 rounded-lg border">
                  <I className={`h-4 w-4 ${color}`} />
                  {label}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              🔒 {t('manual.s2SpecialtiesLock')}
            </p>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              {t('manual.s2SearchTitle')}
            </h4>
            <p>{t('manual.s2SearchDesc')}</p>
          </Section>

          {/* 3. DRUG OVERVIEW */}
          <Section icon={Pill} title={t('manual.s3Title')}>
            <p>{t('manual.s3Intro')}</p>
            
            <div className="flex gap-3 my-3">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
                <Layers className="h-3.5 w-3.5" />
                {t('manual.s3CombLabel')}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Pill className="h-3.5 w-3.5" />
                {t('manual.s3IndLabel')}
              </Badge>
            </div>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t('manual.s3FiltersTitle')}
            </h4>
            <p>{t('manual.s3FiltersDesc')}</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li><Html html={t('manual.s3FilterSubtype')} /></li>
              <li><Html html={t('manual.s3FilterStage')} /></li>
              <li><Html html={t('manual.s3FilterArea')} /></li>
              <li><Html html={t('manual.s3FilterClass')} /></li>
              <li><Html html={t('manual.s3FilterMode')} /></li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s3CardsTitle')}</h4>
            <p>{t('manual.s3CardsDesc')}</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li>{t('manual.s3Card1')}</li>
              <li>{t('manual.s3Card2')}</li>
              <li>{t('manual.s3Card3')}</li>
              <li>{t('manual.s3Card4')}</li>
              <li>{t('manual.s3Card5')}</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              {t('manual.s3FavTitle')}
            </h4>
            <p>{t('manual.s3FavDesc')}</p>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                📤 <Html html={t('manual.s3FavExport')} />
              </p>
            </div>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400 fill-orange-400" />
              {t('manual.s3MostUsedTitle')}
            </h4>
            <p>{t('manual.s3MostUsedDesc')}</p>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <GripVertical className="h-4 w-4" />
              {t('manual.s3OrderTitle')}
            </h4>
            <p><Html html={t('manual.s3OrderDesc')} /></p>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                🔄 <Html html={t('manual.s3OrderReset')} />
              </p>
            </div>
          </Section>

          {/* 4. DRUG DETAIL */}
          <Section icon={FileText} title={t('manual.s4Title')}>
            <p>{t('manual.s4Intro')}</p>
            
            <h4 className="font-semibold mt-4 mb-2">{t('manual.s4OverviewTitle')}</h4>
            <p>{t('manual.s4OverviewDesc')}</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li><Html html={t('manual.s4Tab1')} /></li>
              <li><Html html={t('manual.s4Tab2')} /></li>
              <li><Html html={t('manual.s4Tab3')} /></li>
              <li><Html html={t('manual.s4Tab4')} /></li>
              <li><Html html={t('manual.s4Tab5')} /></li>
              <li><Html html={t('manual.s4Tab6')} /></li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Printer className="h-4 w-4" />
              {t('manual.s4FolderTitle')}
            </h4>
            <p><Html html={t('manual.s4FolderDesc')} /></p>
            <Step n={1}><Html html={t('manual.s4FolderStep1')} /></Step>
            <Step n={2}><Html html={t('manual.s4FolderStep2')} /></Step>
            <Step n={3}><Html html={t('manual.s4FolderStep3')} /></Step>
            <Step n={4}><Html html={t('manual.s4FolderStep4')} /></Step>
            <Step n={5}><Html html={t('manual.s4FolderStep5')} /></Step>
            <Step n={6}><Html html={t('manual.s4FolderStep6')} /></Step>
            <Step n={7}><Html html={t('manual.s4FolderStep7')} /></Step>
            <div className="bg-muted/50 rounded-lg p-3 mt-3">
              <p className="text-sm text-muted-foreground">
                🏥 {t('manual.s4FolderTip')}
              </p>
            </div>
          </Section>

          {/* 5. FAVORITES & MOST USED */}
          <Section icon={Star} title={t('manual.s5Title')}>
            <p>{t('manual.s5Intro')}</p>
            
            <div className="grid sm:grid-cols-2 gap-4 my-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <h4 className="font-semibold">{t('manual.s5FavTitle')}</h4>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• {t('manual.s5Fav1')}</li>
                  <li>• {t('manual.s5Fav2')}</li>
                  <li>• {t('manual.s5Fav3')}</li>
                  <li>• {t('manual.s5Fav4')}</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-orange-400 fill-orange-400" />
                  <h4 className="font-semibold">{t('manual.s5MostTitle')}</h4>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• {t('manual.s5Most1')}</li>
                  <li>• {t('manual.s5Most2')}</li>
                  <li>• {t('manual.s5Most3')}</li>
                  <li>• {t('manual.s5Most4')}</li>
                </ul>
              </div>
            </div>
            <p className="text-sm">{t('manual.s5Both')}</p>
          </Section>

          {/* 6. ROLES */}
          <Section icon={Shield} title={t('manual.s6Title')}>
            <p>{t('manual.s6Intro')}</p>
            
            <div className="space-y-3 my-4">
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className="bg-gray-100 text-gray-700 border-gray-300 gap-1 shrink-0">
                  <Eye className="h-3 w-3" />
                  {t('manual.s6Viewer')}
                </Badge>
                <p className="text-sm text-muted-foreground">{t('manual.s6ViewerDesc')}</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 gap-1 shrink-0">
                  <Stethoscope className="h-3 w-3" />
                  {t('manual.s6Doctor')}
                </Badge>
                <p className="text-sm text-muted-foreground">{t('manual.s6DoctorDesc')}</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className="bg-green-100 text-green-700 border-green-300 gap-1 shrink-0">
                  <FlaskConical className="h-3 w-3" />
                  {t('manual.s6Pharmacist')}
                </Badge>
                <p className="text-sm text-muted-foreground">{t('manual.s6PharmacistDesc')}</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className="bg-purple-100 text-purple-700 border-purple-300 gap-1 shrink-0">
                  <Shield className="h-3 w-3" />
                  {t('manual.s6Admin')}
                </Badge>
                <p className="text-sm text-muted-foreground">{t('manual.s6AdminDesc')}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t('manual.s6RoleVisible')}</p>

            <h4 className="font-semibold mt-6 mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('manual.s6PermissionsTitle')}
            </h4>
            <p className="text-sm mb-3">{t('manual.s6PermissionsIntro')}</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><Html html={t('manual.s6PermAdd')} /></li>
              <li><Html html={t('manual.s6PermModify')} /></li>
              <li><Html html={t('manual.s6PermDelete')} /></li>
              <li><Html html={t('manual.s6PermPhysician')} /></li>
            </ul>
          </Section>

          {/* 7. ADMIN */}
          <Section icon={Settings2} title={t('manual.s7Title')}>
            <p><Html html={t('manual.s7Intro')} /></p>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('manual.s7UsersTitle')}
            </h4>
            <p>{t('manual.s7UsersDesc')}</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li>{t('manual.s7Users1')}</li>
              <li>{t('manual.s7Users2')}</li>
              <li>{t('manual.s7Users3')}</li>
              <li>{t('manual.s7Users4')}</li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s7AuditTitle')}</h4>
            <p>{t('manual.s7AuditDesc')}</p>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s7AddTitle')}</h4>
            <p>{t('manual.s7AddDesc')}</p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mt-2">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {t('manual.s7AddPermission')}
              </p>
            </div>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Bot className="h-4 w-4" />
              {t('manual.s7AITitle')}
            </h4>
            <p>{t('manual.s7AIDesc')}</p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mt-2">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {t('manual.s7AIPermission')}
              </p>
            </div>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t('manual.s7AIEnrichTitle')}
            </h4>
            <p>{t('manual.s7AIEnrichDesc')}</p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mt-2">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {t('manual.s7AIEnrichPermission')}
              </p>
            </div>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Tags className="h-4 w-4" />
              {t('manual.s7FilterTagsTitle')}
            </h4>
            <p>{t('manual.s7FilterTagsDesc')}</p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mt-2">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {t('manual.s7FilterTagsPermission')}
              </p>
            </div>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s7AutoTitle')}</h4>
            <p>{t('manual.s7AutoDesc')}</p>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              {t('manual.s7UpdatesTitle')}
            </h4>
            <p>{t('manual.s7UpdatesDesc')}</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li><Html html={t('manual.s7Updates1')} /></li>
              <li><Html html={t('manual.s7Updates2')} /></li>
              <li><Html html={t('manual.s7Updates3')} /></li>
            </ul>
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                ✍️ <strong>{t('manual.tip')}</strong> {t('manual.s7UpdatesTip')}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mt-2">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {t('manual.s7UpdatesPermission')}
              </p>
            </div>
          </Section>

          {/* 8. LANGUAGE */}
          <Section icon={LogIn} title={t('manual.s8Title')}>
            <p>{t('manual.s8Intro')}</p>
            <div className="flex flex-wrap gap-2 my-3">
              <Badge variant="outline">🇳🇱 Nederlands</Badge>
              <Badge variant="outline">🇫🇷 Français</Badge>
              <Badge variant="outline">🇩🇪 Deutsch</Badge>
              <Badge variant="outline">🇬🇧 English</Badge>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><Html html={t('manual.s8Lang1')} /></li>
              <li><Html html={t('manual.s8Lang2')} /></li>
              <li><Html html={t('manual.s8Lang3')} /></li>
              <li>{t('manual.s8Lang4')}</li>
            </ul>
          </Section>

          {/* 9. MULTI-DEVICE */}
          <Section icon={Eye} title={t('manual.s9Title')}>
            <p>{t('manual.s9Intro')}</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li>{t('manual.s9Item1')}</li>
              <li>{t('manual.s9Item2')}</li>
              <li>{t('manual.s9Item3')}</li>
            </ul>
          </Section>

          {/* 10. TIPS */}
          <Section icon={Zap} title={t('manual.s10Title')}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">{t('manual.s10Q1')}</h4>
                <p className="text-sm text-muted-foreground">{t('manual.s10A1')}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">{t('manual.s10Q2')}</h4>
                <p className="text-sm text-muted-foreground">{t('manual.s10A2')}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">{t('manual.s10Q3')}</h4>
                <p className="text-sm text-muted-foreground">{t('manual.s10A3')}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">{t('manual.s10Q4')}</h4>
                <p className="text-sm text-muted-foreground">{t('manual.s10A4')}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">{t('manual.s10Q5')}</h4>
                <p className="text-sm text-muted-foreground">{t('manual.s10A5')}</p>
              </div>
            </div>
          </Section>

          {/* 11. API DOCUMENTATION */}
          <Section icon={Globe} title={t('manual.s11Title')}>
            <p>{t('manual.s11Intro')}</p>

            <h4 className="font-semibold mt-4 mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('manual.s11AuthTitle')}
            </h4>
            <p className="text-sm">{t('manual.s11AuthDesc')}</p>
            <div className="bg-muted/50 rounded-lg p-3 mt-2 font-mono text-xs">
              X-API-Key: YOUR_API_KEY
            </div>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s11EndpointsTitle')}</h4>
            <div className="space-y-3 mt-2">
              {[
                { method: 'GET', path: '/public-api/drugs', desc: t('manual.s11Ep1') },
                { method: 'GET', path: '/public-api/drugs/:id', desc: t('manual.s11Ep2') },
                { method: 'GET', path: '/public-api/drugs/:id/leaflet', desc: t('manual.s11Ep3') },
                { method: 'GET', path: '/public-api/search?q=...', desc: t('manual.s11Ep4') },
              ].map((ep) => (
                <div key={ep.path} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                      {ep.method}
                    </Badge>
                    <code className="text-xs font-mono">{ep.path}</code>
                  </div>
                  <p className="text-sm text-muted-foreground">{ep.desc}</p>
                </div>
              ))}
            </div>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s11ParamsTitle')}</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><Html html={t('manual.s11Param1')} /></li>
              <li><Html html={t('manual.s11Param2')} /></li>
              <li><Html html={t('manual.s11Param3')} /></li>
              <li><Html html={t('manual.s11Param4')} /></li>
              <li><Html html={t('manual.s11Param5')} /></li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s11ExampleTitle')}</h4>
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
{`curl -H "X-API-Key: YOUR_API_KEY" \\
  "https://ynuggqeumqzwwuffrnnv.supabase.co/functions/v1/public-api/drugs?q=pembrolizumab"`}
            </div>

            <h4 className="font-semibold mt-4 mb-2">{t('manual.s11RateLimitTitle')}</h4>
            <p className="text-sm">{t('manual.s11RateLimitDesc')}</p>

            <div className="bg-muted/50 rounded-lg p-3 mt-3">
              <p className="text-sm text-muted-foreground">
                🤖 <strong>{t('manual.tip')}</strong> {t('manual.s11Tip')}
              </p>
            </div>
          </Section>

          {/* DISCLAIMER */}
          <div className="border border-destructive/30 rounded-md bg-destructive/5 p-4 mt-6">
            <p className="text-xs text-destructive font-semibold mb-1">{t('manual.disclaimerTitle')}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('manual.disclaimerText')}</p>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">{t('manual.copyright')}</p>
        </div>
      </div>
    </Layout>
  );
}
