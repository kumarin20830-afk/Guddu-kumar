import React, { useEffect, useRef, useState } from 'react';
import { WheelSegment } from '../types';
import { audioService } from '../services/audioService';

interface SpinWheelProps {
  segments: WheelSegment[];
  isSpinning: boolean;
  onSpinComplete: () => void;
  targetIndex: number | null; // The index we decided the wheel will stop at
}

const SpinWheel: React.FC<SpinWheelProps> = ({ segments, isSpinning, onSpinComplete, targetIndex }) => {
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const audioIntervalRef = useRef<number | null>(null);

  const SEGMENT_ANGLE = 360 / segments.length;

  useEffect(() => {
    if (isSpinning && targetIndex !== null) {
      // Calculate landing angle
      // We want to land on the center of the target segment.
      // 0 deg is usually at 3 o'clock in CSS transform, need to adjust based on where the pointer is.
      // Assuming pointer is at Top (270deg or -90deg visual).
      
      // Let's add 5 full rotations (1800 deg) for effect
      const spins = 1800; 
      
      // Calculate the angle to the specific segment.
      // If segment 0 is at 0-45deg.
      // We need to rotate the wheel such that segment X is at the top.
      const targetAngle = spins + (360 - (targetIndex * SEGMENT_ANGLE)) + (Math.random() * (SEGMENT_ANGLE - 10) + 5); 
      
      setRotation(targetAngle);

      // Tick sounds logic
      let currentTick = 0;
      const totalTime = 3000; // 3s matches CSS transition
      
      const interval = setInterval(() => {
        currentTick += 100;
        if (currentTick < totalTime) {
           // Play tick faster at start, slower at end? 
           // Simplification: Play tick every X ms, but ideally mapped to rotation speed.
           // For this demo, we play a tick periodically.
           if (currentTick % 200 === 0) audioService.playTick();
        } else {
          clearInterval(interval);
        }
      }, 100);
      
      audioIntervalRef.current = interval as unknown as number;

      const timeout = setTimeout(() => {
        onSpinComplete();
        // audioService.playWin() moved to App.tsx to only play on actual wins
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isSpinning, targetIndex, segments.length, onSpinComplete, SEGMENT_ANGLE]);

  const wheelStyle = {
    transform: `rotate(${rotation}deg)`,
    transition: isSpinning ? 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
  };

  return (
    <div className="relative w-80 h-80 md:w-96 md:h-96 mx-auto mb-8">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20 w-8 h-12">
        <div className={`w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[30px] border-t-red-500 filter drop-shadow-lg ${isSpinning ? 'animate-wobble' : ''}`}></div>
      </div>

      {/* Outer Border */}
      <div className="absolute inset-0 rounded-full border-8 border-gray-800 shadow-2xl overflow-hidden bg-gray-900">
        
        {/* The Wheel */}
        <div 
          ref={wheelRef}
          className="w-full h-full relative"
          style={wheelStyle}
        >
          {segments.map((segment, index) => {
            const rotate = index * SEGMENT_ANGLE;
            return (
              <div
                key={segment.id}
                className="absolute w-full h-full top-0 left-0 origin-center flex items-center justify-center"
                style={{ transform: `rotate(${rotate}deg)` }}
              >
                {/* Segment Slice */}
                <div 
                  className="absolute top-0 left-1/2 h-1/2 w-full origin-bottom-left -translate-x-1/2"
                  style={{ 
                     transform: `rotate(${SEGMENT_ANGLE / 2}deg) skewY(-${90 - SEGMENT_ANGLE}deg)`,
                     background: segment.color,
                     boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
                  }}
                >
                </div>
                
                {/* Text Content */}
                <div 
                  className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-10 font-bold"
                  style={{ color: segment.textColor, transform: `rotate(${SEGMENT_ANGLE/2}deg)` }} 
                >
                   <span className="block transform -rotate-90 text-sm md:text-base">
                      {segment.label}
                   </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Center Knob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-inner flex items-center justify-center z-10 border-4 border-gray-300">
           <div className="w-8 h-8 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default SpinWheel;