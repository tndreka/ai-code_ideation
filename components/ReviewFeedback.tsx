
import React, { useState, useCallback, useMemo } from 'react';
import CodeBlock from './CodeBlock';
import OriginalCodeExcerpt from './OriginalCodeExcerpt';
import MermaidDiagram from './MermaidDiagram';
import MarkdownContent from './MarkdownContent'; // For rendering descriptions
import type { FeedbackSegment, TextSegment, StandardCodeSegment, InteractiveSuggestionSegment, MermaidDiagramSegment, InteractiveSuggestion, UploadedFile } from '../types';


// Define input types for addSegment (Omit 'id' from each segment type)
type TextSegmentInput = Omit<TextSegment, 'id'>;
type StandardCodeSegmentInput = Omit<StandardCodeSegment, 'id'>;
type InteractiveSuggestionSegmentInput = Omit<InteractiveSuggestionSegment, 'id'>;
type MermaidDiagramSegmentInput = Omit<MermaidDiagramSegment, 'id'>;
type FeedbackSegmentInput =
  | TextSegmentInput
  | StandardCodeSegmentInput
  | InteractiveSuggestionSegmentInput
  | MermaidDiagramSegmentInput;


const parseLineNumbers = (line: string): { start: number; end: number } | undefined => {
  const match = line.match(/^LINE_NUMBERS:\s*(\d+)-(\d+)$/);
  if (match) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      return { start, end };
    }
  }
  const singleMatch = line.match(/^LINE_NUMBERS:\s*(\d+)$/);
  if (singleMatch) {
    const lineNo = parseInt(singleMatch[1], 10);
    if(!isNaN(lineNo)) return {start: lineNo, end: lineNo};
  }
  return undefined;
};

const extractMarkdownCodeBlock = (lines: string[], startIndex: number): { code: string, lang?: string, nextIndex: number } | null => {
    if (startIndex >= lines.length || !lines[startIndex].startsWith('```')) {
        return null;
    }
    const lang = lines[startIndex].substring(3).trim();
    const codeLines: string[] = [];
    let currentIndex = startIndex + 1;
    while(currentIndex < lines.length && !lines[currentIndex].startsWith('```')) {
        codeLines.push(lines[currentIndex]);
        currentIndex++;
    }
    // Consume the closing ```
    if (currentIndex < lines.length && lines[currentIndex].startsWith('```')) {
        currentIndex++;
    }
    return { code: codeLines.join('\n'), lang: lang || undefined, nextIndex: currentIndex };
};


// Function to parse the raw feedback string into structured segments
const parseFeedbackToSegments = (feedback: string): FeedbackSegment[] => {
  const rawLines = feedback.split('\n');
  const segments: FeedbackSegment[] = [];
  let idCounter = 0;

  const addSegment = (segment: FeedbackSegmentInput) => {
    segments.push({ ...segment, id: `segment-${idCounter++}` } as FeedbackSegment);
  };

  let i = 0;
  while (i < rawLines.length) {
    let line = rawLines[i];

    if (line.trim() === '[[SUGGESTION_START]]') {
      const suggestionData: Partial<InteractiveSuggestion> & { descriptionLines: string[] } = { descriptionLines: [] };
      let currentSuggestionLineIndex = i + 1;
      
      while (currentSuggestionLineIndex < rawLines.length && rawLines[currentSuggestionLineIndex].trim() !== '[[SUGGESTION_END]]') {
        const suggestionLine = rawLines[currentSuggestionLineIndex];
        if (suggestionLine.startsWith('FILE_PATH:')) {
          suggestionData.filePath = suggestionLine.substring('FILE_PATH:'.length).trim();
        } else if (suggestionLine.startsWith('LINE_NUMBERS:')) {
          suggestionData.lineNumbers = parseLineNumbers(suggestionLine);
        } else if (suggestionLine.startsWith('TITLE:')) {
          suggestionData.title = suggestionLine.substring('TITLE:'.length).trim();
        } else if (suggestionLine.startsWith('DESCRIPTION:')) {
          const descContent = suggestionLine.substring('DESCRIPTION:'.length).trim();
          if(descContent) suggestionData.descriptionLines.push(descContent);
          // Allow multi-line descriptions
          while(currentSuggestionLineIndex + 1 < rawLines.length &&
                !rawLines[currentSuggestionLineIndex+1].startsWith('ORIGINAL_CODE_SNIPPET:') &&
                !rawLines[currentSuggestionLineIndex+1].startsWith('SUGGESTED_CODE_SNIPPET:') &&
                rawLines[currentSuggestionLineIndex+1].trim() !== '[[SUGGESTION_END]]' &&
                !rawLines[currentSuggestionLineIndex+1].startsWith('FILE_PATH:') &&
                !rawLines[currentSuggestionLineIndex+1].startsWith('LINE_NUMBERS:') && 
                !rawLines[currentSuggestionLineIndex+1].startsWith('TITLE:')
                ) {
             currentSuggestionLineIndex++;
             suggestionData.descriptionLines.push(rawLines[currentSuggestionLineIndex]);
          }
        } else if (suggestionLine.startsWith('ORIGINAL_CODE_SNIPPET:')) {
            const snippetBlock = extractMarkdownCodeBlock(rawLines, currentSuggestionLineIndex + 1);
            if (snippetBlock) {
                suggestionData.originalAiSnippet = { code: snippetBlock.code, lang: snippetBlock.lang };
                currentSuggestionLineIndex = snippetBlock.nextIndex -1;
            }
        } else if (suggestionLine.startsWith('SUGGESTED_CODE_SNIPPET:')) {
            const snippetBlock = extractMarkdownCodeBlock(rawLines, currentSuggestionLineIndex + 1);
            if (snippetBlock) {
                suggestionData.suggestedSnippet = { code: snippetBlock.code, lang: snippetBlock.lang };
                currentSuggestionLineIndex = snippetBlock.nextIndex - 1;
            }
        }
        currentSuggestionLineIndex++;
      }
      if (suggestionData.title && suggestionData.descriptionLines.length > 0) {
        addSegment({
            type: 'interactive_suggestion',
            title: suggestionData.title,
            description: suggestionData.descriptionLines.join('\n'),
            filePath: suggestionData.filePath,
            lineNumbers: suggestionData.lineNumbers,
            originalAiSnippet: suggestionData.originalAiSnippet,
            suggestedSnippet: suggestionData.suggestedSnippet,
        });
      }
      i = currentSuggestionLineIndex + 1; // Move past [[SUGGESTION_END]]
      continue;
    } else if (line.trim() === '[[MERMAID_DIAGRAM_START]]') {
        let diagramTitle = "AI-Generated Diagram";
        let mermaidCodeLines: string[] = [];
        let currentDiagramLineIndex = i + 1;
        
        if (currentDiagramLineIndex < rawLines.length && rawLines[currentDiagramLineIndex].startsWith('TITLE:')) {
            diagramTitle = rawLines[currentDiagramLineIndex].substring('TITLE:'.length).trim();
            currentDiagramLineIndex++;
        }

        const mermaidBlock = extractMarkdownCodeBlock(rawLines, currentDiagramLineIndex);
        if (mermaidBlock && mermaidBlock.lang === 'mermaid') {
            mermaidCodeLines.push(mermaidBlock.code);
            currentDiagramLineIndex = mermaidBlock.nextIndex;
            if(currentDiagramLineIndex < rawLines.length && rawLines[currentDiagramLineIndex].trim() === '[[MERMAID_DIAGRAM_END]]') {
                currentDiagramLineIndex++; 
            } else {
                let tempIndex = mermaidBlock.nextIndex;
                while(tempIndex < rawLines.length && rawLines[tempIndex].trim() !== '[[MERMAID_DIAGRAM_END]]') {
                    tempIndex++; 
                }
                if (tempIndex < rawLines.length && rawLines[tempIndex].trim() === '[[MERMAID_DIAGRAM_END]]') {
                    currentDiagramLineIndex = tempIndex + 1;
                }
            }

            addSegment({
                type: 'mermaid_diagram',
                title: diagramTitle,
                content: mermaidCodeLines.join('\n'),
            });
        } else {
             addSegment({ type: 'paragraph', content: line });
        }
        i = currentDiagramLineIndex;
        continue;

    } else if (line.startsWith('```')) {
      const codeBlock = extractMarkdownCodeBlock(rawLines, i);
      if (codeBlock) {
        addSegment({ type: 'code', content: codeBlock.code, lang: codeBlock.lang });
        i = codeBlock.nextIndex;
        continue;
      }
    } else if (line.startsWith('# ')) {
      addSegment({ type: 'heading1', content: line.substring(2) });
    } else if (line.startsWith('## ')) {
      addSegment({ type: 'heading2', content: line.substring(3) });
    } else if (line.startsWith('### ')) {
      addSegment({ type: 'heading3', content: line.substring(4) });
    } else if (line.startsWith('#### ')) {
      addSegment({ type: 'heading4', content: line.substring(5) });
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      addSegment({ type: 'listitem_ul', content: line.substring(2) });
    } else if (line.match(/^\d+\.\s/)) {
      addSegment({ type: 'listitem_ol', content: line.replace(/^\d+\.\s/, '') });
    } else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      addSegment({ type: 'horizontal_rule', content: '' });
    } else if (line.startsWith('Detected Language:')) {
        addSegment({ type: 'detected_language', content: line.substring('Detected Language:'.length).trim() });
    } else if (line.startsWith('Language Hint Provided:')) {
        addSegment({ type: 'detected_language', content: `Using Hint: ${line.substring('Language Hint Provided:'.length).trim()}`});
    } else if (line.trim() === '') {
      if (segments.length === 0 || segments[segments.length -1].type !== 'empty') { 
        addSegment({ type: 'empty', content: '' });
      }
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
        addSegment({ type: 'strong_emphasis', content: line.substring(2, line.length - 2) });
    }
    else {
      addSegment({ type: 'paragraph', content: line });
    }
    i++;
  }
  return segments;
};


interface ReviewFeedbackProps {
  feedback: string;
  analysisSource: UploadedFile[] | string | null; // Source for code excerpts
}

const ReviewFeedback: React.FC<ReviewFeedbackProps> = ({ feedback, analysisSource }) => {
  const segments = useMemo(() => parseFeedbackToSegments(feedback), [feedback]);

  const renderSegment = (segment: FeedbackSegment) => {
    switch (segment.type) {
      case 'heading1':
        return <h1 className="text-3xl font-bold mt-6 mb-3 text-sky-300 border-b-2 border-sky-800 pb-2">{segment.content}</h1>;
      case 'heading2':
        return <h2 className="text-2xl font-semibold mt-5 mb-2 text-sky-400">{segment.content}</h2>;
      case 'heading3':
        return <h3 className="text-xl font-semibold mt-4 mb-1 text-sky-500">{segment.content}</h3>;
      case 'heading4':
        return <h4 className="text-lg font-semibold mt-3 mb-1 text-teal-400">{segment.content}</h4>;
      case 'paragraph':
        return <p className="my-2.5 leading-relaxed text-gray-300"><MarkdownContent content={segment.content} /></p>;
      case 'listitem_ul':
        return <li className="ml-6 my-1 list-disc list-outside text-gray-300"><MarkdownContent content={segment.content} /></li>;
      case 'listitem_ol':
        return <li className="ml-6 my-1 list-decimal list-outside text-gray-300"><MarkdownContent content={segment.content} /></li>;
      case 'code':
        return <CodeBlock language={segment.lang || 'text'} code={segment.content} />;
      case 'interactive_suggestion':
        return (
          <div className="my-6 p-5 bg-slate-800/70 rounded-xl shadow-lg border border-slate-700/50 transition-shadow hover:shadow-sky-500/10">
            <h4 className="text-lg font-semibold text-sky-400 mb-2">{segment.title}</h4>
            {segment.lineNumbers && analysisSource && (
              <OriginalCodeExcerpt 
                analysisSource={analysisSource} 
                targetFilePath={segment.filePath}
                startLine={segment.lineNumbers.start} 
                endLine={segment.lineNumbers.end} 
              />
            )}
            <div className="prose prose-sm prose-invert max-w-none text-gray-300 leading-relaxed">
                <MarkdownContent content={segment.description} />
            </div>
            {segment.originalAiSnippet && (
              <>
                <p className="text-xs text-amber-400/80 mt-3 mb-0.5 font-medium">Original Code (from AI):</p>
                <CodeBlock language={segment.originalAiSnippet.lang || 'text'} code={segment.originalAiSnippet.code} />
              </>
            )}
            {segment.suggestedSnippet && (
              <>
                <p className="text-xs text-emerald-400/80 mt-3 mb-0.5 font-medium">Suggested Code:</p>
                <CodeBlock language={segment.suggestedSnippet.lang || 'text'} code={segment.suggestedSnippet.code} />
              </>
            )}
          </div>
        );
      case 'mermaid_diagram':
        return <MermaidDiagram mermaidCode={segment.content} title={segment.title} diagramId={segment.id} />;
      case 'detected_language':
        return <p className="my-3 px-4 py-2.5 bg-sky-800/40 text-sky-300 rounded-md text-sm font-medium border border-sky-700/60 shadow-sm inline-block"><span className="font-semibold">Language(s):</span> {segment.content}</p>;
      case 'strong_emphasis':
            return <p className="my-2.5 leading-relaxed text-gray-200"><strong className="font-semibold text-sky-300"><MarkdownContent content={segment.content} /></strong></p>;
      case 'horizontal_rule':
        return <hr className="my-6 border-slate-700" />;
      case 'empty':
        return <div className="my-2"></div>; 
      default:
        // @ts-expect-error segment should be 'never' here if all cases are handled
        console.warn('Unhandled segment type:', segment.type, segment);
        // @ts-expect-error segment should be 'never' here if all cases are handled
        return <p className="text-red-400">Unhandled content type: {segment.type}</p>;
    }
  };

  return (
    <div className="mt-8 sm:mt-12 py-6 sm:py-8 px-5 sm:px-8 bg-slate-800/60 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/50" aria-live="polite" aria-atomic="true">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-400 mb-6 pb-3 border-b border-slate-700">
        AI Insights & Ideation Report
      </h2>
      {segments.map(segment => (
        <div key={segment.id} role="region" aria-label={segment.type}>
          {renderSegment(segment)}
        </div>
      ))}
    </div>
  );
};

export default ReviewFeedback;