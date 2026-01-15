import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Activity, 
  Pill 
} from 'lucide-react';

const navigationCards = [
  {
    title: 'Zoeken op Studienaam',
    description: 'Vind specifieke studies op acroniem of volledige naam',
    icon: Search,
    href: '/trials',
    examples: ['ENZAMET', 'PROSPER', 'LATITUDE']
  },
  {
    title: 'Zoeken op Ziektegebied',
    description: 'Bekijk studies georganiseerd per kankertype',
    icon: Activity,
    href: '/trials?view=disease',
    examples: ['Prostaat', 'Blaas', 'Nier', 'Testis']
  },
  {
    title: 'Zoeken op Interventie',
    description: 'Vind studies op behandelklasse of specifieke medicijnen',
    icon: Pill,
    href: '/trials?view=intervention',
    examples: ['IO/ICI', 'PARPi', 'ARPI', 'ADC']
  }
];

export function NavigationCards() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <h2 className="text-2xl font-bold text-center mb-10">
          Vind Studies op Uw Manier
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {navigationCards.map((card) => (
            <Link key={card.title} to={card.href}>
              <Card className="h-full transition-all hover:shadow-medical hover:-translate-y-1 cursor-pointer group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {card.examples.map((example) => (
                      <Badge key={example} variant="secondary" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
