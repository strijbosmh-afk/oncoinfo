import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t bg-card py-8 mt-auto">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              UI
            </div>
            <span className="text-sm text-muted-foreground">
              UroInfo © {new Date().getFullYear()}
            </span>
          </div>
          
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/trials" className="hover:text-foreground transition-colors">
              Bekijk Studies
            </Link>
            <Link to="/about" className="hover:text-foreground transition-colors">
              Over Ons
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground max-w-xs text-center md:text-right">
            Informatie over klinische studies is uitsluitend bedoeld voor educatieve doeleinden. 
            Raadpleeg medische professionals voor behandelbeslissingen.
          </p>
        </div>
      </div>
    </footer>
  );
}
