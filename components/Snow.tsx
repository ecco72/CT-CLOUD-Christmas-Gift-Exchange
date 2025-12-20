
import React, { useEffect, useState } from 'react';

// Using React.memo prevents the snow from re-rendering/resetting 
// when the parent App component updates its state rapidly (e.g. during the roulette).
export const Snow: React.FC = React.memo(() => {
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
});
