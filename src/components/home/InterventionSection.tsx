import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { INTERVENTION_CLASSES } from '@/types/trial';

const interventionDetails: Record<string, { description: string; examples: string[] }> = {
  'IO/ICI': {
    description: 'Immune checkpoint inhibitors',
    examples: ['pembrolizumab', 'nivolumab', 'atezolizumab', 'avelumab']
  },
  'PARPi': {
    description: 'PARP inhibitors',
    examples: ['olaparib', 'rucaparib', 'niraparib', 'talazoparib']
  },
  'ARPI': {
    description: 'Androgen receptor pathway inhibitors',
    examples: ['enzalutamide', 'apalutamide', 'darolutamide', 'abiraterone']
  },
  'Chemotherapy': {
    description: 'Cytotoxic agents',
    examples: ['docetaxel', 'cabazitaxel', 'gemcitabine', 'cisplatin']
  },
  'Radioligand Therapy': {
    description: 'Targeted radiopharmaceuticals',
    examples: ['Lu-177 PSMA-617', 'Ra-223', 'Ac-225 PSMA']
  },
  'Radiation Therapy': {
    description: 'External beam and brachytherapy',
    examples: ['SBRT', 'IMRT', 'proton therapy', 'brachytherapy']
  },
  'Surgery': {
    description: 'Surgical interventions',
    examples: ['prostatectomy', 'cystectomy', 'nephrectomy']
  },
  'Targeted Therapy': {
    description: 'Molecularly targeted agents',
    examples: ['cabozantinib', 'lenvatinib', 'axitinib', 'sunitinib']
  },
  'ADC': {
    description: 'Antibody-drug conjugates',
    examples: ['enfortumab vedotin', 'sacituzumab govitecan']
  }
};

export function InterventionSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <h2 className="text-2xl font-bold text-center mb-4">
          Browse by Intervention Class
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
          Find trials by treatment modality or specific drug classes
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