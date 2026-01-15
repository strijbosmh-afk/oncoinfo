import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TrialFilters, DISEASE_AREAS, INTERVENTION_CLASSES, PHASES, SETTINGS } from '@/types/trial';
import { X } from 'lucide-react';

interface FilterPanelProps {
  filters: TrialFilters;
  onFiltersChange: (filters: TrialFilters) => void;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const handleFilterChange = (
    key: keyof TrialFilters,
    value: string,
    checked: boolean
  ) => {
    const currentValues = (filters[key] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v) => v !== value);
    
    onFiltersChange({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
  );

  return (
    <div className="w-64 shrink-0 border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-6 pr-4">
          {/* Disease Area */}
          <div>
            <h4 className="text-sm font-medium mb-3">Disease Area</h4>
            <div className="space-y-2">
              {DISEASE_AREAS.map((area) => (
                <div key={area} className="flex items-center gap-2">
                  <Checkbox
                    id={`disease-${area}`}
                    checked={filters.disease_area?.includes(area) || false}
                    onCheckedChange={(checked) =>
                      handleFilterChange('disease_area', area, checked as boolean)
                    }
                  />
                  <Label htmlFor={`disease-${area}`} className="text-sm cursor-pointer">
                    {area}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Setting */}
          <div>
            <h4 className="text-sm font-medium mb-3">Setting</h4>
            <div className="space-y-2">
              {SETTINGS.map((setting) => (
                <div key={setting} className="flex items-center gap-2">
                  <Checkbox
                    id={`setting-${setting}`}
                    checked={filters.setting?.includes(setting) || false}
                    onCheckedChange={(checked) =>
                      handleFilterChange('setting', setting, checked as boolean)
                    }
                  />
                  <Label htmlFor={`setting-${setting}`} className="text-sm cursor-pointer">
                    {setting}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Phase */}
          <div>
            <h4 className="text-sm font-medium mb-3">Phase</h4>
            <div className="space-y-2">
              {PHASES.map((phase) => (
                <div key={phase} className="flex items-center gap-2">
                  <Checkbox
                    id={`phase-${phase}`}
                    checked={filters.phase?.includes(phase) || false}
                    onCheckedChange={(checked) =>
                      handleFilterChange('phase', phase, checked as boolean)
                    }
                  />
                  <Label htmlFor={`phase-${phase}`} className="text-sm cursor-pointer">
                    {phase}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Intervention Class */}
          <div>
            <h4 className="text-sm font-medium mb-3">Intervention Class</h4>
            <div className="space-y-2">
              {INTERVENTION_CLASSES.map((intervention) => (
                <div key={intervention} className="flex items-center gap-2">
                  <Checkbox
                    id={`intervention-${intervention}`}
                    checked={filters.intervention_class?.includes(intervention) || false}
                    onCheckedChange={(checked) =>
                      handleFilterChange('intervention_class', intervention, checked as boolean)
                    }
                  />
                  <Label htmlFor={`intervention-${intervention}`} className="text-sm cursor-pointer">
                    {intervention}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}