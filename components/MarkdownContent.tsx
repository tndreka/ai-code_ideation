
import React from 'react';

interface MarkdownContentProps {
  content: string;
}

// Basic function to replace common markdown patterns with HTML.
// This is a very simplified version. For robust markdown, a library like 'marked' or 'react-markdown' would be better.
const applyMarkdown = (text: string): string => {
  let html = text;

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
  
  // Italic: *text* or _text_
  html = html.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-700/50 text-sky-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
  
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline">$1</a>');
  
  return html;
};

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  if (!content) {
    return null;
  }
  const htmlContent = applyMarkdown(content);
  return <span dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default MarkdownContent;
    