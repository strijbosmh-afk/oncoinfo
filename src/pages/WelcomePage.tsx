import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TIMER_SECONDS = 4;

const WelcomePage = () => {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/home');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleStart = () => {
    navigate('/home');
  };

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

        <Button size="lg" className="px-10 text-lg h-12" onClick={handleStart}>
          Start
        </Button>

        <p className="text-sm text-muted-foreground">
          Automatisch verder over {secondsLeft} seconde{secondsLeft !== 1 ? 'n' : ''}…
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;
