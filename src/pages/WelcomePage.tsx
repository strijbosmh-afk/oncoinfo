import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useHospital } from '@/contexts/HospitalContext';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hospital } = useHospital();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 max-w-md text-center animate-in fade-in duration-700">
        {hospital?.logo_url ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <img
              src={hospital.logo_url}
              alt={hospital.name}
              className="h-24 w-auto"
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <img
              src="/images/logo-rzt.png"
              alt="RZ Tienen logo"
              className="h-24 w-auto"
            />
          </div>
        )}

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-primary">
            {t('welcome.title')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('welcome.description')}
          </p>
        </div>

        <Button size="lg" className="px-10 text-lg h-12" onClick={() => navigate('/home')}>
          {t('welcome.start')}
        </Button>
      </div>
    </div>
  );
};

export default WelcomePage;