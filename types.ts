
// The LanguageOption interface is now used for the optional language override feature.
export interface LanguageOption {
  value: string;
  label: string;
}

// For selecting the type of analysis to perform
export interface AnalysisScopeOption {
  value: AnalysisScope;
  label: string;
}

export type AnalysisScope = 
  | 'general_ideation' 
  | 'performance' 
  | 'security' 
  | 'design_patterns' 
  | 'feature_brainstorming';

// Represents a single uploaded file with its content and path
export interface UploadedFile {
  name: string; // Original filename, e.g., "Button.tsx"
  path: string; // Relative path within the project, e.g., "src/components/Button.tsx"
  content: string;
}

// For selecting the project's primary framework
export interface FrameworkOption {
  value: string;
  label: string;
}

// Segment types for displaying feedback
interface BaseSegment {
  id: string; // Unique ID for React key
}

export interface TextSegment extends BaseSegment {
  type: 'heading1' | 'heading2' | 'heading3' | 'heading4' |
        'listitem_ul' | 'listitem_ol' |
        'paragraph' | 'empty' | 'horizontal_rule' |
        'detected_language' | 'strong_emphasis';
  content: string;
  listLevel?: number; // For nested lists
}

export interface StandardCodeSegment extends BaseSegment {
  type: 'code'; // Standard markdown code block, not part of an interactive suggestion
  content: string;
  lang?: string;
}

export interface InteractiveSuggestion {
  title: string;
  description: string; // Markdown content
  filePath?: string; // Path of the file this suggestion pertains to (for multi-file context)
  lineNumbers?: { start: number; end: number };
  originalAiSnippet?: { code: string, lang?: string };
  suggestedSnippet?: { code: string, lang?: string };
}

export interface InteractiveSuggestionSegment extends BaseSegment, InteractiveSuggestion {
  type: 'interactive_suggestion';
}

export interface MermaidDiagramSegment extends BaseSegment {
  type: 'mermaid_diagram';
  title: string; // e.g., "AI-Generated Architecture Diagram"
  content: string; // The raw Mermaid.js syntax
}

export type FeedbackSegment = TextSegment | StandardCodeSegment | InteractiveSuggestionSegment | MermaidDiagramSegment;
