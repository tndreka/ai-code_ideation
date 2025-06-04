
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { SUPPORTED_LANGUAGES, SUPPORTED_ANALYSIS_SCOPES, SUPPORTED_FRAMEWORKS } from '../constants';
import type { LanguageOption, AnalysisScope, AnalysisScopeOption, UploadedFile, FrameworkOption } from '../types';

interface CodeInputFormProps {
  onSubmit: (
    source: UploadedFile[] | string, 
    languageHint?: string, 
    analysisScope?: AnalysisScope,
    framework?: string,
    projectGoals?: string,
    ignorePatterns?: string // Raw text of patterns for AI context
  ) => void;
  isLoading: boolean;
}

// Converts a glob pattern to a RegExp object for matching file paths.
const globToRegex = (glob: string): RegExp => {
  let patternInput = glob.trim();
  if (!patternInput) return new RegExp('(?!)'); // Regex that never matches for empty patterns

  // Keep track if original ended with a slash (directory intent)
  const isDirectoryPatternIntent = patternInput.endsWith('/');
  // Normalize to forward slashes and remove leading/trailing slashes for internal processing
  // Example: "/path/to/dir/" -> "path/to/dir"; "file.js" -> "file.js"
  let normalizedPattern = patternInput.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  // If after normalization pattern is empty (e.g. original glob was just "/" or "///")
  if (!normalizedPattern) {
    // If it was meant to be a directory (like "/"), match everything if anchored from root, or specific files if not.
    // For simplicity, if original was "/" and meant directory, it matches all files under root.
    // If it was empty or just slashes and not a directory, it matches nothing.
    return new RegExp(glob.trim().startsWith('/') && isDirectoryPatternIntent ? '^/.*$' : '(?!)');
  }
  
  let regexString = normalizedPattern
    .replace(/\./g, '\\.')             // Escape dots
    .replace(/\*\*/g, '@@DOUBTLE_STAR@@') // Placeholder for ** (matches across path segments)
    .replace(/\*/g, '[^/]*')           // * matches anything except a slash
    .replace(/@@DOUBTLE_STAR@@/g, '.*'); // ** placeholder replaced with .* (matches anything including slashes)

  if (isDirectoryPatternIntent) {
    // Pattern like "dir/" or "path/to/dir/"
    // Should match "dir/file.js", "dir/subdir/file.js"
    // regexString becomes the path prefix, e.g., "path/to/dir"
    regexString = `${regexString}/.*`; // Match anything inside the directory
  } else {
    // Pattern like "file.js", "*.log", or "dirname" (without trailing slash)
    // Should match "file.js" or "path/file.js" at the end of a segment.
    // regexString is the file/dir name pattern, e.g., "[^/]*\\.log" or "file\\.js"
    regexString = `${regexString}$`; // Anchor to the end of the string (or segment if using lookbehinds, but $ is simpler here)
  }
  
  // Anchor the pattern:
  // If original glob started with '/', it's anchored to the root of the path.
  if (glob.trim().startsWith('/')) {
    regexString = `^/${regexString}`; // e.g. ^/dist/.* or ^/file\.js$
  } else {
    // If not starting with '/', it can match anywhere in the path, preceded by a slash or at the start of path string.
    regexString = `(?:^|/)${regexString}`; // e.g. (?:^|/)src/.* or (?:^|/)[^/]*\.log$
  }

  try {
    return new RegExp(regexString);
  } catch (e) {
    console.warn(`Invalid glob pattern "${glob}", using literal match. Error: ${e}`);
    const literal = patternInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Fallback
    return new RegExp(`^${literal}$`); // Simple literal match if regex compilation fails
  }
};


const matchesIgnorePattern = (filePath: string, patterns: RegExp[]): boolean => {
  if (!patterns || patterns.length === 0) return false;
  // Normalize path to use forward slashes, and remove leading slash for relative matching against non-anchored patterns
  const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/^\//, '');
  const absoluteNormalizedFilePath = `/${normalizedFilePath}`; // For patterns anchored to root

  for (const regex of patterns) {
    // Test against both relative-style path and absolute-style path
    // because some regexes might be anchored with ^/
    if (regex.source.startsWith('^/')) {
        if (regex.test(absoluteNormalizedFilePath)) return true;
    } else {
        if (regex.test(normalizedFilePath)) return true;
    }
  }
  return false;
};


const CodeInputForm: React.FC<CodeInputFormProps> = ({ onSubmit, isLoading }) => {
  const [code, setCode] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(SUPPORTED_LANGUAGES[0]?.value || 'auto');
  const [selectedAnalysisScope, setSelectedAnalysisScope] = useState<AnalysisScope>(SUPPORTED_ANALYSIS_SCOPES[0]?.value || 'general_ideation');
  const [selectedFramework, setSelectedFramework] = useState<string>(SUPPORTED_FRAMEWORKS[0]?.value || 'none');
  const [projectGoals, setProjectGoals] = useState<string>('');
  const [ignorePatternsText, setIgnorePatternsText] = useState<string>('node_modules/\ndist/\nbuild/\n.git/\n*.log\n*.tmp\n*.test.js\n*.spec.js');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentIgnorePatternRegexes = useMemo(() => {
    return ignorePatternsText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(globToRegex);
  }, [ignorePatternsText]);

  const filteredUploadedFilesForAnalysis = useMemo(() => {
    if (uploadedFiles.length === 0) return [];
    return uploadedFiles.filter(file => !matchesIgnorePattern(file.path, currentIgnorePatternRegexes));
  }, [uploadedFiles, currentIgnorePatternRegexes]);


  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const browserFiles = event.target.files;
    if (browserFiles && browserFiles.length > 0) {
      // Create a new array for immutable update
      const currentFilesMap = new Map(uploadedFiles.map(f => [f.path, f]));
      const newFilesList: UploadedFile[] = [...uploadedFiles]; // Start with existing files

      for (const file of Array.from(browserFiles)) {
        const path = (file as any).webkitRelativePath || file.name;
        if (!currentFilesMap.has(path)) { 
            try {
              const content = await readFileAsText(file);
              const newFileEntry = { name: file.name, path, content };
              newFilesList.push(newFileEntry);
              currentFilesMap.set(path, newFileEntry); // Add to map to prevent duplicates in same batch
            } catch (e) {
              console.error("Error reading file:", file.name, e);
              alert(`Error reading file ${file.name}. It might be too large or unreadable.`);
            }
        }
      }
      
      setUploadedFiles(newFilesList);
      if (event.target) event.target.value = ''; 
    }
  }, [uploadedFiles]);

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleClear = () => {
    setCode('');
    setUploadedFiles([]);
    setSelectedLanguage(SUPPORTED_LANGUAGES[0]?.value || 'auto');
    setSelectedAnalysisScope(SUPPORTED_ANALYSIS_SCOPES[0]?.value || 'general_ideation');
    setSelectedFramework(SUPPORTED_FRAMEWORKS[0]?.value || 'none');
    setProjectGoals('');
    setIgnorePatternsText('node_modules/\ndist/\nbuild/\n.git/\n*.log\n*.tmp\n*.test.js\n*.spec.js');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const sourceForAnalysis: UploadedFile[] | string = filteredUploadedFilesForAnalysis.length > 0 ? filteredUploadedFilesForAnalysis : code;

    if ((typeof sourceForAnalysis === 'string' && !sourceForAnalysis.trim()) || (Array.isArray(sourceForAnalysis) && sourceForAnalysis.length === 0)) {
        if (uploadedFiles.length > 0 && filteredUploadedFilesForAnalysis.length === 0) {
            alert("All uploaded files were filtered out by the ignore patterns. Please adjust patterns or upload different files.");
        } else {
            alert("Please enter some code or load file(s) to get ideas.");
        }
        return;
    }
    
    const effectiveIgnorePatternsText = uploadedFiles.length > 0 ? ignorePatternsText : '';

    onSubmit(
        sourceForAnalysis, 
        selectedLanguage, 
        selectedAnalysisScope,
        selectedFramework === 'none' ? undefined : selectedFramework,
        projectGoals.trim() || undefined,
        effectiveIgnorePatternsText.trim() || undefined
    );
  };
  
  const isSubmitDisabled = isLoading || 
                         ((filteredUploadedFilesForAnalysis.length === 0) && !code.trim());


  return (
    <form 
        onSubmit={handleSubmit} 
        className="space-y-6 p-6 sm:p-8 bg-slate-800/60 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/50"
        aria-labelledby="form-title"
    >
      <input
        type="file" ref={fileInputRef} onChange={handleFileChange} multiple
        // @ts-ignore webkitdirectory is a non-standard attribute
        webkitdirectory="" mozdirectory="" directory=""
        style={{ display: 'none' }} aria-hidden="true"
        accept=".js,.jsx,.ts,.tsx,.py,.java,.cs,.cpp,.c,.go,.rb,.php,.swift,.kt,.rs,.html,.css,.sql,.sh,.md,.json,.yaml, text/*"
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button type="button" onClick={triggerFileInput} disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border border-sky-600 rounded-lg shadow-md text-sm font-semibold text-sky-300 hover:bg-sky-700/50 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out group"
              aria-label="Load files or a folder for analysis">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2.5 group-hover:scale-110 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 10.5v6A2.25 2.25 0 005.25 18.75h13.5A2.25 2.25 0 0021 16.5v-6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 10.5z" /></svg>
              Load File(s) / Folder
            </button>
            <button type="button" onClick={handleClear} disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border border-amber-600 rounded-lg shadow-md text-sm font-semibold text-amber-300 hover:bg-amber-700/50 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out group"
              aria-label="Clear all loaded files and code input">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2.5 group-hover:rotate-[-6deg] transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0l-.346 9m4.788 0L9.26 9m0 0l-.346-3.21a48.108 48.108 0 00-3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              Clear All
            </button>
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
            <h4 className="text-xs text-sky-300/80 mb-2 font-medium">Loaded {uploadedFiles.length} file(s). Filtered to {filteredUploadedFilesForAnalysis.length} for analysis.</h4>
            <div className="max-h-24 overflow-y-auto pr-2 flex flex-wrap gap-2">
            {uploadedFiles.map(file => {
                const isIgnored = matchesIgnorePattern(file.path, currentIgnorePatternRegexes);
                return (
                    <span key={file.path} title={`${file.path}${isIgnored ? ' (Ignored)' : ''}`} 
                          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full shadow truncate max-w-xs transition-colors
                                      ${isIgnored ? 'bg-slate-600/40 text-slate-400/70 line-through' : 'bg-sky-700/50 text-sky-200'}`}>
                    {file.path.length > 30 ? `...${file.path.slice(-27)}` : file.path}
                    </span>
                );
            })}
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <label htmlFor="analysis-scope-select" className="block text-sm font-medium text-sky-300 mb-1.5">Analysis Scope</label>
          <select id="analysis-scope-select" value={selectedAnalysisScope} onChange={(e) => setSelectedAnalysisScope(e.target.value as AnalysisScope)} disabled={isLoading}
            className="block w-full shadow-sm sm:text-sm border-slate-600 bg-slate-700/50 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-150 ease-in-out appearance-none"
            aria-label="Select analysis scope">
            {SUPPORTED_ANALYSIS_SCOPES.map((scope: AnalysisScopeOption) => ( <option key={scope.value} value={scope.value} className="bg-slate-800 text-gray-200">{scope.label}</option> ))}
          </select>
        </div>
        <div>
          <label htmlFor="language-select" className="block text-sm font-medium text-sky-300 mb-1.5">Code Language (Optional)</label>
          <select id="language-select" value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} disabled={isLoading}
            className="block w-full shadow-sm sm:text-sm border-slate-600 bg-slate-700/50 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-150 ease-in-out appearance-none"
            aria-label="Select programming language (optional override)">
            {SUPPORTED_LANGUAGES.map((lang: LanguageOption) => ( <option key={lang.value} value={lang.value} className="bg-slate-800 text-gray-200">{lang.label}</option> ))}
          </select>
        </div>
        <div className="md:col-span-2">
            <label htmlFor="framework-select" className="block text-sm font-medium text-sky-300 mb-1.5">Project Framework (Optional)</label>
            <select id="framework-select" value={selectedFramework} onChange={(e) => setSelectedFramework(e.target.value)} disabled={isLoading}
                className="block w-full shadow-sm sm:text-sm border-slate-600 bg-slate-700/50 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-150 ease-in-out appearance-none"
                aria-label="Select project framework (optional)">
                {SUPPORTED_FRAMEWORKS.map((fw: FrameworkOption) => ( <option key={fw.value} value={fw.value} className="bg-slate-800 text-gray-200">{fw.label}</option> ))}
            </select>
        </div>
         <div className="md:col-span-2">
            <label htmlFor="project-goals" className="block text-sm font-medium text-sky-300 mb-1.5">Project Goals (Optional)</label>
            <textarea id="project-goals" value={projectGoals} onChange={(e) => setProjectGoals(e.target.value)} disabled={isLoading} rows={2}
                className="block w-full shadow-sm sm:text-sm border-slate-600 bg-slate-700/50 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-400/70 transition-colors"
                placeholder="e.g., Improve performance, refactor for testability, add X feature..."
                aria-label="Project goals for AI analysis context" />
        </div>
         <div className="md:col-span-2">
            <label htmlFor="ignore-patterns" className="block text-sm font-medium text-sky-300 mb-1.5">Ignore Files/Folders (Patterns, 1 per line)</label>
            <textarea id="ignore-patterns" value={ignorePatternsText} onChange={(e) => setIgnorePatternsText(e.target.value)} disabled={isLoading} rows={4}
                className="block w-full shadow-sm sm:text-sm border-slate-600 bg-slate-700/50 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono placeholder-gray-400/70 transition-colors"
                placeholder="e.g., node_modules/\nbuild/\ndist/\n*.test.js\n*.log"
                aria-label="Patterns for files or folders to ignore during analysis" />
             <p className="text-xs text-slate-400 mt-1.5">Basic wildcards like `*` are supported (e.g., `*.log`, `src/*`). Folders usually end with `/` (e.g. `node_modules/`).</p>
        </div>
      </div>


      <div>
        <label htmlFor="code" className="block text-sm font-medium text-sky-300 mb-1.5 mt-1">
          Code Input {uploadedFiles.length > 0 ? `(Uploaded files will be analyzed. Use this for quick tests if no files are loaded)` : ''}
        </label>
        <textarea
          id="code" name="code" rows={uploadedFiles.length > 0 ? 3 : 12}
          className="mt-1 block w-full shadow-sm sm:text-sm border-slate-600 bg-slate-700/50 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono placeholder-gray-400/70 transition-colors duration-150 ease-in-out"
          placeholder={uploadedFiles.length > 0 ? `Analysis will focus on the ${filteredUploadedFilesForAnalysis.length} loaded & non-ignored file(s). This area is for quick, isolated snippets if no files are loaded.` : `Paste your code here for analysis if not loading files. Language will be auto-detected...`}
          value={code} onChange={(e) => setCode(e.target.value)}
          disabled={isLoading || uploadedFiles.length > 0} spellCheck="false"
          aria-label="Code input area for AI analysis"
        />
      </div>

      <div>
        <button type="submit" disabled={isSubmitDisabled}
          className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out group"
          aria-label="Submit code for AI analysis and ideas">
          {isLoading ? (
            <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating Ideas...</>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2.5 group-hover:scale-110 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75M18.25 12L17 10.25M18.25 12L19.5 13.75M18.25 12L19.5 10.25" /></svg>Get AI Ideas</>
          )}
        </button>
      </div>
    </form>
  );
};

export default CodeInputForm;
