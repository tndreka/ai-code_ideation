import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800/30 py-8 mt-auto border-t border-slate-700/50">
      <div className="container mx-auto text-center px-4">
        <p className="text-gray-400 text-sm">
          Powered by <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 hover:underline">Gemini API</a> &amp; React. Styled with Tailwind CSS.
        </p>
        <p className="text-gray-500 text-xs mt-2">
          &copy; ${new Date().getFullYear()} AI Code Ideation Hub. For demonstration and educational purposes.
        </p>
      </div>
    </footer>
  );
};

export default Footer;