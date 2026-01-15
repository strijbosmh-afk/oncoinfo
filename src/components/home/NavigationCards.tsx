import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  FlaskConical, 
  Activity, 
  Pill 
} from 'lucide-react';

const navigationCards = [
  {
    title: 'Search by Trial Name',
    description: 'Find specific trials by acronym or full name',
    icon: Search,
    href: '/trials',
    examples: ['ENZAMET', 'PROSPER', 'LATITUDE']
  },
  {
    title: 'Browse by Trial Design',
    description: 'Filter by phase, randomization, or endpoint type',
    icon: FlaskConical,
    href: '/trials?view=design',
    examples: ['Phase III', 'Randomized', 'Survival endpoint']
  },
  {
    title: 'Browse by Disease Area',
    description: 'Explore trials organized by cancer type',
    icon: Activity,
    href: '/trials?view=disease',
    examples: ['Prostate', 'Bladder', 'RCC', 'Testis']
  },
  {
    title: 'Browse by Intervention',
    description: 'Find trials by treatment class or specific drugs',
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
          Find Trials Your Way
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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