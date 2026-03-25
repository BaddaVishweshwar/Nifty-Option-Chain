import React, { useEffect, useState } from 'react';

export const LTPCell: React.FC<any> = ({ value, prevValue }) => {
  const [flash, setFlash] = useState<'green' | 'red' | null>(null);

  useEffect(() => {
    if (value > prevValue && prevValue !== 0) {
      setFlash('green');
    } else if (value < prevValue && prevValue !== 0) {
      setFlash('red');
    }

    const timer = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(timer);
  }, [value]);

  const flashClass = flash === 'green' ? 'animate-flash-green' : flash === 'red' ? 'animate-flash-red' : '';

  return (
    <div className={`px-2 py-1 font-mono font-bold rounded ${flashClass}`}>
      {value.toFixed(2)}
    </div>
  );
};
