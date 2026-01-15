import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useTrialCounts } from '@/hooks/useTrials';
import { Skeleton } from '@/components/ui/skeleton';

const diseaseAreas = [
  {
    name: 'Prostaatkanker',
    key: 'Prostate Cancer',
    color: 'bg-[hsl(199,89%,32%)]',
    description: 'mCRPC, mHSPC, gelokaliseerd'
  },
  {
    name: 'Blaaskanker',
    key: 'Bladder Cancer',
    color: 'bg-[hsl(174,62%,38%)]',
    description: 'NMIBC, MIBC, gemetastaseerd'
  },
  {
    name: 'Niercelcarcinoom',
    key: 'Renal Cell Carcinoma',
    color: 'bg-[hsl(25,95%,53%)]',
    description: 'Heldercellig, niet-heldercellig'
  },
  {
    name: 'Testiskanker',
    key: 'Testicular Cancer',
    color: 'bg-[hsl(262,83%,58%)]',
    description: 'KCT, seminoom, non-seminoom'
  },
  {
    name: 'Peniskanker',
    key: 'Penile Cancer',
    color: 'bg-[hsl(340,75%,55%)]',
    description: 'Plaveiselcelcarcinoom'
  }
];

export function DiseaseAreaSection() {
  const { data: counts, isLoading } = useTrialCounts();

  return (
    <section className="py-16">
      <div className="container">
        <h2 className="text-2xl font-bold text-center mb-4">
          Zoeken op Ziektegebied
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
          Bekijk klinische studies georganiseerd per urologisch kankertype
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {diseaseAreas.map((area) => (
            <Link 
              key={area.key} 
              to={`/trials?disease=${encodeURIComponent(area.key)}`}
            >
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden">
                <div className={`h-2 ${area.color}`} />
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-1">{area.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {area.description}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <span className="text-sm font-medium text-primary">
                      {counts?.[area.key] || 0} studies
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
