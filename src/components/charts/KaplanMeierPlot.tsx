import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Endpoint } from '@/types/trial';

interface KaplanMeierPlotProps {
  endpoints: Endpoint[];
}

const COLORS = [
  'hsl(199, 89%, 32%)',
  'hsl(174, 62%, 38%)',
  'hsl(25, 95%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(340, 75%, 55%)',
];

export function KaplanMeierPlot({ endpoints }: KaplanMeierPlotProps) {
  const { chartData, lines } = useMemo(() => {
    const endpointsWithTimepoints = endpoints.filter(
      e => e.survival_timepoints && e.survival_timepoints.length > 0
    );

    if (endpointsWithTimepoints.length === 0) {
      return { chartData: [], lines: [] };
    }

    // Collect all unique timepoints
    const allTimepoints = new Set<number>();
    endpointsWithTimepoints.forEach(e => {
      e.survival_timepoints?.forEach(tp => allTimepoints.add(tp.months));
    });

    // Sort timepoints
    const sortedTimepoints = Array.from(allTimepoints).sort((a, b) => a - b);

    // Add time 0 at 100%
    const timepoints = [0, ...sortedTimepoints];

    // Create chart data
    const chartData = timepoints.map(month => {
      const point: Record<string, number> = { month };
      
      endpointsWithTimepoints.forEach((endpoint, i) => {
        if (month === 0) {
          point[endpoint.endpoint_name] = 100;
        } else {
          const tp = endpoint.survival_timepoints?.find(t => t.months === month);
          if (tp) {
            point[endpoint.endpoint_name] = tp.survival_rate;
          }
        }
      });

      return point;
    });

    // Create lines config
    const lines = endpointsWithTimepoints.map((e, i) => ({
      name: e.endpoint_name,
      color: COLORS[i % COLORS.length]
    }));

    return { chartData, lines };
  }, [endpoints]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Geen survival data beschikbaar voor Kaplan-Meier curve
      </div>
    );
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            label={{ value: 'Tijd (maanden)', position: 'bottom', offset: 0 }}
          />
          <YAxis 
            domain={[0, 100]}
            label={{ value: 'Overleving (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-popover p-3 rounded-lg shadow-lg border">
                  <p className="font-medium mb-2">Maand {label}</p>
                  {payload.map((p: any, i: number) => (
                    <p key={i} className="text-sm" style={{ color: p.color }}>
                      {p.name}: {p.value?.toFixed(1)}%
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend />
          {lines.map((line, i) => (
            <Line
              key={line.name}
              type="stepAfter"
              dataKey={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 0, r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}