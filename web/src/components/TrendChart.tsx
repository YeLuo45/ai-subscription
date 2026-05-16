// TrendChart - Pure SVG line chart for reading trend visualization
// Zero new dependencies - pure SVG implementation

import React, { useMemo } from 'react';

interface TrendChartProps {
  data: Array<{ date: string; value: number }>;
  width?: number;
  height?: number;
  lineColor?: string;
  fillColor?: string;
  showDots?: boolean;
  label?: string;
}

export default function TrendChart({
  data,
  width = 600,
  height = 200,
  lineColor = '#1890ff',
  fillColor = 'rgba(24, 144, 255, 0.1)',
  showDots = true,
  label = 'Articles',
}: TrendChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = 0;
    const valueRange = maxValue - minValue || 1;

    // Calculate points
    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
      return { x, y, value: d.value, date: d.date };
    });

    // Create path for line
    const linePath = points.length > 0
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : '';

    // Create path for area fill
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
      : '';

    // Y-axis ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
      const value = Math.round(minValue + ratio * valueRange);
      const y = padding.top + chartHeight - ratio * chartHeight;
      return { y, value };
    });

    // X-axis labels (show every few points to avoid crowding)
    const xLabels: Array<{ x: number; label: string }> = [];
    const labelStep = Math.max(1, Math.floor(data.length / 7));
    points.forEach((p, i) => {
      if (i % labelStep === 0 || i === data.length - 1) {
        xLabels.push({
          x: p.x,
          label: p.date.slice(5), // MM-DD format
        });
      }
    });

    return {
      points,
      linePath,
      areaPath,
      yTicks,
      xLabels,
      padding,
      chartHeight,
    };
  }, [data, width, height]);

  if (!chartData || data.length === 0) {
    return (
      <svg width={width} height={height}>
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="#999"
          fontSize="14"
        >
          No data available
        </text>
      </svg>
    );
  }

  const { points, linePath, areaPath, yTicks, xLabels, padding, chartHeight } = chartData;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="#e8e8e8"
            strokeDasharray={i === 0 ? 'none' : '4,4'}
          />
          <text
            x={padding.left - 8}
            y={tick.y + 4}
            fontSize={10}
            textAnchor="end"
            fill="#888"
          >
            {tick.value}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path
        d={areaPath}
        fill={fillColor}
        style={{ transition: 'all 0.3s' }}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'all 0.3s' }}
      />

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={lineColor}
          stroke="#fff"
          strokeWidth={1.5}
          style={{ transition: 'all 0.3s' }}
        >
          <title>{`${p.date}: ${p.value} ${label}`}</title>
        </circle>
      ))}

      {/* X-axis labels */}
      {xLabels.map((l, i) => (
        <text
          key={`xlabel-${i}`}
          x={l.x}
          y={height - 10}
          fontSize={9}
          textAnchor="middle"
          fill="#666"
        >
          {l.label}
        </text>
      ))}

      {/* X-axis line */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={width - padding.right}
        y2={padding.top + chartHeight}
        stroke="#e8e8e8"
      />

      {/* Y-axis line */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartHeight}
        stroke="#e8e8e8"
      />

      {/* Label */}
      <text
        x={padding.left}
        y={12}
        fontSize={10}
        fill="#666"
      >
        {label}
      </text>
    </svg>
  );
}