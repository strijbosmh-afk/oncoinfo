import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t bg-card py-8 mt-auto">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              GU
            </div>
            <span className="text-sm text-muted-foreground">
              GU Trials Hub © {new Date().getFullYear()}
            </span>
          </div>
          
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/trials" className="hover:text-foreground transition-colors">
              Browse Trials
            </Link>
            <Link to="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground max-w-xs text-center md:text-right">
            Clinical trial information is for educational purposes only. 
            Consult medical professionals for treatment decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}