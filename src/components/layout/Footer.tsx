import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-card py-8 mt-auto">
      <div className="container">
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