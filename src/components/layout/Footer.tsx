import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-card py-8 mt-auto">
      <div className="container space-y-6">
        {/* Disclaimer banner */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-destructive">
                {t('footer.disclaimerTitle')}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('footer.disclaimerFull')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              OI
            </div>
            <span className="text-sm text-muted-foreground">
              OncoInfo © {new Date().getFullYear()}
            </span>
          </div>
          
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/drugs" className="hover:text-foreground transition-colors">
              {t('footer.drugs')}
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              {t('footer.contact')}
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground max-w-xs text-center md:text-right">
            {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
}