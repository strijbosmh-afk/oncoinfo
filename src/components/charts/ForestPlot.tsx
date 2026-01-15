import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ErrorBar } from 'recharts';
import { Endpoint } from '@/types/trial';

interface ForestPlotProps {
  endpoints: Endpoint[];
}

export function ForestPlot({ endpoints }: ForestPlotProps) {
  const data = useMemo(() => {
    return endpoints
      .filter(e => e.hazard_ratio !== null && e.hazard_ratio !== undefined)
      .map(e => ({
        name: e.endpoint_name,
        hr: e.hazard_ratio!,
        ciLower: e.hazard_ratio_ci_lower || e.hazard_ratio! * 0.8,
        ciUpper: e.hazard_ratio_ci_upper || e.hazard_ratio! * 1.2,
        pValue: e.p_value,
        significant: e.p_value !== undefined && e.p_value < 0.05
      }));
  }, [endpoints]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Geen hazard ratio data beschikbaar voor forest plot
      </div>
    );
  }

  const minHR = Math.min(...data.map(d => d.ciLower)) * 0.8;
  const maxHR = Math.max(...data.map(d => d.ciUpper)) * 1.2;

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 80, left: 120, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            domain={[minHR, maxHR]}
            scale="log"
            tickFormatter={(v) => v.toFixed(2)}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-popover p-3 rounded-lg shadow-lg border">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-sm">HR: {d.hr.toFixed(2)}</p>
                  <p className="text-sm">95% CI: {d.ciLower.toFixed(2)} - {d.ciUpper.toFixed(2)}</p>
                  {d.pValue !== undefined && (
                    <p className="text-sm">p-value: {d.pValue < 0.001 ? '<0.001' : d.pValue.toFixed(3)}</p>
                  )}
                </div>
              );
            }}
          />
          <ReferenceLine x={1} stroke="hsl(var(--foreground))" strokeDasharray="3 3" />
          <Bar 
            dataKey="hr" 
            fill="hsl(var(--primary))"
            barSize={16}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.significant ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
              />
            ))}
            <ErrorBar
              dataKey="ciLower"
              width={0}
              stroke="hsl(var(--foreground))"
              direction="x"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 text-sm text-muted-foreground mt-2">
        <span>← Voordeel Behandeling</span>
        <span>Voordeel Controle →</span>
      </div>
    </div>
  );
}