import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const CircularProgress = ({ 
  size = 40, 
  strokeWidth = 3, 
  progress = 0, 
  backgroundColor = '#e6efff',
  children 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Threshold colors:
  // < 0 => red, 0 => no ring, 1-49 => yellow, >= 50 => green
  const getProgressColor = () => {
    if (progress < 0) return '#ef4444';
    if (progress > 49) return '#10b981';
    if (progress > 0) return '#f59e0b';
    return 'transparent';
  };

  // For zero progress, hide progress ring
  const showProgressRing = progress !== 0;
  const progressColor = getProgressColor();
  
  // Calculate dash offset - handle negative values by showing full circle
  let progressStrokeDashoffset;
  if (progress < 0) {
    // For negative, show full circle in red
    progressStrokeDashoffset = 0;
  } else {
    progressStrokeDashoffset = circumference - (progress / 100) * circumference;
  }

  // For zero progress, hide ring completely
  const backgroundCircleColor = progress === 0 ? 'transparent' : backgroundColor;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundCircleColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress Circle - only show if progress !== 0 */}
        {showProgressRing && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={progressStrokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      
      {/* Child content (icon) */}
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'absolute',
        width: size,
        height: size,
      }}>
        {children}
      </View>
    </View>
  );
};

export default CircularProgress;
