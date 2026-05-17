// ReadingTimeStats - Pure SVG heatmap for weekly reading statistics
// Zero new dependencies - pure SVG implementation with color mapping (light green -> dark green)

import React, { useMemo } from 'react';

interface ReadingTimeStatsProps {
  weeklyData: Array<{ week: string; daily: number[] }>;
  size?: number;
  cellSize?: number;
  cellGap?: number;
}

export default function ReadingTimeStats({
  weeklyData,
  size = 500,
  cellSize = 40,
  cellGap = 4,
}: ReadingTimeStatsProps) {
  const chartData = useMemo(() => {
    if (weeklyData.length === 0) return null;
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Flatten all values to find max for color scaling
    const allValues = weeklyData.flatMap(w => w.daily);
    const maxValue = Math.max(...allValues, 1);
    
    // Color scale: light green (#f0f7e6) -> dark green (#389e0d)
    // Using a simple linear interpolation
    const getColor = (value: number): string => {
      if (value === 0) return '#f5f5f5'; // empty cell
      const ratio = value / maxValue;
      // Interpolate between light green and dark green
      // Light: rgb(240, 247, 230) = #f0f7e6
      // Dark: rgb(56, 158, 13) = #389e0d
      const r = Math.round(240 - (240 - 56) * ratio);
      const g = Math.round(247 - (247 - 158) * ratio);
      const b = Math.round(230 - (230 - 13) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    };
    
    // Calculate dimensions
    const labelWidth = 40;
    const labelHeight = 24;
    const chartWidth = weeklyData.length * (cellSize + cellGap) + labelWidth;
    const chartHeight = days.length * (cellSize + cellGap) + labelHeight;
    
    // Scale if needed
    const scale = size > chartWidth ? 1 : size / chartWidth;
    
    return {
      days,
      maxValue,
      getColor,
      labelWidth,
      labelHeight,
      chartWidth,
      chartHeight,
      scale,
    };
  }, [weeklyData, size, cellSize, cellGap]);

  if (!chartData || weeklyData.length === 0) {
    return (
      <svg width={size} height={150}>
        <text
          x={size / 2}
          y={75}
          textAnchor="middle"
          fill="#999"
          fontSize="14"
        >
          No reading data available
        </text>
      </svg>
    );
  }

  const { days, getColor, labelWidth, labelHeight, scale } = chartData;

  return (
    <svg 
      width={size} 
      height={days.length * (cellSize + cellGap) + labelHeight + 20}
      style={{ overflow: 'visible' }}
    >
      {/* Day labels on the left */}
      {days.map((day, i) => (
        <text
          key={`day-${i}`}
          x={labelWidth - 8}
          y={labelHeight + i * (cellSize + cellGap) + cellSize / 2 + 4}
          fontSize={10}
          textAnchor="end"
          fill="#666"
        >
          {day}
        </text>
      ))}
      
      {/* Week columns */}
      {weeklyData.map((week, weekIndex) => (
        <g key={`week-${weekIndex}`} transform={`translate(${labelWidth + weekIndex * (cellSize + cellGap)}, ${labelHeight})`}>
          {/* Week label */}
          <text
            x={cellSize / 2}
            y={-6}
            fontSize={9}
            textAnchor="middle"
            fill="#888"
          >
            {week.week}
          </text>
          
          {/* Daily cells */}
          {week.daily.map((value, dayIndex) => (
            <g key={`cell-${dayIndex}`}>
              <rect
                x={0}
                y={dayIndex * (cellSize + cellGap)}
                width={cellSize}
                height={cellSize}
                rx={4}
                fill={getColor(value)}
                style={{ transition: 'fill 0.3s ease' }}
              >
                <title>{`${days[dayIndex]}: ${value} articles`}</title>
              </rect>
              {/* Value label inside cell if value > 0 */}
              {value > 0 && (
                <text
                  x={cellSize / 2}
                  y={dayIndex * (cellSize + cellGap) + cellSize / 2 + 4}
                  fontSize={9}
                  textAnchor="middle"
                  fill={value > chartData.maxValue * 0.6 ? '#fff' : '#666'}
                  fontWeight={value > chartData.maxValue * 0.6 ? 'bold' : 'normal'}
                >
                  {value}
                </text>
              )}
            </g>
          ))}
        </g>
      ))}
      
      {/* Legend */}
      <g transform={`translate(${labelWidth}, ${days.length * (cellSize + cellGap) + labelHeight + 10})`}>
        <text x={0} y={10} fontSize={9} fill="#888">Less</text>
        <rect x={30} y={0} width={cellSize / 2} height={12} rx={2} fill="#f5f5f5" />
        <rect x={30 + cellSize / 2 + 2} y={0} width={cellSize / 2} height={12} rx={2} fill="rgb(200, 235, 180)" />
        <rect x={30 + (cellSize + 4) * 1} y={0} width={cellSize / 2} height={12} rx={2} fill="rgb(139, 209, 100)" />
        <rect x={30 + (cellSize + 4) * 2} y={0} width={cellSize / 2} height={12} rx={2} fill="rgb(56, 158, 13)" />
        <text x={30 + (cellSize + 4) * 3 + 4} y={10} fontSize={9} fill="#888">More</text>
      </g>
    </svg>
  );
}