'use client';

import React from 'react';

const SimpleAnimatedArrow = () => {
  return (
    <div className="flex justify-center items-center h-16 w-16 mx-auto">
      <div className="animate-bounce">
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 4L12 20M12 20L5 13M12 20L19 13" 
            stroke="black" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default SimpleAnimatedArrow;