
import React, { useState, useEffect } from 'react';

interface WaveformAnimationProps {
  isListening: boolean;
}

const WaveformAnimation: React.FC<WaveformAnimationProps> = ({ isListening }) => {
  const [maxHeight, setMaxHeight] = useState<number[]>([]);
  
  useEffect(() => {
    // Initialize random heights for the bars
    setMaxHeight(Array.from({ length: 30 }, () => Math.random() * 50 + 10));
    
    let interval: NodeJS.Timeout;
    
    if (isListening) {
      interval = setInterval(() => {
        setMaxHeight(prev => prev.map(() => Math.random() * 50 + 10));
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening]);
  
  return (
    <div className="flex items-center justify-center h-32 mb-4 w-full overflow-hidden">
      <div className="flex items-center justify-center w-full space-x-1">
        {maxHeight.map((height, index) => (
          <div
            key={index}
            className={`w-1 rounded-full bg-syncme-light-purple transition-all duration-300 ${isListening ? '' : 'opacity-50'}`}
            style={{
              height: isListening ? `${height}px` : '2px',
              animationDelay: `${index * 0.05}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default WaveformAnimation;
