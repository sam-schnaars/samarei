'use client';

import React, {useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, PerspectiveCamera, Html} from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFF5'];

// Auto-rotation component
const SceneRotation = () => {
  const groupRef = useRef<THREE.Group | null>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Very slow, subtle rotation
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.05;
      groupRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.15) * 0.03;
    }
  });

  return (
      <AxesLines />
  );
};

const VectorLine = ({ start, end, color, lineWidth, onClick, isSelected }) => {
  const endPoint = new THREE.Vector3(...end);
  
  return (
    <>
      <Line
        points={[new THREE.Vector3(...start), endPoint]}
        color={isSelected ? 'yellow' : color}
        lineWidth={lineWidth}
        onClick={onClick}
      />
      <Html position={end} center distanceFactor={10}>
        <div style={{ 
          color: isSelected ? 'yellow' : color, 
          fontSize: '10px', 
          fontFamily: 'Inter, Arial, sans-serif',
          background: 'rgba(0, 0, 0, 0.7)', 
          padding: '1px 3px', 
          borderRadius: '2px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          opacity: 0.8
        }}>
          ({end[0]}, {end[1]}, {end[2]})
        </div>
      </Html>
    </>
  );
};

// Projection line to visualize dot product
const ProjectionLine = ({ vector1, vector2, index }) => {
  // Calculate unit vector of vector2
  const v2 = new THREE.Vector3(...vector2);
  const v2Length = v2.length();
  const v2Unit = v2.clone().divideScalar(v2Length);
  
  // Calculate dot product
  const v1 = new THREE.Vector3(...vector1);
  const dotProduct = v1.dot(v2Unit);
  
  // Calculate projection point
  const projectionPoint = v2Unit.multiplyScalar(dotProduct);
  
  return (
    <>
      <Line
        points={[new THREE.Vector3(0, 0, 0), projectionPoint]}
        color="white"
        lineWidth={2}
        dashed={true}
      />
      <Line
        points={[new THREE.Vector3(...vector1), projectionPoint]}
        color="white"
        lineWidth={1}
        dashed={true}
      />
      <Html position={projectionPoint.toArray()} center distanceFactor={15}>
        <div style={{ 
          color: 'white', 
          fontSize: '9px', 
          fontFamily: 'Inter, Arial, sans-serif',
          background: 'rgba(0, 0, 0, 0.5)', 
          padding: '1px 3px', 
          borderRadius: '2px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          opacity: 0.7
        }}>
          Proj {index+1}: {dotProduct.toFixed(1)}
        </div>
      </Html>
    </>
  );
};

const AxesLines = () => {
  const axes = [
    { start: [0, 0, 0], end: [20, 0, 0], color: 'red', label: 'X' },
    { start: [0, 0, 0], end: [0, 20, 0], color: 'green', label: 'Y' },
    { start: [0, 0, 0], end: [0, 0, 20], color: 'blue', label: 'Z' },
  ];

  return (
    <>
      {axes.map((axis, index) => (
        <React.Fragment key={index}>
          <Line
            points={[new THREE.Vector3(...axis.start), new THREE.Vector3(...axis.end)]}
            color={axis.color}
            lineWidth={1.5}
          />
          <Html position={[axis.end[0], axis.end[1], axis.end[2]]} center>
            <div style={{ 
              color: axis.color, 
              fontSize: '10px', 
              fontWeight: 'bold',
              fontFamily: 'Inter, Arial, sans-serif',
              background: 'rgba(0, 0, 0, 0.5)', 
              padding: '1px 3px', 
              borderRadius: '2px',
              pointerEvents: 'none'
            }}>
              {axis.label}
            </div>
          </Html>
        </React.Fragment>
      ))}
    </>
  );
};

const VectorInputForm = ({ addVector, updateVector, deleteVector, vectors, selectedIndex, setSelectedIndex, dotProductTarget, setDotProductTarget, isOpen, toggleForm }) => {
  const [x, setX] = useState(1);
  const [y, setY] = useState(1);
  const [z, setZ] = useState(1);

  useEffect(() => {
    if (selectedIndex !== null) {
      const [vx, vy, vz] = vectors[selectedIndex];
      setX(vx);
      setY(vy);
      setZ(vz);
    }
  }, [selectedIndex, vectors]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selectedIndex !== null) {
      updateVector([x, y, z]);
    } else {
      addVector([x, y, z]);
    }
    setX(1);
    setY(1);
    setZ(1);
  };

  const calculateDotProduct = (v1, v2) => {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  };

  return (
    <motion.div 
      className="absolute left-14 top-4 z-20"
      initial={{ x: isOpen ? 0 : -300 }}
      animate={{ x: isOpen ? 0 : -300 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="bg-gray-800 p-3 rounded-lg text-white w-64 shadow-lg font-sans">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold">Vector Controls</h3>
          {selectedIndex !== null && (
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
              Editing V{selectedIndex + 1}
            </span>
          )}
        </div>

    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <div className="flex flex-col space-y-2">
        {[
          ['X', x, (value: number) => setX(value)],
          ['Y', y, (value: number) => setY(value)],
          ['Z', z, (value: number) => setZ(value)]
        ].map((item, i) => {
          // Safely destructure with explicit typing
          const label = item[0] as string;
          const val = item[1] as number;
          const setFunc = item[2] as (value: number) => void;
          
          return (
            <label key={i} className="flex items-center justify-between">
              <span className="text-xs font-semibold">{label}:</span>
              <input
                type="number"
                value={val}
                onChange={(e) => setFunc(Number(e.target.value))}
                className="bg-gray-700 p-1 rounded text-xs w-32 text-white"
              />
            </label>
          );
        })}
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition">
          {selectedIndex !== null ? 'Update' : 'Add'}
        </button>
        <button 
          type="button" 
          onClick={deleteVector} 
          disabled={selectedIndex === null} 
          className={`text-white px-3 py-1 rounded text-xs transition ${selectedIndex === null ? 'bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
        >
          Delete
        </button>
        {selectedIndex !== null && (
          <button 
            type="button" 
            onClick={() => setSelectedIndex(null)} 
            className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-500 transition ml-auto"
          >
            stop edit
          </button>
        )}
      </div>
    </form>

        {vectors.length > 1 && (
          <div className="mt-2 border-t border-gray-700 pt-2">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold">Dot Product</h3>
              {dotProductTarget !== null && (
                <button 
                  onClick={() => setDotProductTarget(null)} 
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded transition"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-col space-y-1">
              <select 
                value={dotProductTarget ?? ""} 
                onChange={(e) => setDotProductTarget(e.target.value === "" ? null : Number(e.target.value))}
                className="bg-gray-700 p-1 rounded text-xs text-white w-full"
              >
                <option value="">Select vector to project against</option>
                {vectors.map((vector, idx) => (
                  <option key={idx} value={idx}>
                    V{idx + 1} ({vector.join(', ')})
                  </option>
                ))}
              </select>
              
              {dotProductTarget !== null && vectors.length > 1 && (
                <div className="grid grid-cols-1 gap-1 mt-1 text-xs">
                  {vectors.map((vector, idx) => {
                    if (idx === dotProductTarget) return null;
                    const dot = calculateDotProduct(vector, vectors[dotProductTarget]);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-gray-700 p-1 rounded">
                        <span>V{idx + 1} · V{dotProductTarget + 1}</span>
                        <span className="font-mono">{dot.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const VectorLegend = ({ vectors }) => {
  return (
    <div className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded text-white text-xs font-sans">
      {vectors.map((vector, idx) => (
        <div key={idx} className="flex items-center space-x-1 mb-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: colors[idx % colors.length] }}
          ></div>
          <span>V{idx + 1}: ({vector.join(', ')})</span>
        </div>
      ))}
    </div>
  );
};

const Spinning3DObject = ({ showForm = true }) => {
  const [vectors, setVectors] = useState([[1,1,1]]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [dotProductTarget, setDotProductTarget] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);

  const addVector = (vector) => {
    setVectors((prev) => [...prev, vector]);
    setSelectedIndex(vectors.length);
  };

  const updateVector = (newVector) => {
    setVectors((prev) => prev.map((v, i) => (i === selectedIndex ? newVector : v)));
  };

  const deleteVector = () => {
    if (dotProductTarget === selectedIndex) {
      setDotProductTarget(null);
    } else if (dotProductTarget !== null && selectedIndex !== null && dotProductTarget > selectedIndex) {
      setDotProductTarget(dotProductTarget - 1);
    }
    
    setVectors((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(null);
  };

  const toggleForm = () => {
    setIsFormOpen(!isFormOpen);
  };

  return (
    <div className="w-full h-full">
      <div className="w-full h-full relative">
        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
          {showForm && (
            <VectorInputForm
              addVector={addVector}
              updateVector={updateVector}
              deleteVector={deleteVector}
              vectors={vectors}
              selectedIndex={selectedIndex}
              setSelectedIndex={setSelectedIndex}
              dotProductTarget={dotProductTarget}
              setDotProductTarget={setDotProductTarget}
              isOpen={isFormOpen}
              toggleForm={toggleForm}
            />
          )}
          
          {/* Toggle Button */}
          <div 
            className="absolute left-4 top-4 z-30 bg-gray-800 p-2 rounded-lg shadow-lg cursor-pointer hover:bg-gray-700 transition-colors font-sans"
            onClick={toggleForm}
          >
            {isFormOpen ? "←" : "→"}
          </div>
          
          <div className="w-full h-full">
            <Canvas>
              <PerspectiveCamera makeDefault position={[10, 5, 15]} fov={20} />
              
              {/* Scene rotation component */}
              <SceneRotation />
              
              {vectors.map((vector, index) => (
                <VectorLine
                  key={index}
                  start={[0, 0, 0]}
                  end={vector}
                  color={colors[index % colors.length]}
                  lineWidth={selectedIndex === index ? 5 : 3}
                  isSelected={index === selectedIndex}
                  onClick={() => setSelectedIndex(index)}
                />
              ))}
              
              {dotProductTarget !== null && vectors.map((vector, index) => {
                if (index === dotProductTarget) return null;
                return (
                  <ProjectionLine 
                    key={`proj-${index}`} 
                    vector1={vector} 
                    vector2={vectors[dotProductTarget]}
                    index={index}
                  />
                );
              })}
              
              <OrbitControls 
                minDistance={5} 
                maxDistance={50} 
                enableZoom 
                enablePan
                dampingFactor={0.05}
                rotateSpeed={0.7}
              />
            </Canvas>
          </div>
          
          <VectorLegend vectors={vectors} />
        </div>
      </div>
    </div>
  );
};

export default Spinning3DObject;