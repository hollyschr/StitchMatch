import React from 'react';

interface YarnBallIconProps {
  className?: string;
}

const YarnBallIcon: React.FC<YarnBallIconProps> = ({ className = "h-8 w-8" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Main yarn ball circle */}
      <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.1" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" />
      
      {/* Yarn texture lines - horizontal */}
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M6 8h12" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M6 16h12" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      
      {/* Yarn texture lines - vertical */}
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M8 6v12" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M16 6v12" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      
      {/* Yarn texture lines - diagonal */}
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d="M18 6l-12 12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      
      {/* Center dot for dimension */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.8" />
    </svg>
  );
};

export default YarnBallIcon; 