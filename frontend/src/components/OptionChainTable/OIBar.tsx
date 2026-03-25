import React from 'react';

export const OIBar: React.FC<any> = ({ value, maxValue, color, isRight }) => {
  const percentage = Math.min((value / (maxValue || 1)) * 100, 100);
  
  return (
    <div className={`absolute top-0 bottom-0 ${isRight ? 'right-0' : 'left-0'} opacity-30 ${color}`} 
         style={{ width: `${percentage}%` }} />
  );
};
