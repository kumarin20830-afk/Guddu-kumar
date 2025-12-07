import React from 'react';

export const PromoBanner: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg viewBox="0 0 800 350" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="50%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>

        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.05"/>
        </pattern>
      </defs>
      
      {/* Background */}
      <rect width="800" height="350" fill="url(#bgGradient)" rx="15" />
      <rect width="800" height="350" fill="url(#grid)" rx="15" />
      
      {/* Decorative Floating Elements */}
      <circle cx="720" cy="60" r="80" fill="#4f46e5" opacity="0.1">
         <animate attributeName="r" values="80;90;80" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="280" r="60" fill="#ec4899" opacity="0.1">
         <animate attributeName="r" values="60;70;60" dur="5s" repeatCount="indefinite" />
      </circle>

      {/* Main Typography */}
      <text x="50%" y="140" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="72" fill="url(#textGradient)" filter="url(#glow)" style={{ letterSpacing: '-2px' }}>
        SPIN &amp; WIN
      </text>
      
      <text x="50%" y="190" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="500" fontSize="28" fill="#94a3b8" letterSpacing="4">
        REAL CASH REWARDS
      </text>

      {/* Coins / Rewards Graphics */}
      <g transform="translate(150, 240)">
        <circle r="30" fill="url(#goldGradient)" stroke="#78350f" strokeWidth="2" />
        <text x="0" y="10" textAnchor="middle" fill="#78350f" fontWeight="bold" fontSize="24">₹</text>
        <animateTransform attributeName="transform" type="translate" values="150,240; 150,230; 150,240" dur="3s" repeatCount="indefinite" />
      </g>
      
      <g transform="translate(650, 240)">
        <circle r="35" fill="url(#goldGradient)" stroke="#78350f" strokeWidth="2" />
        <text x="0" y="10" textAnchor="middle" fill="#78350f" fontWeight="bold" fontSize="28">₹</text>
        <animateTransform attributeName="transform" type="translate" values="650,240; 650,230; 650,240" dur="3.5s" repeatCount="indefinite" />
      </g>

      {/* Call to Action Button Graphic */}
      <rect x="320" y="240" width="160" height="50" rx="25" fill="#ec4899" opacity="0.9" />
      <text x="400" y="273" textAnchor="middle" fill="white" fontWeight="bold" fontSize="18">PLAY NOW</text>
    </svg>
  );
};
