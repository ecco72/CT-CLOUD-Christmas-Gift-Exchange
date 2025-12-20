import React, { useEffect, useState } from 'react';

export const Snow: React.FC = () => {
  const [flakes, setFlakes] = useState<number[]>([]);

  useEffect(() => {
    // Generate 20 snowflakes
    setFlakes(Array.from({ length: 20 }, (_, i) => i));
  }, []);

  return (
    <div aria-hidden="true">
      {flakes.map((i) => (
        <div 
          key={i} 
          className="snowflake" 
          style={{ 
            left: `${Math.random() * 100}%`, 
            animationDelay: `${Math.random() * 5}s, ${Math.random() * 3}s` 
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};
