
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import CodeInputForm from './components/CodeInputForm';
import ReviewFeedback from './components/ReviewFeedback';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import { initiateReviewAndChat } from './services/geminiService';
import type { AnalysisScope, UploadedFile } from './types';

const App: React.FC = () => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<UploadedFile[] | string | null>(null);
  const [isStreamingComplete, setIsStreamingComplete] = useState<boolean>(false);

  const handleReviewSubmit = useCallback(async (
    source: UploadedFile[] | string, 
    languageHint?: string, 
    analysisScope?: AnalysisScope,
    framework?: string,
    projectGoals?: string,
    ignorePatterns?: string 
  ) => {
    setIsLoading(true);
    setError(null);
    setFeedback(''); 
    setAnalysisSource(source); // source here is already filtered by CodeInputForm
    setIsStreamingComplete(false);

    const streamHandlers = {
      onChunkReceived: (chunkText: string) => {
        setFeedback(prevFeedback => (prevFeedback || '') + chunkText);
      },
      onStreamComplete: () => {
        setIsLoading(false);
        setIsStreamingComplete(true);
      },
      onStreamError: (streamError: Error) => {
        console.error("Streaming Error in App:", streamError);
        setError(streamError.message || "An unexpected error occurred during streaming.");
        setIsLoading(false);
        setIsStreamingComplete(true); 
      }
    };

    try {
      await initiateReviewAndChat(
        source, 
        streamHandlers, 
        languageHint, 
        analysisScope,
        framework,
        projectGoals,
        ignorePatterns // Pass the raw ignore patterns text for AI context
      );
    } catch (initialError: any) { 
      console.error("Initial API Error in App:", initialError);
      setError(initialError.message || "An unexpected error occurred while initiating the analysis.");
      setIsLoading(false);
      setIsStreamingComplete(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-gray-100 bg-transparent aurora-background">
      <div className="content-wrapper flex flex-col min-h-screen">
        <Header title="AI Code Ideation Hub" />
        <main className="flex-grow container mx-auto px-4 py-8 sm:py-12 w-full max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 mb-3">
              Unlock Brilliant Ideas from Your Code
            </h2>
            <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto">
              Configure your project context, select an analysis focus, paste code, load files, or even entire folders. Our AI will provide targeted insights and ideas. Feedback streams in as it's generated!
            </p>
          </div>
          
          <CodeInputForm onSubmit={handleReviewSubmit} isLoading={isLoading} />

          {isLoading && <LoadingSpinner />}
          {error && <ErrorDisplay message={error} />}
          
          {(feedback !== null && feedback.length > 0 && !error) && (
            <ReviewFeedback feedback={feedback} analysisSource={analysisSource} />
          )}
          
          {!isLoading && !error && (feedback === null || (isStreamingComplete && feedback === '')) && (
             <div className="mt-12 text-center text-gray-400/80 p-8 border-2 border-dashed border-gray-700/60 rounded-xl bg-slate-800/30">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 mx-auto mb-6 text-sky-500/70 opacity-60">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75M18.25 12L17 10.25M18.25 12L19.5 13.75M18.25 12L19.5 10.25M12.75 5.25L11.5 4M12.75 5.25L11.5 6.5M12.75 5.25L14 4M12.75 5.25L14 6.5M5.25 12.75L4 11.5M5.25 12.75L6.5 11.5M5.25 12.75L4 14M5.25 12.75L6.5 14M12 18.75L13.75 17M12 18.75L10.25 17M12 18.75L13.75 20.5M12 18.75L10.25 20.5M18.75 5.25L17.5 4M18.75 5.25L17.5 6.5M18.75 5.25L20 4M18.75 5.25L20 6.5" />
              </svg>
              <h3 className="text-2xl font-semibold text-gray-200 mb-2">Ready for Insights?</h3>
              <p className="text-lg text-gray-400">Your AI-generated ideation report will appear here once you submit your code or files.</p>
              <p className="text-sm mt-3 text-gray-500">Let's transform your code into a masterpiece of innovation!</p>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default App;
