import React, { useState, useEffect, useRef } from 'react';

const MovingS = () => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const velocityRef = useRef({ x: 2, y: 1.5 });
  const baseSpeedRef = useRef({ x: 2, y: 1.5 }); // Store the original direction
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 100 });
  const [rotation, setRotation] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const sSize = 32; // Size of the S character
  const animationRef = useRef<number | null>(null);
  
  // Update velocity when speed multiplier changes
  useEffect(() => {
    velocityRef.current = {
      x: baseSpeedRef.current.x * speedMultiplier,
      y: baseSpeedRef.current.y * speedMultiplier
    };
  }, [speedMultiplier]);
  
  // Update container size on mount and window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);
  
  // Animation using requestAnimationFrame
  useEffect(() => {
    const animate = () => {
      setPosition(prevPos => {
        const velocity = velocityRef.current;
        const newPos = { 
          x: prevPos.x + velocity.x, 
          y: prevPos.y + velocity.y 
        };
        
        // Bounce off walls and maintain direction but adjust for current speed
        if (newPos.x <= 0 || newPos.x >= containerSize.width - sSize) {
          // Reverse x direction but maintain speed
          baseSpeedRef.current.x = -baseSpeedRef.current.x;
          velocityRef.current.x = baseSpeedRef.current.x * speedMultiplier;
        }
        
        if (newPos.y <= 0 || newPos.y >= containerSize.height - sSize) {
          // Reverse y direction but maintain speed
          baseSpeedRef.current.y = -baseSpeedRef.current.y;
          velocityRef.current.y = baseSpeedRef.current.y * speedMultiplier;
        }
        
        // Apply boundary constraints
        return {
          x: Math.max(0, Math.min(containerSize.width - sSize, newPos.x)),
          y: Math.max(0, Math.min(containerSize.height - sSize, newPos.y))
        };
      });
      
      // Rotate the S slightly, adjusted for speed
      setRotation(prev => (prev + (1 * speedMultiplier)) % 360);
      
      // Continue the animation loop
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start the animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup function to stop animation when component unmounts
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [containerSize, speedMultiplier]); // Re-run when container size or speed changes
  
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSpeedMultiplier(value);
  };
  
  return (
    <div className="flex flex-col items-center w-full">
      
      
      
      <div 
        ref={containerRef}
        className="relative w-full h-32 bg-white border border-gray-200 rounded-lg overflow-hidden"
      >
        <div
          className="absolute font-serif select-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: `rotate(${rotation}deg)`,
            fontSize: `${sSize}px`,
            lineHeight: 1,
            transformOrigin: 'center',
            fontWeight: 'bold'
          }}
        >
          S
        </div>
      </div>
      
      <div className="mt-4 text-sm font-serif">
         <a href="mailto:samschnaars@berkeley.edu">work with me: samschnaars@berkeley.edu</a>
        <div className="w-full max-w-md mb-4">
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speedMultiplier}
            onChange={handleSpeedChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-black"
          />
      </div>
      </div>
    </div>
  );
};

export default MovingS;