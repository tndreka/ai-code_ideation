
import React from 'react';
import type { UploadedFile } from '../types';

interface OriginalCodeExcerptProps {
  analysisSource: UploadedFile[] | string | null; // Can be an array of files or a single code string
  targetFilePath?: string; // The path of the file to show the excerpt from, if analysisSource is UploadedFile[]
  startLine: number; // 1-based
  endLine: number;   // 1-based
  contextLines?: number; // Number of lines to show before and after the selection for context
}

const OriginalCodeExcerpt: React.FC<OriginalCodeExcerptProps> = ({
  analysisSource,
  targetFilePath,
  startLine,
  endLine,
  contextLines = 2,
}) => {
  if (!analysisSource || startLine <= 0 || endLine < startLine) {
    return null;
  }

  let relevantFileContent: string | undefined = undefined;
  let displayFilePath = targetFilePath;

  if (typeof analysisSource === 'string') {
    relevantFileContent = analysisSource;
    displayFilePath = undefined; // No specific file path for single string input
  } else if (Array.isArray(analysisSource)) {
    const targetFile = targetFilePath 
      ? analysisSource.find(f => f.path === targetFilePath) 
      : analysisSource[0]; // Default to first file if no path specified (should ideally not happen if AI provides path)
    
    if (targetFile) {
      relevantFileContent = targetFile.content;
      displayFilePath = targetFile.path; // Ensure displayFilePath is from the actual file used
    }
  }

  if (relevantFileContent === undefined) {
    return <p className="text-xs text-slate-400 italic my-1">Could not find the specified file content for excerpt.</p>;
  }

  const lines = relevantFileContent.split('\n');
  const displayStartLine = Math.max(0, startLine - 1 - contextLines);
  const displayEndLine = Math.min(lines.length, endLine + contextLines);

  const excerptLines = lines.slice(displayStartLine, displayEndLine);

  if (excerptLines.length === 0) {
    return <p className="text-xs text-slate-400 italic my-1">Could not extract relevant code lines.</p>;
  }
  
  const title = displayFilePath 
    ? `Original Code (${displayFilePath}, Lines ${startLine}-${endLine})`
    : `Original Code (Lines ${startLine}-${endLine})`;

  return (
    <div className="my-3 bg-slate-800/70 rounded-md border border-slate-700/60 shadow-inner overflow-hidden">
      <div className="px-3 py-1.5 bg-slate-700/50 border-b border-slate-600/50">
        <span className="text-xs font-semibold text-amber-300" title={displayFilePath}>
          {title.length > 80 && displayFilePath ? `Original Code (...${displayFilePath.slice(-Math.min(30, displayFilePath.length))}, Lines ${startLine}-${endLine})` : title}
        </span>
      </div>
      <pre className="p-3 text-sm text-gray-300 whitespace-pre-wrap break-all overflow-x-auto font-mono text-xs leading-relaxed relative">
        {excerptLines.map((line, index) => {
          const currentLineNumber = displayStartLine + 1 + index;
          const isHighlighted = currentLineNumber >= startLine && currentLineNumber <= endLine;
          return (
            <div 
              key={currentLineNumber} 
              className={`flex ${isHighlighted ? 'bg-sky-700/30 -mx-3 px-3' : ''}`}
              role="row"
              aria-label={`Line ${currentLineNumber}${isHighlighted ? ', highlighted suggestion target' : ''}`}
            >
              <span className="mr-3 w-8 select-none text-slate-500 text-right shrink-0">{currentLineNumber}</span>
              <code className="flex-grow">{line}</code>
            </div>
          );
        })}
      </pre>
    </div>
  );
};

export default OriginalCodeExcerpt;