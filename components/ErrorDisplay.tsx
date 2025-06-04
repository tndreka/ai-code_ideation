import React from 'react';

interface ErrorDisplayProps {
  message: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  if (!message) return null;
  
  return (
    <div 
        className="my-8 p-5 sm:p-6 bg-red-700/20 backdrop-blur-sm border border-red-600/50 text-red-200 rounded-xl shadow-lg" 
        role="alert"
        aria-live="assertive"
    >
      <div className="flex items-start">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 mr-3 text-red-400 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <div>
            <strong className="font-semibold text-red-100 text-lg">Oops! An Error Occurred:</strong>
            <p className="mt-1.5 text-sm text-red-200/90">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;