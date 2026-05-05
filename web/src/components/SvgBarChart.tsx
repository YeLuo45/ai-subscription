import React from 'react';

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  barColor?: string;
}

export default function SvgBarChart({ 
  data, 
  width = 600, 
  height = 200,
  barColor = '#1890ff' 
}: BarChartProps) {
  if (data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.value), 1);
  const chartHeight = height - 40;
  const barWidth = Math.min(30, (width - 60) / data.length - 4);
  const chartWidth = width - 40;
  
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* Y axis lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = chartHeight - (ratio * chartHeight);
        return (
          <g key={ratio}>
            <line 
              x1={30} y1={y} x2={chartWidth} y2={y} 
              stroke="#e8e8e8" 
              strokeDasharray="4,4" 
            />
            <text x={25} y={y + 4} fontSize={10} textAnchor="end" fill="#888">
              {Math.round(max * ratio)}
            </text>
          </g>
        );
      })}
      
      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = (d.value / max) * chartHeight;
        const x = 35 + i * ((chartWidth - 30) / data.length);
        const y = chartHeight - barHeight;
        
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={barColor}
              rx={2}
              style={{ transition: 'all 0.3s' }}
            />
            {/* X label (show every 5th or fewer) */}
            {data.length <= 10 || i % Math.ceil(data.length / 7) === 0 ? (
              <text 
                x={x + barWidth / 2} 
                y={height - 5} 
                fontSize={9} 
                textAnchor="middle" 
                fill="#666"
              >
                {d.label.slice(5)}
              </text>
            ) : null}
          </g>
        );
      })}
      
      {/* X axis line */}
      <line 
        x1={30} y1={chartHeight} x2={chartWidth} y2={chartHeight} 
        stroke="#e8e8e8" 
      />
    </svg>
  );
}
