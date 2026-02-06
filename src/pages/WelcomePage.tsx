import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 max-w-md text-center animate-in fade-in duration-700">
        <img
          src="/images/logo-rzt.png"
          alt="RZ Tienen logo"
          className="h-24 w-auto"
        />

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-primary">
            Welkom bij OncoInfo
          </h1>
          <p className="text-muted-foreground text-lg">
            Uw oncologisch geneesmiddelenoverzicht van het Regionaal Ziekenhuis Tienen.
          </p>
        </div>

        <Button size="lg" className="px-10 text-lg h-12" onClick={() => navigate('/home')}>
          Start
        </Button>
      </div>
    </div>
  );
};

export default WelcomePage;
