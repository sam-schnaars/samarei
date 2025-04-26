"use client";

import React, { useState, useRef, useEffect } from 'react';

const JeanModelWithFixedLayout = () => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  // GradCAM example image - this will be the one fixed image shown
  const gradcamImage = "/gradcam_p13-517.png"; // Update this to your actual image path
  
  // Check if image actually loads
  const [imageLoaded, setImageLoaded] = useState(false);
  
  useEffect(() => {
    const checkImageExists = (src: string): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });
    };

    checkImageExists(gradcamImage).then(result => {
      setImageLoaded(result as boolean);
    });
  }, []);
  
  // Fixed description text
  const description = "I heard about how large secondhand marketplaces have difficulty distinguishing between boot cut and straight leg jeans without human evaluation. So, I combined my two passions of denim and machine learning. I scraped 122 images of jeans from ebay and trained an efficient net model with extra attention and classification channels for 12 epochs with batches of 32. I used a small data set (n=122) and got a fairly impressvie 80% test accuracy on a set of 20 images scraped from Levis instead of ebay.";

  // Handle zoom controls
  const handleZoom = (delta) => {
    setZoomLevel(prev => {
      const newZoom = prev + delta;
      return Math.min(Math.max(0.5, newZoom), 3);
    });
  };
  
  // Reset zoom and pan
  const resetView = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };
  
  // Mouse event handlers for panning
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setPanPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Add and remove event listeners
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging, dragStart]);
  
  // Block diagram styles including transforms for zoom and pan
  const diagramStyle = {
    transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
    transformOrigin: 'center',
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div className="w-full h-full overflow-hidden bg-white p-4 flex flex-col">
      {/* Controls */}
      
      
      {/* Main content container - adjusted for 25% left (model) and 75% right (image) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4">
        {/* Diagram container - left side (25%) */}
        <div 
          ref={containerRef}
          className="hidden md:block w-full md:w-1/4 overflow-hidden bg-gray-50 rounded-lg border border-gray-200 relative"
          onMouseDown={handleMouseDown}
        >
          {/* Diagram content with zoom and pan */}
          <div  
            className="w-full h-full flex items-center justify-center"
            style={diagramStyle}
          >
            <div className="flex flex-col items-center space-y-4 p-4">
              {/* Input Layer */}
              <div className="w-full p-2 bg-blue-100 border-2 border-blue-500 rounded-lg text-center relative">
                <div className="font-bold text-xs">Input</div>
                <div className="text-xs">256×256</div>
              </div>
              
              {/* Arrow */}
              <div className="h-3 w-0.5 bg-gray-400"></div>
              
              {/* Feature Extraction */}
              <div className="w-full p-2 bg-green-100 border-2 border-green-500 rounded-lg text-center relative">
                <div className="font-bold text-xs">EfficientNet-B0</div>
                <div className="text-xs">Features</div>
              </div>
              
              {/* Arrow */}
              <div className="h-3 w-0.5 bg-gray-400"></div>
              
              {/* Attention Block */}
              <div className="w-full p-2 bg-orange-100 border-2 border-orange-500 rounded-lg text-center relative">
                <div className="font-bold text-xs">Attention</div>
              </div>
              
              {/* Arrow */}
              <div className="h-3 w-0.5 bg-gray-400"></div>
              
              {/* Classification Block */}
              <div className="w-full p-2 bg-purple-100 border-2 border-purple-500 rounded-lg text-center relative">
                <div className="font-bold text-xs">Classification</div>
              </div>
              
              {/* Arrow */}
              <div className="h-3 w-0.5 bg-gray-400"></div>
              
              {/* Output */}
              <div className="w-full p-2 bg-blue-100 border-2 border-blue-500 rounded-lg text-center relative">
                <div className="font-bold text-xs">Output</div>
                <div className="text-xs">Jean Type</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* GradCAM and description - right side (75%) */}
        <div className="w-full md:w-3/4 bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
          <h3 className="text-lg font-bold mb-2">Computer Vision for Denim</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-700">{description}</p>
          </div>
          
          <div className="flex-1 flex flex-col">
            {/* GradCAM Image - taking most of the space */}
            <div className="flex-1 relative rounded overflow-hidden">
                <img 
                  src={gradcamImage} 
                  alt="GradCAM visualization of jean classification"
                  className="w-[100%] h-[80%] object-contain"
                />
            </div>
            
            {/* Additional explanation at the bottom */}
            <div className="mt-0">
              <h4 className="text-md font-semibold">Reading This Visualization</h4>
              <p className="text-sm text-gray-600">
                This GradCAM visualization confirms that my model properly learnt how bootcut and straight leg jeans differ - through the mid waist hemmings. The bright red / yellow areas show the regions that strongly influenced the model's decision and it is right at the mid waist.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="hidden md:block mt-2 flex-wrap gap-4">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 border border-blue-500 mr-2"></div>
          <span className="text-sm">Input/Output</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-500 mr-2"></div>
          <span className="text-sm">Feature Extraction</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-100 border border-orange-500 mr-2"></div>
          <span className="text-sm">Attention Mechanism</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-purple-100 border border-purple-500 mr-2"></div>
          <span className="text-sm">Classification</span>
        </div>
      </div>
    </div>
  );
};

export default JeanModelWithFixedLayout;