import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Endpoint, Arm } from '@/types/trial';

interface EndpointsTableProps {
  endpoints: Endpoint[];
  arms: Arm[];
}

export function EndpointsTable({ endpoints, arms }: EndpointsTableProps) {
  const getArmName = (armId?: string) => {
    if (!armId) return 'Totaal';
    const arm = arms.find(a => a.id === armId);
    return arm?.name || 'Onbekend';
  };

  const formatPValue = (p?: number) => {
    if (p === undefined || p === null) return '-';
    if (p < 0.001) return '<0,001';
    return p.toFixed(3).replace('.', ',');
  };

  const formatCI = (lower?: number, upper?: number) => {
    if (lower === undefined || upper === undefined) return '-';
    return `${lower.toFixed(2).replace('.', ',')} - ${upper.toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Eindpunt</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Arm</TableHead>
            <TableHead className="text-right">HR</TableHead>
            <TableHead className="text-right">95% BI</TableHead>
            <TableHead className="text-right">p-waarde</TableHead>
            <TableHead className="text-right">Mediaan (mnd)</TableHead>
            <TableHead className="text-right">Percentage (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {endpoints.map((endpoint) => (
            <TableRow key={endpoint.id}>
              <TableCell className="font-medium">{endpoint.endpoint_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {endpoint.endpoint_type === 'primary' ? 'primair' : 
                   endpoint.endpoint_type === 'secondary' ? 'secundair' : endpoint.endpoint_type}
                </Badge>
              </TableCell>
              <TableCell>{getArmName(endpoint.arm_id)}</TableCell>
              <TableCell className="text-right font-mono">
                {endpoint.hazard_ratio?.toFixed(2).replace('.', ',') || '-'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCI(endpoint.hazard_ratio_ci_lower, endpoint.hazard_ratio_ci_upper)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatPValue(endpoint.p_value)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {endpoint.median_months?.toFixed(1).replace('.', ',') || '-'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {endpoint.rate_percent !== undefined && endpoint.rate_percent !== null
                  ? `${endpoint.rate_percent.toFixed(1).replace('.', ',')}%`
                  : '-'}
                {endpoint.rate_timepoint_months && (
                  <span className="text-xs text-muted-foreground ml-1">
                    @{endpoint.rate_timepoint_months}mnd
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
