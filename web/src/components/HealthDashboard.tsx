// HealthDashboard - Pure SVG ring chart for subscription health score
// Zero new dependencies - pure SVG implementation with color gradient (red -> yellow -> green)

import React, { useMemo } from 'react';

interface HealthDashboardProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function HealthDashboard({
  score,
  size = 160,
  strokeWidth = 12,
  label = 'Health Score',
}: HealthDashboardProps) {
  const chartData = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;
    
    // Determine color based on score (red -> yellow -> green)
    let strokeColor: string;
    if (score >= 80) {
      strokeColor = '#52c41a'; // green
    } else if (score >= 60) {
      strokeColor = '#faad14'; // yellow
    } else {
      strokeColor = '#ff4d4f'; // red
    }
    
    // Calculate stroke dash array for progress
    const progress = score / 100;
    const dashLength = circumference * progress;
    const dashArray = `${dashLength} ${circumference - dashLength}`;
    
    return {
      radius,
      circumference,
      center,
      strokeColor,
      dashArray,
      dashOffset: circumference * 0.25, // Start from top (270 degrees)
    };
  }, [score, size, strokeWidth]);

  if (score < 0 || score > 100) {
    return (
      <svg width={size} height={size}>
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          fill="#999"
          fontSize="12"
        >
          Invalid score
        </text>
      </svg>
    );
  }

  const { radius, circumference, center, strokeColor, dashArray, dashOffset } = chartData;

  // Determine status text
  let statusText: string;
  if (score >= 80) {
    statusText = 'Excellent';
  } else if (score >= 60) {
    statusText = 'Good';
  } else if (score >= 40) {
    statusText = 'Fair';
  } else {
    statusText = 'Needs Attention';
  }

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {/* Background ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={strokeWidth}
      />
      
      {/* Progress ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        style={{ 
          transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease',
          transform: 'rotate(-90deg)',
          transformOrigin: `${center}px ${center}px`,
        }}
      />
      
      {/* Center text - score */}
      <text
        x={center}
        y={center - 8}
        textAnchor="middle"
        fontSize="28"
        fontWeight="bold"
        fill={strokeColor}
      >
        {score}
      </text>
      
      {/* Label */}
      <text
        x={center}
        y={center + 16}
        textAnchor="middle"
        fontSize="11"
        fill="#666"
      >
        {label}
      </text>
      
      {/* Status text */}
      <text
        x={center}
        y={center + 36}
        textAnchor="middle"
        fontSize="10"
        fill={strokeColor}
      >
        {statusText}
      </text>
    </svg>
  );
}