import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trial } from '@/types/trial';
import { Calendar, Users, FileText, ExternalLink, CheckCircle2, XCircle, BookOpen, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TrialCardProps {
  trial: Trial;
}

const diseaseColors: Record<string, string> = {
  'Prostate Cancer': 'bg-[hsl(199,89%,32%)]',
  'Bladder Cancer': 'bg-[hsl(174,62%,38%)]',
  'Renal Cell Carcinoma': 'bg-[hsl(25,95%,53%)]',
  'Testicular Cancer': 'bg-[hsl(262,83%,58%)]',
  'Penile Cancer': 'bg-[hsl(340,75%,55%)]'
};

const diseaseLabels: Record<string, string> = {
  'Prostate Cancer': 'Prostaatkanker',
  'Bladder Cancer': 'Blaaskanker',
  'Renal Cell Carcinoma': 'Niercelcarcinoom',
  'Testicular Cancer': 'Testiskanker',
  'Penile Cancer': 'Peniskanker'
};

function EndpointIndicator({ met }: { met: boolean | null | undefined }) {
  if (met === null || met === undefined) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
            met ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            {met ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{met ? 'Primair eindpunt behaald' : 'Primair eindpunt niet behaald'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StatusIndicators({ trial }: { trial: Trial }) {
  const isPublished = !!(trial.doi || trial.pubmed_id);
  const hasResults = !!trial.results_summary;
  
  if (!isPublished && !hasResults) return null;
  
  return (
    <div className="flex gap-1">
      {isPublished && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-600">
                <BookOpen className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Gepubliceerd</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {hasResults && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-600">
                <BarChart3 className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Resultaten beschikbaar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export function TrialCard({ trial }: TrialCardProps) {
  return (
    <Link to={`/trials/${trial.id}`}>
      <Card className="h-full transition-all hover:shadow-medical hover:-translate-y-0.5 cursor-pointer overflow-hidden group">
        <div className={`h-1.5 ${diseaseColors[trial.disease_area] || 'bg-primary'}`} />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <EndpointIndicator met={trial.primary_endpoint_met} />
              <div>
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                  {trial.acronym}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {trial.title}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusIndicators trial={trial} />
              {trial.doi && (
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {diseaseLabels[trial.disease_area] || trial.disease_area}
            </Badge>
            {trial.phase && (
              <Badge variant="outline" className="text-xs">
                {trial.phase.replace('Phase', 'Fase')}
              </Badge>
            )}
            {trial.setting && (
              <Badge variant="outline" className="text-xs">
                {trial.setting}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {trial.sample_size && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                N={trial.sample_size.toLocaleString()}
              </span>
            )}
            {trial.publication_year && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {trial.publication_year}
              </span>
            )}
            {trial.journal && (
              <span className="flex items-center gap-1 truncate">
                <FileText className="h-3.5 w-3.5" />
                {trial.journal}
              </span>
            )}
          </div>

          {trial.primary_endpoint && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Primair:</span> {trial.primary_endpoint}
            </p>
          )}

          {trial.intervention_classes && trial.intervention_classes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {trial.intervention_classes.slice(0, 3).map((intervention) => (
                <Badge key={intervention} variant="outline" className="text-xs bg-primary/5">
                  {intervention}
                </Badge>
              ))}
              {trial.intervention_classes.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{trial.intervention_classes.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
