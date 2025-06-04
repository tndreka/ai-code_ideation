import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-md shadow-lg p-5 sm:p-6 border-b border-slate-700/50 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mr-4 text-sky-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m1.5-4.5h16.5a1.5 1.5 0 011.5 1.5v6.75a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V9.75A1.5 1.5 0 013.75 8.25h16.5M16.5 5.25v1.5m0 0H8.25m8.25 0S15 9.75 12 9.75 7.5 6.75 7.5 6.75M7.5 3v1.5m0 0h9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75V15m0 0V12.75m0 2.25c.39 0 .777-.043 1.148-.125M12 15c-.39 0-.777-.043-1.148-.125M12 15h.008v.008H12V15zm1.148-.125c.115-.023.226-.05.332-.08M13.148 14.875c.098-.028.194-.058.287-.09M10.852 14.875c-.115-.023-.226-.05-.332-.08M10.852 14.875c-.098-.028-.194-.058-.287-.09M7.5 9.75c0 1.083.313 2.091.857 2.95M16.5 9.75c0 1.083-.313 2.091-.857 2.95" />
           <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 4.5a8.252 8.252 0 01-3.362.714m6.724 0a3 3 0 00-3.362-3.362A3 3 0 008.638 5.214m6.724 0H8.638" /> {/* Lightbulb idea */}
        </svg>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-sky-400 to-teal-400 tracking-tight">
          {title}
        </h1>
      </div>
    </header>
  );
};

export default Header;