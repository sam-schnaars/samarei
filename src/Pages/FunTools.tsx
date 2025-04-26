"use client";

import React, { useState } from "react";
import Spinning3DObject from "./3dVectors";
import JeanModelWithFixedLayout from "./JeanModelVisual";
import GroqPage from "./GroqPage";

const components = [
  () => <div className="w-full h-full"><Spinning3DObject /></div>,
  () => <div className="w-full h-full"><JeanModelWithFixedLayout /></div>,
  () => <div className="flex items-center justify-center text-black text-2xl w-full h-full"><GroqPage></GroqPage></div>,
];

const componentTitles = [
  () => <h1 className="text-2xl font-serif">interactive linear algebra vector visualization with 3js</h1>,
  () => <h1 className="text-2xl font-serif">computer vision for denim</h1>,
  () => <h1 className="text-2xl font-serif">a chatgpt w-rapper for synonyms</h1>,
];


export default function ScrollableShowcase() {
  const [index, setIndex] = useState(0);

  const prevSlide = () => {
    setIndex((prev) => (prev === 0 ? components.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setIndex((prev) => (prev + 1) % components.length);
  };

  const ActiveComponent = components[index];
  const ActiveTitle = componentTitles[index];

  return (
    <div className="w-full flex flex-col items-center justify-center bg-white py-16">
      <div className="w-full max-w-7xl px-4 md:px-8 lg:px-12">
  <div className="flex flex-col items-center">
    <div className="flex flex-col md:flex-row items-center">
      <h1 className="text-4xl font-thin text-black mt-2">fun tools</h1>
    </div>

    <div className="text-center font-extralight">
      <ActiveTitle />
    </div>
  </div>

        
        <div className="relative w-full max-w-7xl mx-auto flex items-center">
          <button
            onClick={prevSlide}
            className="hidden md:block absolute -left-16 top-1/2 transform -translate-y-1/2 z-10 bg-white text-black border border-gray-300 p-3 rounded-full shadow-md hover:bg-gray-100 transition"
          >
            ←
          </button>
          
          <div className="w-full h-[75vh] border border-gray-300 rounded-lg shadow-md overflow-hidden">
            <div className="h-full w-full">
              <ActiveComponent />
            </div>
            
            {/* Mobile arrows (inside) */}
            <button
              onClick={prevSlide}
              className="md:hidden absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white text-black border border-gray-300 p-3 rounded-full shadow-md hover:bg-gray-100 transition"
            >
              ←
            </button>
            
            <button
              onClick={nextSlide}
              className="md:hidden absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white text-black border border-gray-300 p-3 rounded-full shadow-md hover:bg-gray-100 transition"
            >
              →
            </button>
          </div>
          
          <button
            onClick={nextSlide}
            className="hidden md:block absolute -right-16 top-1/2 transform -translate-y-1/2 z-10 bg-white text-black border border-gray-300 p-3 rounded-full shadow-md hover:bg-gray-100 transition"
          >
            →
          </button>
        </div>
        
      </div>
    </div>
  );
}