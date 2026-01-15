import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { INTERVENTION_CLASSES } from '@/types/trial';

const interventionDetails: Record<string, { description: string; examples: string[] }> = {
  'IO/ICI': {
    description: 'Immuuncheckpointremmers',
    examples: ['pembrolizumab', 'nivolumab', 'atezolizumab', 'avelumab']
  },
  'PARPi': {
    description: 'PARP-remmers',
    examples: ['olaparib', 'rucaparib', 'niraparib', 'talazoparib']
  },
  'ARPI': {
    description: 'Androgeenreceptor pathway remmers',
    examples: ['enzalutamide', 'apalutamide', 'darolutamide', 'abiraterone']
  },
  'Chemotherapy': {
    description: 'Cytotoxische middelen',
    examples: ['docetaxel', 'cabazitaxel', 'gemcitabine', 'cisplatine']
  },
  'Radioligand Therapy': {
    description: 'Doelgerichte radiofarmacie',
    examples: ['Lu-177 PSMA-617', 'Ra-223', 'Ac-225 PSMA']
  },
  'Radiation Therapy': {
    description: 'Uitwendige bestraling en brachytherapie',
    examples: ['SBRT', 'IMRT', 'protontherapie', 'brachytherapie']
  },
  'Surgery': {
    description: 'Chirurgische interventies',
    examples: ['prostatectomie', 'cystectomie', 'nefrectomie']
  },
  'Targeted Therapy': {
    description: 'Moleculair doelgerichte middelen',
    examples: ['cabozantinib', 'lenvatinib', 'axitinib', 'sunitinib']
  },
  'ADC': {
    description: 'Antilichaam-geneesmiddel conjugaten',
    examples: ['enfortumab vedotin', 'sacituzumab govitecan']
  }
};

export function InterventionSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <h2 className="text-2xl font-bold text-center mb-4">
          Zoeken op Interventieklasse
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
          Vind studies op behandelmodaliteit of specifieke geneesmiddelklassen
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTERVENTION_CLASSES.map((intervention) => {
            const details = interventionDetails[intervention];
            return (
              <Link
                key={intervention}
                to={`/trials?intervention=${encodeURIComponent(intervention)}`}
                className="group block p-4 bg-card rounded-lg border hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {intervention}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {details?.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {details?.examples.slice(0, 3).map((example) => (
                    <Badge key={example} variant="outline" className="text-xs">
                      {example}
                    </Badge>
                  ))}
                  {details?.examples.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{details.examples.length - 3}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
