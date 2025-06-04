import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col justify-center items-center py-12 my-8 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
      <svg 
        className="animate-spin h-12 w-12 text-sky-500" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        ></circle>
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p className="mt-6 text-xl font-semibold text-gray-200">Conjuring AI Insights...</p>
      <p className="mt-1 text-sm text-gray-400">Please wait while we analyze your code.</p>
    </div>
  );
};

export default LoadingSpinner;