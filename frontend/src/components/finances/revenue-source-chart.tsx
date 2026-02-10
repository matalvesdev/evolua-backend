interface RevenueSource {
  label: string;
  percentage: number;
  color: string;
}

interface RevenueSourceChartProps {
  sources: RevenueSource[];
}

export function RevenueSourceChart({ sources }: RevenueSourceChartProps) {
  // Calculate conic gradient stops
  const gradientStops = sources.reduce((acc, source, index, arr) => {
    const currentStop = arr.slice(0, index).reduce((sum, s) => sum + s.percentage, 0);
    const start = currentStop;
    const end = currentStop + source.percentage;
    const stop = `${source.color} ${start}% ${end}%`;
    return acc ? `${acc}, ${stop}` : stop;
  }, '');

  return (
    <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col">
      <h3 className="text-lg font-bold mb-6">Origem de Receita</h3>
      
      {/* Donut chart */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div 
          className="relative size-48 rounded-full"
          style={{
            background: `conic-gradient(${gradientStops})`
          }}
        >
          {/* Center circle */}
          <div className="absolute inset-4 bg-white/90 dark:bg-[#25182e] rounded-full flex flex-col items-center justify-center backdrop-blur-sm">
            <span className="text-xs text-[#7c6189] uppercase tracking-wider font-bold">
              Total
            </span>
            <span className="text-xl font-bold">100%</span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-8 flex flex-col gap-3">
        {sources.map((source) => (
          <div 
            key={source.label}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div 
                className="size-3 rounded-full"
                style={{ backgroundColor: source.color }}
              ></div>
              <span className="text-[#7c6189] dark:text-gray-300">
                {source.label}
              </span>
            </div>
            <span className="font-bold">{source.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
